const fs = require("fs");
const Router = require("koa-router");
const store = require("../store");
const player = require("../player");
const { getPlaylist, getStatus } = require("../download");

const router = new Router();

const root = (() => {
    if (platform === "win32") return __dirname.substr(0, __dirname.length - "src/server".length - 1);
    else return __filename.substr(0, __filename.lastIndexOf("/") - "src/server".length - 1);
})();
console.log(root);

router.get("/", (ctx, next) => {
    ctx.type = "text/html; charset=utf-8";
    ctx.body = fs.readFileSync(`${root}/page/index.html`, "utf8");
});
router.get("/script.js", (ctx, next) => {
    ctx.type = "application/javascript; charset=utf-8";
    ctx.body = fs.readFileSync(`${root}/page/script.js`, "utf8");
});
router.get("/hls.js", (ctx, next) => {
    ctx.type = "application/javascript; charset=utf-8";
    ctx.body = fs.readFileSync(`${root}/page/hls.js`, "utf8");
});
router.get("/style.css", (ctx, next) => {
    ctx.type = "text/css; charset=utf-8";
    ctx.body = fs.readFileSync(`${root}/page/style.css`, "utf8");
});
router.get("/icon.png", (ctx, next) => {
    ctx.type = "image/png";
    ctx.body = fs.readFileSync(`${root}/icon/MyselfBBS.full.png`);
});
router.get("/favicon.ico", (ctx, next) => {
    ctx.type = "image/x-icon";
    ctx.body = fs.readFileSync(`${root}/icon/MyselfBBS.ico`);
});
router.get("/font.woff2", async (ctx, next) => {
    ctx.type = "application/font-woff2";
    const filename = store.getConfig().font + ".woff2";
    ctx.body = fs.readFileSync(`${root}page/_FONTS/${filename}`);
});

// #region Pages
const page = new Router();

page.get("/:page/", (ctx, next) => {
    ctx.type = "text/html; charset=utf-8";
    const page = ctx.params.page;
    ctx.body = fs.readFileSync(`${root}/page/${page}/index.html`, "utf8");
});
page.get("/:page/script.js", (ctx, next) => {
    ctx.type = "application/javascript; charset=utf-8";
    const page = ctx.params.page;
    ctx.body = fs.readFileSync(`${root}page/${page}/script.js`, "utf8");
});
page.get("/:page/style.css", (ctx, next) => {
    ctx.type = "text/css; charset=utf-8";
    const page = ctx.params.page;
    ctx.body = fs.readFileSync(`${root}page/${page}/style.css`, "utf8");
});

router.use("/page", page.routes());
// #endregion

// #region API
const api = new Router();

api.get("/config.json", (ctx, next) => {
    ctx.type = "application/json; charset=utf-8";
    ctx.body = JSON.stringify(store.getConfig());
});
api.post("/config.json", (ctx, next) => {
    ctx.type = "application/json; charset=utf-8";
    const config = JSON.parse(ctx.request.body);
    store.updateConfig(config);
    ctx.body = JSON.stringify(store.getConfig());
});
api.get("/mylist.json", (ctx, next) => {
    ctx.type = "application/json; charset=utf-8";
    ctx.body = JSON.stringify(store.getMyList());
});
api.post("/mylist.json", (ctx, next) => {
    ctx.type = "application/json; charset=utf-8";
    const mylist = JSON.parse(ctx.request.body);
    store.updateMyList(mylist);
    ctx.body = JSON.stringify(store.getMyList());
});
api.get("/completed.json", async (ctx, next) => {
    ctx.type = "application/json; charset=utf-8";
    ctx.body = await store.getCompletedList();
});
api.get("/airing.json", async (ctx, next) => {
    ctx.type = "application/json; charset=utf-8";
    ctx.body = await store.getAiringList();
});
api.get("/anime/:id/info.json", async (ctx, next) => {
    ctx.type = "application/json; charset=utf-8";
    ctx.body = await store.getAnimeInfo(ctx.params.id);
});
api.get("/anime/:id/cover.jpg", async (ctx, next) => {
    ctx.type = "image/jpeg";
    ctx.body = await store.getCover(ctx.params.id);
});
api.get("/anime/:id/:ep/index.m3u8", async (ctx, next) => {
    ctx.type = "application/x-mpegURL; charset=utf-8";
    const id = ctx.params.id,
        ep = ctx.params.ep;
    player.updateState(id, ep, "picked");
    ctx.body = await getPlaylist(id, ep);
});
api.get("/anime/:id/:ep/sprite.jpg", async (ctx, next) => {
    ctx.type = "image/jpeg";
    ctx.body = await store.getSprite(ctx.params.id, ctx.params.ep);
});
api.get("/anime/:id/:ep/:file", async (ctx, next) => {
    ctx.type = "video/mp2t";
    ctx.body = await store.getVideo(ctx.params.id, ctx.params.ep, ctx.params.file);
});
api.get("/search/:query", async (ctx, next) => {
    ctx.type = "application/json; charset=utf-8";
    const query = decodeURIComponent(ctx.params.query);
    ctx.body = await store.searchAnime(query);
});
api.get("/downloading.json", async (ctx, next) => {
    ctx.type = "application/json; charset=utf-8";
    ctx.body = JSON.stringify(getStatus());
});
api.get("/downloaded.json", async (ctx, next) => {
    ctx.type = "application/json; charset=utf-8";
    ctx.body = JSON.stringify(await store.getDownloadedList());
});
api.get("/history/:id/:ep", async (ctx, next) => {
    ctx.type = "application/json; charset=utf-8";
    ctx.body = JSON.stringify(await player.getHistory(ctx.params.id, ctx.params.ep));
});
api.get("/history/:id/", async (ctx, next) => {
    ctx.type = "application/json; charset=utf-8";
    ctx.body = JSON.stringify((await player.getHistory(ctx.params.id)) || {});
});
api.post("/history/:id/:ep", async (ctx, next) => {
    ctx.type = "application/json; charset=utf-8";
    const id = ctx.params.id,
        ep = ctx.params.ep;
    const data = ctx.request.body;
    player.updateHistory(id, ep, data.time);
    player.updateState(id, ep, "watching");
    ctx.body = JSON.stringify(data);
});
api.get("/api/finished/:vid/:ep", async (ctx, next) => {
    ctx.type = "application/json; charset=utf-8";
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
    ctx.body = JSON.stringify({ success: true });
});
api.get("/api/del/:vid/:ep", async (ctx, next) => {
    ctx.type = "application/json; charset=utf-8";
    const vid = ctx.params.vid,
        ep = ctx.params.ep;
    console.log(`Removed ${vid}-${ep}`);
    log(`Removed ${vid}-${ep}`);
    store.removeVideo(vid, ep);
    ctx.body = JSON.stringify({ success: true });
});
api.get("/state.json", async (ctx, next) => {
    ctx.type = "application/json; charset=utf-8";
    ctx.body = JSON.stringify(player.getAllState());
});

router.use("/_api", api.routes());
// #endregion

// #region Actions
const act = new Router();

act.get("/reset", (ctx, next) => {
    ctx.type = "application/json; charset=utf-8";
    store.createConfig();
    ctx.body = JSON.stringify(store.getConfig());
});
act.get("/reload", async (ctx, next) => {
    ctx.type = "application/json; charset=utf-8";
    await Promise.all([store.fetchAiringList(), store.fetchCompletedList()]);
    ctx.body = JSON.stringify({ success: true });
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

router.use("/_act", act.routes());
// #endregion

module.exports = router;
