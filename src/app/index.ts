import { fork } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { BrowserWindow, app } from "electron";
import electronReload from "electron-reload";
import express from "express";
import fixPath from "fix-path";
import fetch from "node-fetch";
import { config } from "./config";
import { Logger } from "./logger";

console.time("App Start");

fixPath();

const logger = setup_logger();

if (process.env.DEV) {
    electronReload(__dirname, {});
}

app.on("ready", () => app_start())
    .on("activate", () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            create_window();
        }
    })
    .on("window-all-closed", () => {
        if (process.platform !== "darwin") {
            app.quit();
            logger.log("App Quitted");
        }
    });

async function app_start() {
    if (require("electron-squirrel-startup")) {
        app.quit();
    }

    logger.log("App Started");

    if (!process.env.DEV) {
        express()
            .use(express.static(path.join(__dirname, "..", "frontend")))
            .listen(config["port"]);
    }

    launch_backend();

    if (process.platform === "win32") {
        app.setUserTasks([]);
    }

    setTimeout(() => create_window(), 100);

    console.timeEnd("App Start");
}

function create_window() {
    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        frame: process.platform !== "win32",
    });

    if (!process.env.DEV) {
        win.loadURL("http://localhost:" + config["port"]);
    } else {
        win.loadURL("http://localhost:14811/?dev=1");
    }
    win.maximize();

    if (process.env.DEV) {
        win.webContents.openDevTools();
    }

    win.setThumbarButtons([]);
}

// #region Backend Manager
let restart_counter = 0;
function launch_backend() {
    if (restart_counter > 10) {
        logger.err("Restart counter exceeded, exiting");
        process.exit(1);
    }
    restart_counter++;

    try {
        const args = [
            `--port`,
            `${process.env.DEV ? 29621 : 29620}`,
            `--storage`,
            `${config["storage"] || path.resolve(app.getPath("userData"), "storage")}`,
        ];

        logger.log(`Launching backend with arg: ${args}`);

        const backend = fork(path.resolve(__dirname, "..", "backend", "run.js"), args, {
            silent: true,
            env: { ELECTRON_RUN_AS_NODE: "1" },
        });

        backend.stdout.on("data", (data) => {
            logger.log(`[Backend] ${data}`.trim());
        });

        backend.stderr.on("data", (data) => {
            logger.err(`[Backend] ${data}`.trim());
        });

        let dont_restart = false;

        const controller = new AbortController();
        const heartbeat = setInterval(() => {
            let alive = false;
            fetch("http://localhost:" + (process.env.DEV ? 29621 : 29620) + "/alive", {
                signal: controller.signal,
            })
                .then((res) => {
                    if (res.ok) {
                        alive = true;
                    }
                })
                .catch(async (err) => {
                    if (err.name === "AbortError" && dont_restart === false) {
                        dont_restart = true;
                        logger.err("Backend timed out.");
                        backend.kill();
                        clearInterval(heartbeat);

                        await new Promise((r) => setTimeout(r, 100));
                        logger.log("Restarting backend...");
                        launch_backend();
                    }
                });

            setTimeout(() => {
                if (alive === false) {
                    controller.abort();
                }
            }, 30_000);
        }, 30_000);

        backend.on("exit", async (code) => {
            clearInterval(heartbeat);
            logger.log(`Backend exited with code ${code}`);
            if (dont_restart === false) {
                dont_restart = true;
                backend.kill();

                await new Promise((r) => setTimeout(r, 100));
                logger.log("Restarting backend...");
                launch_backend();
            }
        });

        process.on("exit", () => {
            dont_restart = true;
            backend.kill();
        });
    } catch (err) {
        logger.err(err);
        process.exit(1);
    }
}

setInterval(() => {
    if (restart_counter > 0) {
        restart_counter--;
    }
}, 30_000);
// #endregion

function setup_logger() {
    const dir = path.join(app.getPath("userData"), "app-logs");
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    const logger = new Logger(
        path.join(dir, `log-${Date.now()}.txt`),
        path.join(dir, `err-${Date.now()}.txt`),
    );
    return logger;
}
