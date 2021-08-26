const fs = require("fs");
const { app } = require("electron");
const fetch = require("node-fetch");

const dirPath = app.getPath("userData");
const configPath = dirPath + "/config.json";

checkDirExists(dirPath);

let details = [];

function checkDirExists(path) {
    if (!fs.existsSync(path)) fs.mkdirSync(path, { recursive: true });
}

function getConfig() {
    if (!fs.existsSync(configPath)) createConfig();
    return JSON.parse(fs.readFileSync(configPath));
}

function createConfig() {
    checkDirExists(dirPath + "/storage");
    const config = {
        storage: dirPath + "/storage",
        port: 14810,
    };
    updateConfig(config);
}

function updateConfig(config) {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

function getMyList() {
    const storage = getConfig().storage;
    const path = storage + "/mylist.json";
    if (!fs.existsSync(path)) createMyList();
    return JSON.parse(fs.readFileSync(path));
}

function createMyList() {
    const storage = getConfig().storage;
    const path = storage + "/mylist.json";
    const mylist = {};
    updateMyList(mylist);
}

function updateMyList(mylist) {
    const storage = getConfig().storage;
    const path = storage + "/mylist.json";
    fs.writeFileSync(path, JSON.stringify(mylist, null, 2));
}

async function getCompletedList() {
    const storage = getConfig().storage;
    const path = storage + "/completed.json";
    if (!fs.existsSync(path)) await fetchCompletedList();
    const list = JSON.parse(fs.readFileSync(path));
    if (list.meta.time + 6 * 60 * 60 * 1000 < Date.now()) await fetchCompletedList();
    return list;
}
async function fetchCompletedList() {
    const storage = getConfig().storage;
    const path = storage + "/completed.json";
    const { data } = await fetch("https://myself-bbs.jacob.workers.dev/list/completed").then((res) => res.json());
    fs.writeFileSync(path, JSON.stringify(data));
}

async function getAiringList() {
    const storage = getConfig().storage;
    const path = storage + "/airing.json";
    if (!fs.existsSync(path)) await fetchAiringList();
    const list = JSON.parse(fs.readFileSync(path));
    if (list.meta.time + 6 * 60 * 60 * 1000 < Date.now()) await fetchAiringList();
    return list;
}
async function fetchAiringList() {
    const storage = getConfig().storage;
    const path = storage + "/airing.json";
    const { data } = await fetch("https://myself-bbs.jacob.workers.dev/list/airing").then((res) => res.json());
    fs.writeFileSync(path, JSON.stringify(data));
}

async function fetchAnimeDetails() {
    const storage = getConfig().storage;
    const path = storage + "/details.json";
    const data = await fetch("https://github.com/JacobLinCool/Myself-BBS-API/raw/data/details.json").then((res) => res.json());
    fs.writeFileSync(path, JSON.stringify({ meta: { time: Date.now() }, data }));
    details = data;
}

async function getAnimeInfo(id) {
    if (details.length === 0) await fetchAnimeDetails();
    return details.find((info) => info.id === +id);
}

async function getCover(id) {
    const storage = getConfig().storage;
    const path = storage + "/cover/" + id + ".jpg";
    checkDirExists(storage + "/cover");
    if (!fs.existsSync(path)) {
        const info = await getAnimeInfo(id);
        const url = info.image;
        const buffer = await fetch(url).then((res) => res.buffer());
        fs.writeFileSync(path, buffer);
        return buffer;
    }
    return fs.readFileSync(path);
}

async function getVideo(id, ep, file) {
    const storage = getConfig().storage;
    const path = storage + "/video/" + id + "/" + ep + "/" + file;
    while (!fs.existsSync(path)) await new Promise((resolve) => setTimeout(resolve, 2500));
    return fs.readFileSync(path);
}

async function searchAnime(query) {
    if (details.length === 0) await fetchAnimeDetails();
    const animes = JSON.parse(JSON.stringify(details));
    const queries = query
        .split(" ")
        .map((x) => x.trim().toLowerCase())
        .filter((x) => x !== "");

    const result = animes
        .map((x) => {
            let score = 0;
            queries.forEach((q) => {
                if (x.title && x.title.toLowerCase().includes(q)) score += 10;
                if (x.category && x.category.includes(q)) score += 3;
                if (x.description && x.description.includes(q)) score += 1;
            });
            return { ...x, score };
        })
        .filter((x) => x.score > 0)
        .sort((a, b) => b.score - a.score);
    return { result };
}

exports.getConfig = getConfig;
exports.createConfig = createConfig;
exports.updateConfig = updateConfig;
exports.getMyList = getMyList;
exports.createMyList = createMyList;
exports.updateMyList = updateMyList;
exports.getCompletedList = getCompletedList;
exports.getAiringList = getAiringList;
exports.getAnimeInfo = getAnimeInfo;
exports.fetchCompletedList = fetchCompletedList;
exports.fetchAiringList = fetchAiringList;
exports.fetchAnimeDetails = fetchAnimeDetails;
exports.getCover = getCover;
exports.getVideo = getVideo;
exports.searchAnime = searchAnime;
