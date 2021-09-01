const path = require("path");
const { app, BrowserWindow } = require("electron");
const { log, error } = require("./src/log");
require("./src/server");
const { getConfig, fetchAiringList, fetchCompletedList, fetchAnimeDetails } = require("./src/store");
const { platform } = require("process");

if (require("electron-squirrel-startup")) return app.quit();

if (platform === "win32") app.setUserTasks([]);

app.whenReady().then(() => {
    log("App Start");
    start();

    app.on("activate", () => {
        if (BrowserWindow.getAllWindows().length === 0) start();
    });
});

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
});

app.on("quit", () => {
    log("App Quit");
});

function start() {
    const config = getConfig();
    fetchAiringList();
    fetchCompletedList();
    fetchAnimeDetails();
    createWindow(config);
}

function createWindow(config) {
    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        frame: platform !== "win32",
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
        },
    });

    win.setThumbarButtons([]);
    // win.setOverlayIcon("icon/MyselfBBS.16.png", "MyselfBBS Desktop");
    win.loadURL("http://localhost:" + config.port);
}
