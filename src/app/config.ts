import fs from "node:fs";
import path from "node:path";
import { app } from "electron";
import { Config } from "./types";

const config_path = path.resolve(app.getPath("userData"), "config.json");
if (fs.existsSync(config_path) === false) {
    if (fs.existsSync(app.getPath("userData")) === false) {
        fs.mkdirSync(app.getPath("userData"), { recursive: true });
    }
    fs.writeFileSync(config_path, JSON.stringify(default_config()));
}

const _config: Config = JSON.parse(fs.readFileSync(config_path, "utf8"));

export const config = {
    get<K extends keyof Config>(key: K): Config[K] {
        return _config[key];
    },
    set<K extends keyof Config>(key: K, value: Config[K]) {
        _config[key] = value;
        fs.writeFileSync(config_path, JSON.stringify(_config));
    },
};

export function default_config(): Config {
    return {
        version: 1,
        storage: path.resolve(app.getPath("userData"), "storage"),
        port: 14810,
        font: "NotoSansTC-Regular",
        auto_remove: true,
        auto_remove_threshold: 2,
        playable_threshold: 3,
    };
}

export default config;
