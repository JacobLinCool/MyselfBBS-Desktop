#!/usr/bin/env node
import path from "node:path";
import { Command } from "commander";
import { start_server } from "./server";
import { Config } from "./types";

const program = new Command();

program
    .name("myselfbbs-desktop-backend")
    .description("Backend server for myselfbbs-desktop")
    .option("-p, --port <port>", "Port to serve on", (val) => parseInt(val), 29620)
    .option(
        "-s, --storage <path>",
        "Path to storage directory",
        (val) => val,
        path.resolve("storage"),
    )
    .action(() => {
        const options = program.opts() as Config;
        console.log("options", options);
        start_server(options);
    });

program.parse(process.argv);
