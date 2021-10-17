const fs = require("fs");
const store = require("./store");

let STATE;

function getAllHistory() {
    const storage = store.getConfig().storage;
    const historyPath = storage + "/history.json";
    if (!fs.existsSync(historyPath)) fs.writeFileSync(historyPath, JSON.stringify({}));
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

function getHistory(vid, ep = null) {
    const history = getAllHistory();
    if (ep) return history[vid] ? history[vid][ep] : null;
    return history[vid];
}

function getAllState() {
    const storage = store.getConfig().storage;
    const statePath = storage + "/state.json";
    if (!fs.existsSync(statePath)) fs.writeFileSync(statePath, JSON.stringify({}));
    if (!STATE) STATE = JSON.parse(fs.readFileSync(statePath));
    return STATE;
}

function updateState(vid, ep, state) {
    const storage = store.getConfig().storage;
    const statePath = storage + "/state.json";
    const s = getAllState();
    if (!s[vid]) s[vid] = { state: {}, updated: 0 };
    if (getState(vid, ep) === state) return;
    s[vid].state[ep] = state;
    s[vid].updated = Date.now();
    fs.writeFileSync(statePath, JSON.stringify(s, null, 2));
    STATE = s;
}

function getState(vid, ep = null) {
    const state = getAllState();
    if (ep) return state[vid] ? state[vid].state[ep] : null;
    return state[vid];
}

exports.getAllHistory = getAllHistory;
exports.updateHistory = updateHistory;
exports.getHistory = getHistory;
exports.getAllState = getAllState;
exports.updateState = updateState;
exports.getState = getState;
