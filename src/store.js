const fs = require("fs");
const { performance } = require("perf_hooks");
const { app } = require("electron");
const fetch = require("node-fetch");
const Fuse = require("fuse.js");
const { log, error } = require("./log");

const dirPath = app.getPath("userData");
const configPath = dirPath + "/config.json";

checkDirExists(dirPath);

let details = [];
const COVER = {};
const fuseOptions = {
    includeScore: true,
    keys: [
        {
            name: "title",
            weight: 1,
        },
        {
            name: "author",
            weight: 0.9,
        },
        {
            name: "category",
            weight: 0.5,
        },
        {
            name: "description",
            weight: 0.2,
        },
    ],
};
let fuseCache;

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
        font: "NotoSansTC-Regular",
        autoRemove: true,
        autoRemoveTime: 1,
        FVL: 3,
    };
    updateConfig(config);
}

function updateConfig(config) {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    console.log("Config Updated", config);
    log("Config Updated", config);
}

function getMyList() {
    const storage = getConfig().storage;
    const path = storage + "/mylist.json";
    if (!fs.existsSync(path)) createMyList();
    return JSON.parse(fs.readFileSync(path));
}

function createMyList() {
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
    const { data } = await fetch("https://myself-bbs.jacob.workers.dev/list/completed").then(
        (res) => res.json(),
    );
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
    const { data } = await fetch("https://myself-bbs.jacob.workers.dev/list/airing").then((res) =>
        res.json(),
    );
    fs.writeFileSync(path, JSON.stringify(data));
}

async function fetchAnimeDetails() {
    const storage = getConfig().storage;
    const path = storage + "/details.json";
    const data = await fetch(
        "https://github.com/JacobLinCool/Myself-BBS-API/raw/data/details.json",
    ).then((res) => res.json());
    fs.writeFileSync(path, JSON.stringify({ meta: { time: Date.now() }, data }));
    details = data;
    fuseCache = new Fuse(details, fuseOptions);
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
        COVER[id] = buffer;
    }
    if (!COVER[id]) COVER[id] = fs.readFileSync(path);
    return COVER[id];
}

async function getVideo(id, ep, file) {
    const storage = getConfig().storage;
    const path = storage + "/video/" + id + "/" + ep + "/" + file;
    while (!fs.existsSync(path)) await new Promise((resolve) => setTimeout(resolve, 2500));
    return fs.readFileSync(path);
}

async function searchAnime(query) {
    if (details.length === 0) await fetchAnimeDetails();
    const startTime = performance.now();

    const result = fuseCache.search(query);

    const endTime = performance.now();
    console.log(`Searching anime "${query}" took ${(endTime - startTime).toFixed(2)}ms`);
    log(`Searching anime "${query}" took ${(endTime - startTime).toFixed(2)}ms`);

    return { result };
}

async function getDownloadedList() {
    const list = {};
    const storage = getConfig().storage;
    const videoDir = storage + "/video/";
    fs.readdirSync(videoDir).forEach((vid) => {
        if (fs.statSync(videoDir + vid).isDirectory()) {
            list[vid] = [];
            fs.readdirSync(videoDir + vid).forEach((ep) => {
                if (fs.statSync(videoDir + vid + "/" + ep).isDirectory()) {
                    const listPath = videoDir + vid + "/" + ep + "/" + "files.json";
                    if (fs.existsSync(listPath)) {
                        const files = JSON.parse(fs.readFileSync(listPath));
                        let downloaded = 0;
                        files.forEach((file) => {
                            if (fs.existsSync(videoDir + vid + "/" + ep + "/" + file)) {
                                downloaded++;
                            }
                        });
                        list[vid].push({ ep, downloaded, total: files.length });
                    }
                }
            });
        }
    });
    return list;
}

async function getSprite(id, ep) {
    const storage = getConfig().storage;
    const path = storage + "/sprite/" + id + "/" + ep + ".png";
    checkDirExists(storage + "/sprite/" + id + "/");
    if (!fs.existsSync(path)) {
        const list = await fetch(`https://v.myself-bbs.com/vpx/${id}/${ep}/`).then((res) =>
            res.json(),
        );
        const buffer = await fetch(list.vtt).then((res) => res.buffer());
        fs.writeFileSync(path, buffer);
    }
    return fs.readFileSync(path);
}

async function removeVideo(id, ep) {
    const storage = getConfig().storage;
    const path = `${storage}/video/${id}/${ep}/`;
    if (fs.existsSync(path)) fs.rmdirSync(path, { recursive: true });
    if (!fs.readdirSync(`${storage}/video/${id}/`).length) fs.rmdirSync(`${storage}/video/${id}/`);
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
exports.getDownloadedList = getDownloadedList;
exports.getSprite = getSprite;
exports.removeVideo = removeVideo;
