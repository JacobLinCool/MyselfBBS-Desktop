const fs = require("fs");
const fetch = require("node-fetch");
const { getConfig, getAnimeInfo } = require("./store");

const downloading = {};

async function getPlaylist(vid, ep) {
    const storage = getConfig().storage;
    const path = `${storage}/video/${vid}/${ep}/index.m3u8`;
    const key = `${vid}-${ep}`;
    download(vid, ep);
    if (fs.existsSync(path) && downloading[key]?.status !== "listed") return fs.readFileSync(path, "utf8");
    return "";
}

async function download(vid, ep) {
    if (!downloading[vid + "-" + ep]) {
        downloading[vid + "-" + ep] = { status: "started" };
        const storage = getConfig().storage;
        const anime = await getAnimeInfo(vid);
        console.log(`Start Downloading ${anime.title}(${vid}) Episode ${ep}`);
        const remoteEp = Object.values(anime.episodes)[+ep - 1][1];
        const dir = `${storage}/video/${vid}/${ep}`;
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

        console.log("RemoteEP: " + remoteEp);
        let source = await fetch(`https://v.myself-bbs.com/vpx/${vid}/${remoteEp}/`).then((r) => {
            if (r.status === 200) return r.json();
            throw new Error(`get_source_failed_${r.status}: ${r.statusText}`);
        });

        const m3u8Path = source.video["720p"].split("/").splice(0, 2).join("/") + "/";
        let host = source.host.map((x) => x.host);
        downloading[vid + "-" + ep] = { status: "sourced" };

        let playlist;
        if (!fs.existsSync(`${dir}/index.m3u8`)) {
            console.log("Fetching index.m3u8");
            for (let i = 0; !playlist && i < host.length; i++) {
                playlist = await fetch(host[i] + m3u8Path + "720p.m3u8")
                    .then((r) => {
                        if (r.ok) return r.text();
                        else return null;
                    })
                    .catch((err) => null);
                if (playlist) break;
            }
            if (!playlist) throw new Error("get_playlist_failed");
            fs.writeFileSync(`${dir}/index.m3u8`, playlist);
        } else {
            console.log("index.m3u8 Cached");
            playlist = fs.readFileSync(`${dir}/index.m3u8`, "utf8");
        }

        let fileList;
        if (!fs.existsSync(`${dir}/files.json`)) {
            console.log("Generating files.json");
            fileList = genList(playlist);
            fs.writeFileSync(`${dir}/files.json`, JSON.stringify(fileList));
        } else {
            console.log("files.json Cached");
            fileList = JSON.parse(fs.readFileSync(`${dir}/files.json`, "utf8"));
        }
        downloading[vid + "-" + ep] = { status: "listed" };

        let queue = [];
        for (let i = 0; i < fileList.length && i < 5; i++) {
            const file = fileList[i];
            if (!checkVideoExist(vid, ep, file)) queue.push(downloadVideo(vid, ep, file, host, m3u8Path, storage));
        }
        await new Promise((resolve) => setTimeout(resolve, 2000));
        for (let i = 5; i < fileList.length; i++) {
            const file = fileList[i];
            if (!checkVideoExist(vid, ep, file)) queue.push(downloadVideo(vid, ep, file, host, m3u8Path, storage));
        }
        console.log(`${queue.length} files to download`);
        let finished = 0;
        for (let i = 0; i < 5; i++) {
            if (i < fileList.length) {
                console.log("Waiting For Video: " + (i + 1));
                await new Promise((r) => {
                    if (checkVideoExist(vid, ep, fileList[i])) r();
                    else {
                        let interval = setInterval(() => {
                            if (checkVideoExist(vid, ep, fileList[i])) {
                                clearInterval(interval);
                                finished++;
                                r();
                            }
                        }, 500);
                    }
                });
            }
        }
        downloading[vid + "-" + ep] = { status: "first-view", total: fileList.length, finished: fileList.length - queue.length + finished };
        (async () => {
            for (let i = 0; i < queue.length; i++) {
                await queue[i];
                finished++;
                downloading[vid + "-" + ep] = { status: "first-view", total: fileList.length, finished: fileList.length - queue.length + finished };
            }
            downloading[vid + "-" + ep] = "finished";
        })();
        console.log(`Downloading ${anime.title}(${vid}) Episode ${ep} Finished`);
        return playlist;
    } else {
        console.log("Donwload has started.");
        return "";
    }
}

function genList(playlist) {
    let list = [];
    let line = playlist.split("\n");
    line.forEach((l) => {
        let trimed = l.trim();
        if (trimed && trimed[0] !== "#") list.push(trimed);
    });
    return list;
}

function checkVideoExist(vid, ep, name) {
    const storage = getConfig().storage;
    const path = `${storage}/video/${vid}/${ep}/${name}`;
    return fs.existsSync(path);
}

async function downloadVideo(vid, ep, file, host, path, storage) {
    const h = JSON.parse(JSON.stringify(host));
    while (h.length && !checkVideoExist(vid, ep, file)) {
        const server = h.splice(Math.floor(Math.random() * h.length), 1)[0];
        const url = server + path + file;
        const r = await fetch(url)
            .then((r) => {
                if (r.ok) return r.buffer();
                else return false;
            })
            .then((data) => {
                const path = `${storage}/video/${vid}/${ep}/${file}`;
                fs.writeFileSync(path, data);
                return true;
            })
            .catch((err) => false);
        if (r) return true;
    }
    return false;
}

function getStatus() {
    return downloading;
}

exports.download = download;
exports.getPlaylist = getPlaylist;
exports.getStatus = getStatus;
