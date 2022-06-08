import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { BrowserWindow, app } from "electron";
import electronReload from "electron-reload";
import fixPath from "fix-path";
import fetch from "node-fetch";
import { config } from "./config";

const logstream = fs.createWriteStream(path.join(app.getPath("userData"), "log.txt"), {
    flags: "a",
});

fixPath();

if (require("electron-squirrel-startup")) {
    app.quit();
}

if (process.env.DEV) {
    electronReload(__dirname, {});
}

console.time("App Start");

app.on("ready", () => app_start())
    .on("activate", () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            create_window();
        }
    })
    .on("window-all-closed", () => {
        if (process.platform !== "darwin") {
            app.quit();
        }
    });

async function app_start() {
    launch_backend();

    if (process.platform === "win32") {
        app.setUserTasks([]);
    }

    setTimeout(() => create_window(), 1000);

    console.timeEnd("App Start");
}

function create_window() {
    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        frame: process.platform !== "win32",
    });
    win.setThumbarButtons([]);
    win.loadURL("http://localhost:" + (process.env.DEV ? 14812 : config.get("port")));
    win.maximize();

    if (process.env.DEV) {
        win.webContents.openDevTools();
    }

    win.setThumbarButtons([]);
}

function launch_backend() {
    try {
        const args = [
            `--port ${process.env.DEV ? 14811 : config.get("port")}`,
            `--dir "${path.resolve(__dirname, "..", "frontend")}"`,
            `--storage "${
                config.get("storage") || path.resolve(app.getPath("userData"), "storage")
            }"`,
        ];

        console.log({ args });
        logstream.write(JSON.stringify({ args }, null, 4) + "\n");

        const backend = spawn(
            `node ${path.resolve(__dirname, "..", "backend", "run.js")} ${args.join(" ")}`,
            { shell: true },
        );

        backend.stdout.on("data", (data) => {
            process.stdout.write(`[Backend] ${data}`);
            logstream.write(`[Backend] ${data}`);
        });

        backend.stderr.on("data", (data) => {
            process.stderr.write(`[Backend] ${data}`);
            logstream.write(`[Backend] ${data}`);
        });

        let dont_restart = false;
        const controller = new AbortController();
        const heartbeat = setInterval(() => {
            let alive = false;
            fetch("http://localhost:" + (process.env.DEV ? 14811 : config.get("port")) + "/alive", {
                signal: controller.signal,
            })
                .then((res) => {
                    if (res.ok) {
                        alive = true;
                    }
                })
                .catch((err) => {
                    if (err.name === "AbortError" && dont_restart === false) {
                        console.error("Backend died unexpectedly. :(");
                        backend.kill();
                        clearInterval(heartbeat);

                        console.log("Restarting backend...");
                        launch_backend();
                    }
                });

            setTimeout(() => {
                if (alive === false) {
                    controller.abort();
                }
            }, 30_000);
        }, 30_000);

        backend.on("exit", (code) => {
            clearInterval(heartbeat);
            if (code !== 222) {
                dont_restart = true;
                process.exit(code);
            }
            if (dont_restart === false) {
                console.log("Restarting backend...");
                launch_backend();
            }
        });
    } catch (err) {
        console.log(err);
        process.exit(1);
    }
}
