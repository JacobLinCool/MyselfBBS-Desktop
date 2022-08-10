import express from "express";
import { Storage } from "./storage";
import { Anime, Config } from "./types";
import { sleep } from "./utils";

// temporarily fix FetchError: certificate has expired
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

export function start_server(config: Config) {
    const store = new Storage(config.storage);

    const suggestions: string[] = [];
    store.on("initialized", async () => {
        const s = new Set<string>();
        for (const anime of Object.values(store.details)) {
            s.add(anime.title);
            anime.category.forEach((category) => s.add(category));
        }
        console.log(`Listed ${s.size} suggestions`);
        suggestions.push(...Array.from(s));
    });

    const app = express()
        .use(express.json())
        .use((req, res, next) => {
            const start = Date.now();

            res.header("Access-Control-Allow-Origin", "*");
            res.header("Access-Control-Allow-Headers", "*");
            res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
            res.header("Access-Control-Allow-Credentials", "true");

            res.on("finish", () => {
                const duration = Date.now() - start;
                console.log(`${req.method} ${req.url} ${res.statusCode} ${duration} ms`);
            });

            return next();
        });

    const system = express.Router();
    system.get("/", async (req, res) => {
        res.json({ msg: "OK" });
    });
    system.post("/", async (req, res) => {
        await store.initialized;

        if (req.body.action === "update") {
            await store.update();
            res.json({ ok: true });
        } else if (req.body.action === "stop") {
            setTimeout(() => process.exit(222), 1000);
            res.json({ ok: true });
        } else {
            res.status(404).send("Not found");
        }
    });
    system.get("/ready", async (req, res) => {
        while ((await store.initialized) === false) {
            await sleep(100);
        }
        res.json({ ok: true });
    });
    system.get("/config", async (req, res) => {
        res.json(config);
    });

    app.use("/system", system);

    app.use("/alive", async (req, res) => {
        res.json({ ok: true });
    });

    const api = express.Router();

    api.get("/store/:method", async (req, res) => {
        await store.initialized;

        const { method } = req.params;
        const params = req.query;

        if (method === "airing") {
            res.json(store.airing.map((x) => ({ id: x.id, title: x.title, image: x.image })));
        } else if (method === "completed") {
            res.json(store.completed.map((x) => ({ id: x.id, title: x.title, image: x.image })));
        } else if (method === "details") {
            res.json(store.details);
        } else if (method === "search" && typeof params.q === "string" && params.q.length > 0) {
            res.json(await store.search(params.q));
        } else if (method === "info" && typeof params.id === "string" && parseInt(params.id) > 0) {
            res.json(await store.info(parseInt(params.id)));
        } else if (
            method === "status" &&
            typeof params.id === "string" &&
            parseInt(params.id) > 0
        ) {
            res.json(await store.status(params.id));
        } else if (method === "cover" && typeof params.id === "string" && parseInt(params.id) > 0) {
            res.type("image/jpeg");
            res.send(await store.cover(parseInt(params.id)));
        } else {
            res.status(404).send("Not found");
        }
    });

    api.get("/util/:action", async (req, res) => {
        await store.initialized;

        const { action } = req.params;
        const params = req.query;

        if (action === "suggestion") {
            res.json({ suggestion: suggestions[Math.floor(Math.random() * suggestions.length)] });
        } else if (action === "recent") {
            const list: Anime[] = [];
            const set = new Set<string>();
            const history = await store.history();

            for (let i = history.length - 1; i >= 0; i--) {
                const [id] = history[i];
                if (set.has(id)) {
                    continue;
                }
                set.add(id);
                list.push(store.details[id]);
                if (list.length >= 10) {
                    break;
                }
            }

            res.json({ list });
        } else if (action === "downloaded") {
            const list: Anime[] = [];

            for (const vid of Object.keys(store.videos())) {
                list.push(store.details[vid]);
            }

            res.json({ list });
        } else {
            res.status(404).send("Not found");
        }
    });

    api.get("/:vid/:ep/:file", async (req, res) => {
        await store.initialized;

        const { vid, ep, file } = req.params;

        if (file === "status") {
            res.json({ status: (await store.status(vid))?.[ep] || {} });
        } else if (file === "index.m3u8") {
            res.type("application/x-mpegURL");
            res.send(await store.m3u8(vid, ep));
        } else if (file === "sprite.jpg") {
            const buffer = await store.sprite(vid, ep);
            if (buffer) {
                res.type("image/jpeg");
                res.send(await store.sprite(vid, ep));
            } else {
                res.status(404).send("No Sprite");
            }
        } else if (file.endsWith(".ts")) {
            res.type("video/mp2t");
            res.send(await store.video(vid, ep, file));
        } else {
            res.status(404).send("Not found");
        }
    });

    api.post("/:vid/:ep/:file", async (req, res) => {
        await store.initialized;

        const { vid, ep, file } = req.params;

        if (file === "watched") {
            await store.watch(vid, ep, req.body.watched);
            res.json({ ok: true });
        } else if (file === "delete") {
            store.delete_video(vid, ep);
            res.json({ ok: true });
        } else if (file === "unwatch") {
            store.delete_history(vid, ep);
            res.json({ ok: true });
        } else {
            res.status(404).send("Not found");
        }
    });

    app.use("/", api);

    app.listen(config.port, () => {
        console.log("Backend Server is running on port " + config.port, config);
    });

    return app;
}
