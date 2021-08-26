const fs = require("fs");
const fetch = require("node-fetch");
const { getConfig, getAnimeInfo } = require("./store");

async function download(vid, ep) {
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

    let queue = [];
    fileList.forEach((file) => {
        if (!checkVideoExist(vid, ep, file)) queue.push(downloadVideo(vid, ep, file, host, m3u8Path, storage));
    });
    console.log(`${queue.length} files to download`);
    for (let i = 0; i < 5; i++) {
        if (i < fileList.length) {
            console.log("Waiting For Video: " + (i + 1));
            await new Promise((r) => {
                if (checkVideoExist(vid, ep, fileList[i])) r();
                else {
                    let interval = setInterval(() => {
                        if (checkVideoExist(vid, ep, fileList[i])) {
                            clearInterval(interval);
                            r();
                        }
                    }, 500);
                }
            });
        }
    }

    return playlist;
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

exports.download = download;
