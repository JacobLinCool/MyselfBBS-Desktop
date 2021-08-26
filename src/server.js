const fs = require("fs");
const Koa = require("koa");
const koaBody = require("koa-body");
const Router = require("koa-router");
const { shell } = require("electron");
const store = require("./store");
const { download } = require("./download");

const app = new Koa();
const router = new Router();
const config = store.getConfig();
const root = __filename.substr(0, __filename.lastIndexOf("/") - 3);

app.use(koaBody());

router.get("/", (ctx, next) => {
    console.log("GET /");
    const file = fs.readFileSync(root + "page/index.html");
    ctx.type = "text/html; charset=utf-8";
    ctx.body = file;
});
router.get("/script.js", (ctx, next) => {
    console.log("GET /script.js");
    const file = fs.readFileSync(root + "page/script.js");
    ctx.type = "application/javascript; charset=utf-8";
    ctx.body = file;
});
router.get("/hls.js", (ctx, next) => {
    console.log("GET /hls.js");
    const file = fs.readFileSync(root + "page/hls.js");
    ctx.type = "application/javascript; charset=utf-8";
    ctx.body = file;
});
router.get("/style.css", (ctx, next) => {
    console.log("GET /style.css");
    const file = fs.readFileSync(root + "page/style.css");
    ctx.type = "text/css; charset=utf-8";
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
    console.log(`GET /${page}/script.js`);
    const file = fs.readFileSync(root + `page/${page}/script.js`);
    ctx.type = "application/javascript; charset=utf-8";
    ctx.body = file;
});
router.get("/:page/style.css", (ctx, next) => {
    const page = ctx.params.page;
    console.log(`GET /${page}/style.css`);
    const file = fs.readFileSync(root + `page/${page}/style.css`);
    ctx.type = "text/css; charset=utf-8";
    ctx.body = file;
});
router.get("/config.json", (ctx, next) => {
    console.log("GET /config.json");
    ctx.type = "application/json; charset=utf-8";
    ctx.body = JSON.stringify(store.getConfig());
});
router.post("/config.json", (ctx, next) => {
    console.log("POST /config.json");
    const config = JSON.parse(ctx.request.body);
    store.updateConfig(config);
    ctx.type = "application/json; charset=utf-8";
    ctx.body = JSON.stringify(store.getConfig());
});
router.get("/reset", (ctx, next) => {
    console.log("GET /reset");
    store.createConfig();
    ctx.type = "application/json; charset=utf-8";
    ctx.body = JSON.stringify(store.getConfig());
});

router.get("/mylist.json", (ctx, next) => {
    console.log("GET /mylist.json");
    ctx.type = "application/json; charset=utf-8";
    ctx.body = JSON.stringify(store.getMyList());
});
router.post("/mylist.json", (ctx, next) => {
    console.log("POST /mylist.json");
    const mylist = JSON.parse(ctx.request.body);
    store.updateMyList(mylist);
    ctx.type = "application/json; charset=utf-8";
    ctx.body = JSON.stringify(store.getMyList());
});
router.get("/completed.json", async (ctx, next) => {
    console.log("GET /completed.json");
    ctx.type = "application/json; charset=utf-8";
    const data = await store.getCompletedList();
    ctx.body = data;
});
router.get("/airing.json", async (ctx, next) => {
    console.log("GET /airing.json");
    ctx.type = "application/json; charset=utf-8";
    const data = await store.getAiringList();
    ctx.body = data;
});
router.get("/anime/:id/info.json", async (ctx, next) => {
    console.log(`GET /anime/${ctx.params.id}/info.json`);
    ctx.type = "application/json; charset=utf-8";
    const data = await store.getAnimeInfo(ctx.params.id);
    ctx.body = data;
});
router.get("/anime/:id/cover.jpg", async (ctx, next) => {
    console.log(`GET /anime/${ctx.params.id}/cover.jpg`);
    ctx.type = "image/jpeg";
    const data = await store.getCover(ctx.params.id);
    ctx.body = data;
});
router.get("/open", async (ctx, next) => {
    console.log("GET /open");
    const url = ctx.query.url;
    shell.openExternal(url);
    ctx.type = "text/plain; charset=utf-8";
    ctx.body = "";
});
router.get("/anime/:id/:ep/index.m3u8", async (ctx, next) => {
    const id = ctx.params.id,
        ep = ctx.params.ep;
    const file = await download(id, ep);
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

app.use(router.routes()).use(router.allowedMethods());

app.listen(config.port || 14810);
console.log("listening on port " + (config.port || 14810));
