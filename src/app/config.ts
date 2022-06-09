import fs from "node:fs";
import path from "node:path";
import { app } from "electron";
import { mapping } from "file-mapping";
import { Config } from "./types";

if (fs.existsSync(app.getPath("userData")) === false) {
    fs.mkdirSync(app.getPath("userData"), { recursive: true });
}

export const config = mapping(
    path.resolve(app.getPath("userData"), "config.json"),
    default_config(),
);

export function default_config(): Config {
    return {
        version: 1,
        storage: path.resolve(app.getPath("userData"), "storage"),
        port: 14810,
        font: "NotoSansTC-Regular",
        playable_threshold: 3,
    };
}

export default config;
