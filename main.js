const path = require("path");
const { app, BrowserWindow } = require("electron");
const server = require("./src/server");
const { getConfig, fetchAiringList, fetchCompletedList, fetchAnimeDetails } = require("./src/store");

if (require("electron-squirrel-startup")) return app.quit();

const config = getConfig();

app.setUserTasks([]);

app.whenReady().then(() => {
    start();

    app.on("activate", () => {
        if (BrowserWindow.getAllWindows().length === 0) start();
    });
});

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
});

function start() {
    fetchAiringList();
    fetchCompletedList();
    fetchAnimeDetails();
    createWindow();
}

function createWindow() {
    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        frame: false,
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
        },
    });

    win.setThumbarButtons([]);
    // win.setOverlayIcon("icon/MyselfBBS.16.png", "MyselfBBS Desktop");
    win.loadURL("http://localhost:" + config.port);
}
