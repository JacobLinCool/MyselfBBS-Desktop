const fs = require("fs");
const Koa = require("koa");
const koaBody = require("koa-body");
const Router = require("koa-router");
const { platform } = require("process");
const { log, error } = require("./log");
const store = require("./store");
const { getPlaylist, getStatus } = require("./download");
const player = require("./player");

const app = new Koa();
const router = new Router();
const config = store.getConfig();
const root = (() => {
    if (platform === "win32") {
        return __dirname.substr(0, __dirname.length - 3);
    } else {
        return __filename.substr(0, __filename.lastIndexOf("/") - 3);
    }
})();
console.log("Root: ", root);

app.use(koaBody());

const noCache = true;
const pageCache = {};

router.get("/", (ctx, next) => {
    console.log("GET /");
    if (!pageCache[ctx.path] || noCache) pageCache[ctx.path] = fs.readFileSync(`${root}page/index.html`, "utf8");
    ctx.type = "text/html; charset=utf-8";
    ctx.body = pageCache[ctx.path];
});
router.get("/script.js", (ctx, next) => {
    if (!pageCache[ctx.path] || noCache) pageCache[ctx.path] = fs.readFileSync(`${root}page/script.js`, "utf8");
    ctx.type = "application/javascript; charset=utf-8";
    ctx.body = pageCache[ctx.path];
});
router.get("/hls.js", (ctx, next) => {
    if (!pageCache[ctx.path] || noCache) pageCache[ctx.path] = fs.readFileSync(`${root}page/hls.js`, "utf8");
    ctx.type = "application/javascript; charset=utf-8";
    ctx.body = pageCache[ctx.path];
});
router.get("/style.css", (ctx, next) => {
    if (!pageCache[ctx.path] || noCache) pageCache[ctx.path] = fs.readFileSync(`${root}page/style.css`, "utf8");
    ctx.type = "text/css; charset=utf-8";
    ctx.body = pageCache[ctx.path];
});
router.get("/icon.png", (ctx, next) => {
    if (!pageCache[ctx.path] || noCache) pageCache[ctx.path] = fs.readFileSync(`${root}icon/MyselfBBS.full.png`);
    ctx.type = "image/png";
    ctx.body = pageCache[ctx.path];
});
router.get("/favicon.ico", (ctx, next) => {
    if (!pageCache[ctx.path] || noCache) pageCache[ctx.path] = fs.readFileSync(`${root}icon/MyselfBBS.ico`);
    ctx.type = "image/x-icon";
    ctx.body = pageCache[ctx.path];
});
router.get("/:page/", (ctx, next) => {
    const page = ctx.params.page;
    console.log(`GET /${page}`);
    if (!pageCache[ctx.path] || noCache) pageCache[ctx.path] = fs.readFileSync(`${root}page/${page}/index.html`, "utf8");
    ctx.type = "text/html; charset=utf-8";
    ctx.body = pageCache[ctx.path];
});
router.get("/:page/script.js", (ctx, next) => {
    const page = ctx.params.page;
    if (!pageCache[ctx.path] || noCache) pageCache[ctx.path] = fs.readFileSync(`${root}page/${page}/script.js`, "utf8");
    ctx.type = "application/javascript; charset=utf-8";
    ctx.body = pageCache[ctx.path];
});
router.get("/:page/style.css", (ctx, next) => {
    const page = ctx.params.page;
    if (!pageCache[ctx.path] || noCache) pageCache[ctx.path] = fs.readFileSync(`${root}page/${page}/style.css`, "utf8");
    ctx.type = "text/css; charset=utf-8";
    ctx.body = pageCache[ctx.path];
});

router.get("/config.json", (ctx, next) => {
    ctx.type = "application/json; charset=utf-8";
    ctx.body = JSON.stringify(store.getConfig());
});
router.post("/config.json", (ctx, next) => {
    const config = JSON.parse(ctx.request.body);
    store.updateConfig(config);
    ctx.type = "application/json; charset=utf-8";
    ctx.body = JSON.stringify(store.getConfig());
});
router.get("/reset", (ctx, next) => {
    store.createConfig();
    ctx.type = "application/json; charset=utf-8";
    ctx.body = JSON.stringify(store.getConfig());
});
router.get("/mylist.json", (ctx, next) => {
    ctx.type = "application/json; charset=utf-8";
    ctx.body = JSON.stringify(store.getMyList());
});
router.post("/mylist.json", (ctx, next) => {
    const mylist = JSON.parse(ctx.request.body);
    store.updateMyList(mylist);
    ctx.type = "application/json; charset=utf-8";
    ctx.body = JSON.stringify(store.getMyList());
});
router.get("/completed.json", async (ctx, next) => {
    ctx.type = "application/json; charset=utf-8";
    const data = await store.getCompletedList();
    ctx.body = data;
});
router.get("/airing.json", async (ctx, next) => {
    ctx.type = "application/json; charset=utf-8";
    const data = await store.getAiringList();
    ctx.body = data;
});
router.get("/anime/:id/info.json", async (ctx, next) => {
    ctx.type = "application/json; charset=utf-8";
    const data = await store.getAnimeInfo(ctx.params.id);
    ctx.body = data;
});
router.get("/anime/:id/cover.jpg", async (ctx, next) => {
    ctx.type = "image/jpeg";
    const data = await store.getCover(ctx.params.id);
    ctx.body = data;
});
router.get("/anime/:id/:ep/index.m3u8", async (ctx, next) => {
    const id = ctx.params.id,
        ep = ctx.params.ep;
    player.updateState(id, ep, "picked");
    const file = await getPlaylist(id, ep);
    ctx.type = "application/x-mpegURL; charset=utf-8";
    ctx.body = file;
});
router.get("/anime/:id/:ep/sprite.jpg", async (ctx, next) => {
    const id = ctx.params.id,
        ep = ctx.params.ep;
    ctx.type = "image/jpeg";
    const data = await store.getSprite(id, ep);
    ctx.body = data;
});
router.get("/anime/:id/:ep/:file", async (ctx, next) => {
    const id = ctx.params.id,
        ep = ctx.params.ep,
        filename = ctx.params.file;
    const file = await store.getVideo(id, ep, filename);
    ctx.type = "video/mp2t";
    ctx.body = file;
});
router.get("/s/e/a/r/c/h/:query", async (ctx, next) => {
    const query = decodeURIComponent(ctx.params.query);
    const data = await store.searchAnime(query);
    ctx.type = "application/json; charset=utf-8";
    ctx.body = data;
});
router.get("/downloading.json", async (ctx, next) => {
    ctx.type = "application/json; charset=utf-8";
    const data = JSON.stringify(getStatus());
    ctx.body = data;
});
router.get("/downloaded.json", async (ctx, next) => {
    ctx.type = "application/json; charset=utf-8";
    const data = JSON.stringify(await store.getDownloadedList());
    ctx.body = data;
});
router.get("/history/:id/:ep", async (ctx, next) => {
    const id = ctx.params.id,
        ep = ctx.params.ep;
    const data = await player.getHistory(id, ep);
    ctx.type = "application/json; charset=utf-8";
    ctx.body = JSON.stringify(data);
});
router.get("/history/:id/", async (ctx, next) => {
    const id = ctx.params.id;
    const data = (await player.getHistory(id)) || {};
    ctx.type = "application/json; charset=utf-8";
    ctx.body = JSON.stringify(data);
});
router.post("/history/:id/:ep", async (ctx, next) => {
    const id = ctx.params.id,
        ep = ctx.params.ep;
    const data = ctx.request.body;
    player.updateHistory(id, ep, data.time);
    player.updateState(id, ep, "watching");
    ctx.type = "application/json; charset=utf-8";
    ctx.body = JSON.stringify(data);
});

router.get("/font.woff2", async (ctx, next) => {
    const filename = store.getConfig().font + ".woff2";
    if (!pageCache[filename]) pageCache[filename] = fs.readFileSync(`${root}page/_FONTS/${filename}`);
    ctx.type = "application/font-woff2";
    ctx.body = pageCache[filename];
});

router.get("/reload", async (ctx, next) => {
    await Promise.all([store.fetchAiringList(), store.fetchCompletedList()]);
    ctx.type = "application/json; charset=utf-8";
    ctx.body = JSON.stringify({ success: true });
});

router.get("/api/finished/:vid/:ep", async (ctx, next) => {
    const vid = ctx.params.vid,
        ep = ctx.params.ep;
    player.updateState(vid, ep, "finished");
    const config = store.getConfig();
    if (config.autoRemove) {
        console.log(`Remove ${vid}-${ep} in ${5 + (+config.autoRemoveTime || 0)}s`);
        log(`Remove ${vid}-${ep} in ${5 + (+config.autoRemoveTime || 0)}s`);
        setTimeout(() => {
            console.log(`Removed ${vid}-${ep}`);
            log(`Removed ${vid}-${ep}`);
            store.removeVideo(vid, ep);
        }, (5 + (+config.autoRemoveTime || 0)) * 1000);
    }
    ctx.type = "application/json; charset=utf-8";
    ctx.body = JSON.stringify({ success: true });
});
router.get("/api/del/:vid/:ep", async (ctx, next) => {
    const vid = ctx.params.vid,
        ep = ctx.params.ep;
    console.log(`Removed ${vid}-${ep}`);
    log(`Removed ${vid}-${ep}`);
    store.removeVideo(vid, ep);
    ctx.type = "application/json; charset=utf-8";
    ctx.body = JSON.stringify({ success: true });
});
router.get("/api/state", async (ctx, next) => {
    const data = player.getAllState();
    ctx.type = "application/json; charset=utf-8";
    ctx.body = JSON.stringify(data);
});
router.get("/api/folder", async (ctx, next) => {
    ctx.type = "application/json; charset=utf-8";
    if (ctx.request.header["user-agent"].includes("myselfbbs-desktop")) {
        const dialog = require("electron").dialog;
        const path = await dialog.showOpenDialog({
            properties: ["openDirectory"],
            title: "請選擇存放下載檔案的資料夾",
            defaultPath: store.getConfig().storage,
        });
        ctx.body = JSON.stringify({ path: path.canceled ? "" : path.filePaths[0] });
    } else ctx.body = JSON.stringify({ path: "", error: "不支援此方法" });
});

app.use(router.routes()).use(router.allowedMethods());

const PORT = config.port || 14810;
app.listen(PORT);
console.log("listening on port " + PORT);
