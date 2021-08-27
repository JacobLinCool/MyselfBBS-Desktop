const iframe = document.querySelector("#page-loader");
const player = document.querySelector("#player");
const video = document.querySelector("#player-body");

load();
let pState = {
    next: false,
    preload: false,
};

setInterval(() => {
    if (!video.paused && video.currentTime > 0 && video.dataset.vid && video.dataset.ep) {
        fetch(`/history/${video.dataset.vid}/${video.dataset.ep}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ time: video.currentTime }),
        });
        if (pState.next && !pState.preload && video.currentTime > video.duration - 5 * 60) {
            fetch(`/anime/${video.dataset.vid}/${video.dataset.ep}/index.m3u8`);
            pState.preload = true;
        }
        if (pState.next && pState.preload && video.currentTime > video.duration - 0.05) {
            closePlayer({ target: player });
            openPlayer(`/anime/${video.dataset.vid}/${video.dataset.ep}/index.m3u8`);
        }
    }
}, 1000);

async function load() {
    document.querySelector("#main").style.background = "rgb(30, 30, 50)";
    await new Promise((resolve) => setTimeout(resolve, 300));
    document.querySelector("#bar").style.opacity = "1";
    await new Promise((resolve) => setTimeout(resolve, 300));
    pageSwitch("mylist");
    [...document.querySelectorAll(".bar-item")].forEach((node) => {
        node.addEventListener("click", () => pageSwitch(node.dataset.page));
    });
}

async function pageSwitch(page, query = {}) {
    document.querySelector(".bar-item.active")?.classList?.remove("active");
    document.querySelector(`.bar-item[data-page='${page}']`)?.classList?.add("active");

    const location = `./${page}/?${Object.keys(query)
        .map((key) => `${key}=${query[key]}`)
        .join("&")}`;
    iframe.style.opacity = "0";
    await new Promise((resolve) => setTimeout(resolve, 300));
    iframe.src = location;
    await new Promise((resolve) => setTimeout(resolve, 300));
    iframe.style.opacity = "1";
    await new Promise((resolve) => setTimeout(resolve, 300));
}

function openPlayer(url) {
    if (video.src != "" && video.src != location.origin + "/") return;
    pState = {
        next: false,
        preload: false,
    };
    player.style.display = "flex";
    player.style.opacity = "1";

    player.addEventListener("click", closePlayer);

    const [vid, ep] = url.match(/\d+/g);

    (async () => {
        let playlist = await fetch(url)
            .then((res) => res.text())
            .catch((err) => null);
        while (!playlist && player.style.opacity == "0") {
            await new Promise((resolve) => setTimeout(resolve, 500));
            playlist = await fetch(url)
                .then((res) => res.text())
                .catch((err) => null);
        }
        if (Hls.isSupported()) {
            var hls = new Hls();
            hls.loadSource(url);
            hls.attachMedia(video);
        } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
            video.src = url;
        }

        if (vid && ep) {
            video.dataset.vid = vid;
            video.dataset.ep = ep;
        }

        const time = await fetch(`/history/${video.dataset.vid}/${video.dataset.ep}`).then((r) => r.json());
        if (time) video.currentTime = +time - 1;
    })();

    (async () => {
        const info = await fetch(`/anime/${vid}/info.json`).then((r) => r.json());
        if (Object.keys(info.episodes).length > +ep) pState.next = true;
    })();
}

async function closePlayer(evt) {
    if (evt.target === player) {
        player.removeEventListener("click", closePlayer);
        video.pause();
        video.src = "";
        player.style.opacity = "0";
        await new Promise((resolve) => setTimeout(resolve, 300));
        player.style.display = "none";
    }
}