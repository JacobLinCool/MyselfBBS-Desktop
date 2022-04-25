const fs = require("fs");
const { performance } = require("perf_hooks");
const fetch = require("node-fetch");
const { log, error } = require("./log");
const { getConfig, getAnimeInfo } = require("./store");

const downloading = {};

async function getPlaylist(vid, ep) {
    const storage = getConfig().storage;
    const path = `${storage}/video/${vid}/${ep}/index.m3u8`;
    const key = `${vid}-${ep}`;
    download(vid, ep);
    if (
        fs.existsSync(path) &&
        downloading[key]?.status !== "listed" &&
        downloading[key]?.status !== "downloading"
    )
        return fs.readFileSync(path, "utf8");
    return "";
}

async function download(vid, ep) {
    const config = getConfig();
    const FVL = config.FVL || 3;
    if (!downloading[vid + "-" + ep]) {
        const waitingStartTime = performance.now();
        downloading[vid + "-" + ep] = { status: "started" };
        const storage = config.storage;
        const anime = await getAnimeInfo(vid);
        console.log(`Start Downloading ${anime.title}(${vid}) Episode ${ep}`);
        const [remoteVid, remoteEp] = Object.values(anime.episodes)[+ep - 1];
        const dir = `${storage}/video/${vid}/${ep}`;
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        console.log(`RemoteVID: ${remoteVid}, RemoteEP: ${remoteEp}`);

        let source = await fetch(`https://v.myself-bbs.com/vpx/${remoteVid}/${remoteEp}/`).then(
            (r) => {
                if (r.status === 200) return r.json();
                throw new Error(`get_source_failed_${r.status}: ${r.statusText}`);
            },
        );

        const m3u8Path = source.video["720p"].split("/").splice(0, 2).join("/") + "/";
        let host = source.host.sort((a, b) => b.weight - a.weight).map((x) => x.host);
        downloading[vid + "-" + ep] = { status: "sourced" };

        // get m3u8 playlist
        let playlist;
        if (!fs.existsSync(`${dir}/index.m3u8`)) {
            console.log("Fetching index.m3u8");
            const cached = await fetch(
                `https://myself-bbs.jacob.workers.dev/m3u8/${remoteVid}/${remoteEp}?min=1`,
            ).then((r) => r.json());
            if (cached.data) {
                console.log("Using Remote Cached Playlist");
                playlist = cached.data;
            } else {
                console.log("No Remote Cached Playlist Available");
            }
            for (let i = 0; !playlist && i < host.length; i++) {
                if (playlist) break;
                playlist = await fetch(host[i] + m3u8Path + "720p.m3u8")
                    .then((r) => {
                        if (r.ok) return r.text();
                        else return null;
                    })
                    .catch((err) => null);
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

        // speed racing
        console.time("RACING");
        const speedScored = host.map((host) => ({ host, score: 0 }));

        let racingParallel = [];
        for (let i = 0; i < fileList.length && i < FVL; i++) {
            racingParallel.push(
                (async () => {
                    const file = fileList[i];
                    if (!checkVideoExist(vid, ep, file)) {
                        const race = [];
                        speedScored.forEach(({ host }, idx) => {
                            race.push(
                                (async () => {
                                    const url = host + m3u8Path + file;
                                    const r = await fetch(url)
                                        .then((r) => {
                                            if (r.ok) return r.buffer();
                                            throw new Error(`${r.status}: ${r.statusText}`);
                                        })
                                        .catch((err) => {
                                            console.error(`${url} ${err.message}`);
                                            error(`${url} ${err.message}`);
                                            return false;
                                        });
                                    if (r) {
                                        console.log(`${vid}-${ep} ${file} Downloaded (${host})`);
                                        speedScored[idx].score += 1;
                                        return r;
                                    } else await new Promise((r) => setTimeout(r, 60 * 1000));
                                })(),
                            );
                        });
                        const buffer = await Promise.race(race);
                        const path = `${storage}/video/${vid}/${ep}/${file}`;
                        if (!fs.existsSync(path)) fs.writeFileSync(path, buffer);
                    }
                })(),
            );
        }
        await Promise.all(racingParallel);

        host = JSON.parse(JSON.stringify(speedScored)).sort((a, b) => b.score - a.score);
        console.log("Scored: ", host);
        host = host.map((x) => x.host);
        console.timeEnd("RACING");

        let queue = [];
        for (let i = 0; i < fileList.length && i < FVL; i++) queue.push(true);
        for (let i = FVL; i < fileList.length; i++) {
            const file = fileList[i];
            if (!checkVideoExist(vid, ep, file))
                queue.push(downloadVideo(vid, ep, file, host, m3u8Path, storage));
        }
        console.log(`${queue.length} files to download`);
        downloading[vid + "-" + ep] = { status: "downloading", total: fileList.length };
        let finished = 0;
        for (let i = 0; i < FVL; i++) {
            if (i < fileList.length) {
                console.log("Waiting For Video: " + (i + 1));
                await new Promise((r) => {
                    if (checkVideoExist(vid, ep, fileList[i])) r();
                    else {
                        let interval = setInterval(() => {
                            if (checkVideoExist(vid, ep, fileList[i])) {
                                clearInterval(interval);
                                finished++;
                                downloading[vid + "-" + ep].finished =
                                    fileList.length - queue.length + finished;
                                r();
                            }
                        }, 500);
                    }
                });
            }
        }
        downloading[vid + "-" + ep] = {
            status: "first-view",
            total: fileList.length,
            finished: fileList.length - queue.length + finished,
        };

        const waitingEndTime = performance.now();
        console.log(`Waiting ${vid}-${ep}: ${(waitingEndTime - waitingStartTime).toFixed(2)}ms`);
        log(`Waiting ${vid}-${ep}: ${(waitingEndTime - waitingStartTime).toFixed(2)}ms`);
        // use async function to track and handle other tasks
        (async () => {
            for (let i = 0; i < queue.length; i++) {
                await queue[i];
                finished++;
                downloading[vid + "-" + ep].finished = fileList.length - queue.length + finished;
            }
            downloading[vid + "-" + ep].status = "finished";
            console.log(`${vid}-${ep} Download Finished`);
            setTimeout(() => {
                delete downloading[vid + "-" + ep];
            }, 5000);
        })();
        console.log(`${vid}-${ep} Can Play Through`);
        return playlist;
    } else {
        // console.log("Download has started.");
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
        const server = h.shift();
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
        if (r) {
            console.log(`${vid}-${ep} ${file} Downloaded`);
            return true;
        }
    }
    return false;
}

function getStatus() {
    return downloading;
}

exports.download = download;
exports.getPlaylist = getPlaylist;
exports.getStatus = getStatus;
