import { fork } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { program } from "commander";
import express from "express";
import fetch from "node-fetch";
import { Logger } from "../app/logger";

const logger = setup_logger();

program
    .option("-p, --port <port>", "Port of Web UI", Number, 14810)
    .option("-P, --api-port <port>", "Port of API", Number, 29620)
    .option("-s, --storage <path>", "Path to storage directory", String, path.resolve("storage"))
    .action(app_start)
    .parse(process.argv);

async function app_start() {
    console.time("App Start");
    logger.log("App Started");

    console.log(program.opts());

    express()
        .use(express.static(path.join(__dirname, "..", "frontend")))
        .listen(program.opts().port);

    launch_backend();

    console.timeEnd("App Start");
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
            `${program.opts().apiPort}`,
            `--storage`,
            `${program.opts().storage}`,
        ];

        logger.log(`Launching backend with arg: ${args}`);

        const backend = fork(path.resolve(__dirname, "..", "backend", "run.js"), args, {
            silent: true,
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
            fetch(`http://localhost:${program.opts().apiPort}/alive`, {
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
    const dir = path.resolve("app-logs");
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    const logger = new Logger(
        path.join(dir, `log-${Date.now()}.txt`),
        path.join(dir, `err-${Date.now()}.txt`),
    );
    return logger;
}
