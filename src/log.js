const fs = require("fs");
const { app } = require("electron");

const dir = app.getPath("userData");

const logStream = fs.createWriteStream(dir + "/app.output.log", { flags: "a" }),
    errorStream = fs.createWriteStream(dir + "/app.error.log", { flags: "a" });

logStream.write(`-----\nDATE: ${Date.now()} (${new Date().toString()})\n`, "UTF8");
errorStream.write(`-----\nDATE: ${Date.now()} (${new Date().toString()})\n`, "UTF8");

async function log(...msg) {
    if (!msg.length) return;
    let M = "";
    msg.forEach((m) => {
        if (typeof m === "object") M += JSON.stringify(m, null, 2);
        else M += m;
        M += " ";
    });
    const d = new Date();
    const t = `${d.getHours().toString().padStart(2, "0")}:${d
        .getMinutes()
        .toString()
        .padStart(2, "0")}:${d.getSeconds().toString().padStart(2, "0")}`;
    logStream.write(`${t} ${M}\n`, "UTF8");
}

async function error(...msg) {
    if (!msg.length) return;
    let M = "";
    msg.forEach((m) => {
        if (typeof m === "object") M += JSON.stringify(m, null, 2);
        else M += m;
        M += " ";
    });
    const d = new Date();
    const t = `${d.getHours().toString().padStart(2, "0")}:${d
        .getMinutes()
        .toString()
        .padStart(2, "0")}:${d.getSeconds().toString().padStart(2, "0")}`;
    errorStream.write(`${t} ${M}\n`, "UTF8");
}

exports.log = log;
exports.error = error;
