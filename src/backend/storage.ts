import { EventEmitter } from "node:events";
import fs from "node:fs";
import path from "node:path";
import { mapping } from "file-mapping";
import Fuse from "fuse.js";
import fetch from "node-fetch";
import { Pool } from "@jacoblincool/puddle";
import { REMOTE_CACHE } from "./constants";
import { Anime, RawList } from "./types";
import { retry, sleep } from "./utils";

enum Status {
    started,
    sourced,
    listed,
    downloading,
    downloaded,
}

export class Storage extends EventEmitter {
    public initialized = Promise.resolve(false);
    public completed: Anime[] | null = null;
    public airing: Anime[] | null = null;
    public details: Record<number | string, Anime> = {};
    public video_status: Record<
        string,
        { status: Status; progress: number; done: Record<string, Promise<boolean>> }
    > = {};
    private _fuse: Fuse<Anime> | null = null;
    private _cover_cache: Record<number, Buffer> = {};
    private _updating = false;
    private _auto_updater: NodeJS.Timer;
    private _history: [string, string, number][];

    constructor(public storage: string) {
        super();

        if (!fs.existsSync(storage)) {
            fs.mkdirSync(storage, { recursive: true });
        }
        if (!fs.existsSync(path.join(storage, "cover"))) {
            fs.mkdirSync(path.join(storage, "cover"), { recursive: true });
        }
        if (!fs.existsSync(path.join(storage, "video"))) {
            fs.mkdirSync(path.join(storage, "video"), { recursive: true });
        }

        this.init();
    }

    public async init(): Promise<void> {
        if (await this.initialized) {
            return;
        }

        let done: (value: boolean) => void;
        this.initialized = new Promise((resolve) => {
            done = resolve;
        });

        await this.update();
        this._auto_updater = setInterval(() => this.update(), 1000 * 60 * 60 * 2);

        this._history = mapping<[string, string, number][]>(
            path.join(this.storage, "_history.json"),
            [],
        );

        done(true);
        this.emit("initialized");
    }

    public async update() {
        if (this._updating) {
            return;
        }
        this._updating = true;

        console.time("Storage Update");
        const airing = fetch(`${REMOTE_CACHE}/list/airing`)
            .then((res) => res.json())
            .then((res) => res.data.data);
        const completed = fetch(`${REMOTE_CACHE}/list/completed`)
            .then((res) => res.json())
            .then((res) => res.data.data);
        const details = fetch(`${REMOTE_CACHE}/anime/all`)
            .then((res) => res.json())
            .then((res) => res.data.data);

        fs.writeFileSync(path.resolve(this.storage, "airing.json"), JSON.stringify(await airing));
        fs.writeFileSync(
            path.resolve(this.storage, "completed.json"),
            JSON.stringify(await completed),
        );
        fs.writeFileSync(path.resolve(this.storage, "details.json"), JSON.stringify(await details));

        this.details = {};
        (await details).forEach((detail: Anime) => {
            this.details[detail.id] = detail;
        });

        this.airing = (await airing)
            .map((item: RawList["data"][number]) => this.details[item.id])
            .filter(Boolean);
        this.completed = (await completed)
            .map((item: RawList["data"][number]) => this.details[item.id])
            .filter(Boolean);

        this._fuse = new Fuse(Object.values(this.details), {
            includeScore: true,
            keys: [
                { name: "title", weight: 1 },
                { name: "author", weight: 0.9 },
                { name: "category", weight: 0.5 },
                { name: "description", weight: 0.2 },
            ],
        });

        console.timeEnd("Storage Update");

        this._updating = false;
    }

    public async info(id: number): Promise<Anime> {
        await this.init();
        return this.details[id];
    }

    public async search(query: string): Promise<Anime[]> {
        await this.init();

        console.time(`Searching for "${query}"`);
        const result = this._fuse.search(query).map((res) => res.item);
        console.timeEnd(`Searching for "${query}"`);

        return result;
    }

    public async cover(id: number): Promise<Buffer> {
        await this.init();

        if (this._cover_cache[id]) {
            return this._cover_cache[id];
        }

        const info = await this.info(id);
        if (!info) {
            return null;
        }

        const file = path.resolve(this.storage, "cover", `${id}.jpg`);

        if (!fs.existsSync(file)) {
            const res = await fetch(info.image);
            if (res.ok === false) {
                return null;
            }
            fs.writeFileSync(file, await res.buffer());
        }

        this._cover_cache[id] = fs.readFileSync(file);
        return this._cover_cache[id];
    }

    private async download_video(vid: string, ep: string) {
        const playable_threshold = 3;
        const key = `${vid}-${ep}`;
        if (!this.video_status[key]) {
            this.video_status[key] = { status: Status.started, progress: 0, done: {} };
            const [m3u8_ok, sprite_ok, playable] = (() => {
                const resolves: [
                    (value: boolean | PromiseLike<boolean>) => void,
                    (value: boolean | PromiseLike<boolean>) => void,
                    (value: boolean | PromiseLike<boolean>) => void,
                ] = [null, null, null];
                this.video_status[key].done.m3u8 = new Promise<boolean>((r) => {
                    resolves[0] = r;
                });
                this.video_status[key].done.sprite = new Promise<boolean>((r) => {
                    resolves[1] = r;
                });
                this.video_status[key].done.playable = new Promise<boolean>((r) => {
                    resolves[2] = r;
                });
                return resolves;
            })();

            const info = await this.info(parseInt(vid));
            console.log(`Start Downloading ${info.title} (${vid}) Episode ${ep}`);

            const dir = path.join(this.storage, "video", vid, ep);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }

            const [playlist_path, hosts, sprite] = await (async () => {
                const source = await fetch(`https://v.myself-bbs.com/vpx/${vid}/${ep}/`).then(
                    (r) => {
                        if (r.ok === true) {
                            return r.json();
                        }
                        throw new Error(
                            `Failed to get source list, status ${r.status}: ${r.statusText}`,
                        );
                    },
                );

                const playlist_path = source.video["720p"].split("/").splice(0, 2).join("/") + "/";
                const hosts: string[] = source.host
                    .sort((a: { weight: number }, b: { weight: number }) => b.weight - a.weight)
                    .map((x: { host: string }) => x.host);

                this.video_status[key].status = Status.sourced;
                return [playlist_path, hosts, (source.vtt as string) || ""];
            })();

            (async () => {
                const filepath = path.join(dir, "sprite.jpg");
                if (sprite && !fs.existsSync(filepath)) {
                    const res = await fetch(sprite);
                    if (res.ok) {
                        fs.writeFileSync(filepath, await res.buffer());
                    }
                }
                sprite_ok(true);
            })();

            const playlist = await (async () => {
                let playlist: string;
                const filepath = path.join(dir, "index.m3u8");
                if (fs.existsSync(filepath)) {
                    console.log("index.m3u8 Cached");
                    playlist = fs.readFileSync(filepath, "utf8");
                } else {
                    console.log("Fetching playlist");

                    const cached = await fetch(`${REMOTE_CACHE}/m3u8/${vid}/${ep}?min=1`).then(
                        (r) => r.json(),
                    );

                    if (cached.data) {
                        console.log("Using Edge Cached Playlist");
                        playlist = cached.data;
                    } else {
                        console.log("No Remote Cached Playlist Available");
                    }

                    for (let i = 0; !playlist && i < hosts.length; i++) {
                        try {
                            playlist = await fetch(hosts[i] + playlist_path + "720p.m3u8").then(
                                (r) => (r.ok ? r.text() : null),
                            );
                            break;
                        } catch {
                            continue;
                        }
                    }

                    if (!playlist) {
                        throw new Error("Cannot get playlist");
                    }
                    fs.writeFileSync(filepath, playlist);
                }
                m3u8_ok(true);
                return playlist;
            })();

            const ts_files = await (async () => {
                let ts_files: string[];
                const filepath = path.join(dir, "files.json");
                if (fs.existsSync(filepath)) {
                    console.log("files.json Cached");
                    ts_files = JSON.parse(fs.readFileSync(filepath, "utf8"));
                } else {
                    console.log("Generating files.json");
                    ts_files = playlist
                        .split("\n")
                        .map((line: string) => {
                            const trimed = line.trim();
                            return trimed && trimed[0] !== "#" ? trimed : "";
                        })
                        .filter((x) => x.length > 0);
                    fs.writeFileSync(filepath, JSON.stringify(ts_files));
                }
                this.video_status[key].status = Status.listed;
                return ts_files;
            })();

            let delay_factor = 1;
            const speed_scores = hosts.map((host) => ({ host, score: 0 }));
            const get_file = async (file: string) => {
                const filepath = path.join(dir, file);
                if (!fs.existsSync(filepath)) {
                    const controllers = speed_scores.map(({ host }) => {
                        const controller = new AbortController();
                        const signal = controller.signal;
                        return { host, controller, signal };
                    });

                    setTimeout(() => {
                        controllers.forEach(({ controller }) => controller.abort());
                        console.log("Download Aborted (Timed Out)", filepath);
                    }, 60_000);

                    let done = false;
                    const tasks = controllers.map((controller, i) =>
                        (async () => {
                            await sleep(i * 150 * delay_factor);
                            if (done) {
                                return;
                            }
                            const res = await fetch(`${controller.host}${playlist_path}${file}`, {
                                signal: controller.signal,
                            });
                            if (res.ok === false) {
                                console.error(
                                    `Failed to download ${file} from ${controller.host}`,
                                    res.status,
                                );
                                await sleep(60_000);
                                return;
                            }
                            const buffer = await res.buffer();

                            if (!done && buffer) {
                                done = true;
                                speed_scores.find((x) => x.host === controller.host).score++;
                                speed_scores.sort((a, b) => b.score - a.score);
                                delay_factor += 0.1;
                                console.log(
                                    `Speed Scores: [ ${speed_scores
                                        .slice(0, 3)
                                        .map((x) => JSON.stringify(x))
                                        .join(", ")} ]`,
                                    `Delay Factor: ${delay_factor}`,
                                );
                            }

                            return buffer;
                        })(),
                    );

                    const buffer = await Promise.race(tasks);
                    controllers.forEach((controller) => {
                        controller.controller.abort();
                    });

                    fs.writeFileSync(filepath, buffer);
                }
            };

            const pool = new Pool(playable_threshold);
            const finished = Array.from({ length: ts_files.length }, () => false);
            for (let i = 0; i < ts_files.length; i++) {
                let resolver: (value: boolean | PromiseLike<boolean>) => void;
                this.video_status[key].done[`video_${ts_files[i]}`] = new Promise<boolean>(
                    (resolve) => {
                        resolver = resolve;
                    },
                );
                pool.push(() =>
                    retry(async () => {
                        await get_file(ts_files[i]);
                        resolver(true);
                        finished[i] = true;
                        this.video_status[key].progress =
                            finished.filter(Boolean).length / ts_files.length;
                        console.log(
                            `${key} ${ts_files[i]} ${finished.filter(Boolean).length}/${
                                ts_files.length
                            }`,
                            speed_scores.slice(0, 3),
                        );
                    }),
                );
            }
            this.video_status[key].status = Status.downloading;

            pool.on("task-finish", () => {
                if (finished.slice(0, playable_threshold).every(Boolean)) {
                    playable(true);
                }
            });
            pool.on("pool-end", () => {
                playable(true);
            });
            pool.run();
        }
    }

    public delete_video(vid: string, ep: string) {
        const key = `${vid}-${ep}`;
        if (this.video_status[key]) {
            delete this.video_status[key];
        }
        const dir = path.join(this.storage, "video", vid);
        if (fs.existsSync(path.join(dir, ep))) {
            fs.rmdirSync(path.join(dir, ep), { recursive: true });
        }

        if (fs.readdirSync(dir).filter((x) => !x.startsWith(".")).length === 0) {
            fs.rmdirSync(dir, { recursive: true });
        }
    }

    public async m3u8(vid: string, ep: string) {
        const key = `${vid}-${ep}`;
        if (!this.video_status[key]) {
            await this.download_video(vid, ep);
        }
        await this.video_status[key].done.m3u8;

        const filepath = path.join(this.storage, "video", vid, ep, "index.m3u8");
        return fs.readFileSync(filepath, "utf8");
    }

    public async sprite(vid: string, ep: string) {
        const key = `${vid}-${ep}`;
        if (!this.video_status[key]) {
            await this.download_video(vid, ep);
        }
        await this.video_status[key].done.sprite;

        const filepath = path.join(this.storage, "video", vid, ep, "sprite.jpg");
        return fs.existsSync(filepath) ? fs.readFileSync(filepath) : null;
    }

    public async video(vid: string, ep: string, file: string) {
        const key = `${vid}-${ep}`;
        if (!this.video_status[key]) {
            await this.download_video(vid, ep);
        }
        await this.video_status[key].done[`video_${file}`];

        const filepath = path.join(this.storage, "video", vid, ep, file);
        return fs.readFileSync(filepath);
    }

    public async playable(vid: string, ep: string) {
        const key = `${vid}-${ep}`;
        if (!this.video_status[key]) {
            await this.download_video(vid, ep);
        }
        return this.video_status[key].done.playable;
    }

    public async status(
        vid: string,
    ): Promise<Record<string, { watched: number; downloaded: number }>> {
        const result: Record<string, { watched: number; downloaded: number }> = {};

        const folders = this.videos()[vid] ?? {};
        const history = this._history.filter((x) => x[0] === vid);
        const eps = new Set(history.map((x) => x[1]));

        for (const folder of Object.keys(folders)) {
            eps.add(folder);
        }

        for (const ep of Array.from(eps)) {
            const list: string[] = fs.existsSync(
                path.join(this.storage, "video", vid, ep, "files.json"),
            )
                ? JSON.parse(
                      fs.readFileSync(
                          path.join(this.storage, "video", vid, ep, "files.json"),
                          "utf8",
                      ),
                  )
                : [];
            result[ep] = {
                watched: history.find((x) => x[1] === ep)?.[2] ?? 0,
                downloaded:
                    list.reduce((acc, x) => acc + (folders[ep].find((f) => f === x) ? 1 : 0), 0) /
                        list.length ?? 0,
            };
        }

        return result;
    }

    public async watch(vid: string, ep: string, watched: number) {
        await this.initialized;

        const idx = this._history.findIndex((x) => x[0] === vid && x[1] === ep);
        if (idx === -1) {
            this._history.push([vid, ep, watched]);
        } else {
            const [prev] = this._history.splice(idx, 1);
            this._history.push([vid, ep, watched > prev[2] ? watched : prev[2]]);
        }
    }

    public async history() {
        await this.initialized;
        return this._history;
    }

    public delete_history(vid: string, ep: string) {
        const idx = this._history.findIndex((x) => x[0] === vid && x[1] === ep);
        if (idx !== -1) {
            this._history.splice(idx, 1);
        }
    }

    public videos() {
        const result: Record<string, Record<string, string[]>> = {};

        const vids = fs
            .readdirSync(path.join(this.storage, "video"))
            .filter(
                (x) =>
                    !x.startsWith(".") &&
                    fs.statSync(path.join(this.storage, "video", x)).isDirectory(),
            );
        for (const vid of vids) {
            const eps = fs
                .readdirSync(path.join(this.storage, "video", vid))
                .filter(
                    (x) =>
                        !x.startsWith(".") &&
                        fs.statSync(path.join(this.storage, "video", vid, x)).isDirectory(),
                );
            result[vid] = {};
            for (const ep of eps) {
                result[vid][ep] = fs
                    .readdirSync(path.join(this.storage, "video", vid, ep))
                    .filter((x) => !x.startsWith("."));
            }
        }

        return result;
    }
}

export default Storage;
