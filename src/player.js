const fs = require("fs");
const store = require("./store");

function getAllHistory() {
    const storage = store.getConfig().storage;
    const historyPath = storage + "/history.json";
    if (!fs.existsSync(historyPath)) {
        fs.writeFileSync(historyPath, JSON.stringify({}));
    }
    return JSON.parse(fs.readFileSync(historyPath));
}

function updateHistory(vid, ep, time) {
    const storage = store.getConfig().storage;
    const historyPath = storage + "/history.json";
    const history = getAllHistory();
    if (!history[vid]) history[vid] = {};
    history[vid][ep] = time;
    fs.writeFileSync(historyPath, JSON.stringify(history, null, 2));
}

function getHistory(vid, ep) {
    const history = getAllHistory();
    return history[vid] ? history[vid][ep] : null;
}

exports.getAllHistory = getAllHistory;
exports.updateHistory = updateHistory;
exports.getHistory = getHistory;
