const iframe = document.querySelector("#page-loader");
const player = document.querySelector("#player");
const video = document.querySelector("#player-body");

load();

async function load() {
    document.querySelector("#main").style.background = "rgb(30, 30, 50)";
    await new Promise((resolve) => setTimeout(resolve, 300));
    document.querySelector("#bar").style.opacity = "1";
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
    if (Hls.isSupported()) {
        var hls = new Hls();
        hls.loadSource(url);
        hls.attachMedia(video);
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = url;
    }

    player.style.display = "flex";
    player.style.opacity = "1";

    player.addEventListener("click", closePlayer);
}

async function closePlayer(evt) {
    if (evt.target === player) {
        player.removeEventListener("click", closePlayer);
        video.pause();
        player.style.opacity = "0";
        await new Promise((resolve) => setTimeout(resolve, 300));
        player.style.display = "none";
    }
}
