const fs = require("fs");
const Koa = require("koa");
const koaBody = require("koa-body");
const Router = require("koa-router");
const { platform } = require("process");
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
console.log("__dirname: ", __dirname);
console.log("Page Root: ", root);

app.use(koaBody());

router.get("/", (ctx, next) => {
    console.log("GET /");
    const file = fs.readFileSync(root + "page/index.html");
    ctx.type = "text/html; charset=utf-8";
    ctx.body = file;
});
router.get("/script.js", (ctx, next) => {
    const file = fs.readFileSync(root + "page/script.js");
    ctx.type = "application/javascript; charset=utf-8";
    ctx.body = file;
});
router.get("/hls.js", (ctx, next) => {
    const file = fs.readFileSync(root + "page/hls.js");
    ctx.type = "application/javascript; charset=utf-8";
    ctx.body = file;
});
router.get("/style.css", (ctx, next) => {
    const file = fs.readFileSync(root + "page/style.css");
    ctx.type = "text/css; charset=utf-8";
    ctx.body = file;
});
router.get("/icon.png", (ctx, next) => {
    const file = fs.readFileSync(root + "icon/MyselfBBS.full.png");
    ctx.type = "image/png";
    ctx.body = file;
});
router.get("/:page/", (ctx, next) => {
    const page = ctx.params.page;
    console.log(`GET /${page}`);
    const file = fs.readFileSync(root + `page/${page}/index.html`);
    ctx.type = "text/html; charset=utf-8";
    ctx.body = file;
});
router.get("/:page/script.js", (ctx, next) => {
    const page = ctx.params.page;
    const file = fs.readFileSync(root + `page/${page}/script.js`);
    ctx.type = "application/javascript; charset=utf-8";
    ctx.body = file;
});
router.get("/:page/style.css", (ctx, next) => {
    const page = ctx.params.page;
    const file = fs.readFileSync(root + `page/${page}/style.css`);
    ctx.type = "text/css; charset=utf-8";
    ctx.body = file;
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
    const file = await getPlaylist(id, ep);
    ctx.type = "application/x-mpegURL; charset=utf-8";
    ctx.body = file;
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
router.post("/history/:id/:ep", async (ctx, next) => {
    const id = ctx.params.id,
        ep = ctx.params.ep;
    const data = ctx.request.body;
    player.updateHistory(id, ep, data.time);
    ctx.type = "application/json; charset=utf-8";
    ctx.body = JSON.stringify(data);
});

router.get("/font.woff2", async (ctx, next) => {
    const filename = store.getConfig().font + ".woff2";
    const file = fs.readFileSync(root + `page/_FONTS/${filename}`);
    ctx.type = "application/font-woff2";
    ctx.body = file;
});

router.get("/reload", async (ctx, next) => {
    await Promise.all([store.fetchAiringList(), store.fetchCompletedList()]);
    ctx.type = "application/json; charset=utf-8";
    ctx.body = JSON.stringify({ success: true });
});

app.use(router.routes()).use(router.allowedMethods());

app.listen(config.port || 14810);
console.log("listening on port " + (config.port || 14810));
