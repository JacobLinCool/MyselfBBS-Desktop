const iframe = document.querySelector("#page-loader");
const player = document.querySelector("#player");
const video = document.querySelector("#player-body");
const notice = document.querySelector("#player-notice");

load();
let pState = {
    next: false,
    preload: false,
    startAt: 0,
};

setInterval(() => {
    if (!video.paused && video.currentTime > pState.startAt + 5 && video.dataset.vid && video.dataset.ep) {
        fetch(`/history/${video.dataset.vid}/${video.dataset.ep}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ time: video.currentTime }),
        });
        if (pState.next && !pState.preload && video.currentTime > video.duration - 5 * 60) {
            console.log(`Preload: ${video.dataset.vid} ${(+video.dataset.ep + 1).toString().padStart(3, "0")}`);
            fetch(`/anime/${video.dataset.vid}/${(+video.dataset.ep + 1).toString().padStart(3, "0")}/index.m3u8`);
            pState.preload = true;
        }
        if (pState.next && pState.preload && video.currentTime >= video.duration - 1) {
            setTimeout(() => {
                fetch(`http://localhost:14810/api/finished/${video.dataset.vid}/${video.dataset.ep.padStart(3, "0")}`);
            }, 30000);
            const next = [video.dataset.vid, (+video.dataset.ep + 1).toString().padStart(3, "0")];
            console.log(`Next: ${next[0]} ${next[1]}`);
            closePlayer({ target: player }).then(() => {
                openPlayer(`/anime/${next[0]}/${next[1]}/index.m3u8`);
            });
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
    if (video.duration) return;
    console.log(`Player Open: ${url}`);
    pState = {
        next: false,
        preload: false,
        startAt: 0,
    };
    player.style.display = "flex";
    player.style.opacity = "1";
    notice.innerHTML = "請稍等一下喔";
    notice.style.display = "flex";

    player.addEventListener("click", closePlayer);

    const [vid, ep] = url.match(/\d+/g);

    (async () => {
        let playlist = await fetch(url)
            .then((res) => res.text())
            .catch((err) => null);
        while (!playlist && player.style.opacity == "1") {
            await new Promise((resolve) => setTimeout(resolve, 1000));
            playlist = await fetch(url)
                .then((res) => res.text())
                .catch((err) => null);
            let status = (await fetch(`/downloading.json`).then((res) => res.json()))[vid + "-" + ep];
            if (status) {
                if (status.status == "started") notice.innerHTML = "準備中.";
                else if (status.status == "sourced") notice.innerHTML = "準備中..";
                else if (status.status == "listed") notice.innerHTML = "準備中...";
                else {
                    notice.innerHTML = "下載中...";
                    if (status.finished) notice.innerHTML += ` (${((status.finished / status.total) * 100).toFixed(1)}%)`;
                }
            }
        }
        notice.style.display = "none";
        if (video.canPlayType("application/vnd.apple.mpegurl")) {
            video.src = url;
            video.load();
        } else if (Hls.isSupported()) {
            window.hls = new Hls();
            hls.loadSource(url);
            hls.attachMedia(video);
        }

        if (vid && ep) {
            video.dataset.vid = vid;
            video.dataset.ep = ep;
        }

        let time;
        try {
            time = await fetch(`/history/${video.dataset.vid}/${video.dataset.ep}`).then((r) => r.json());
        } catch (err) {}

        video.addEventListener(
            "canplaythrough",
            async () => {
                if (time && +time + 5 < video.duration) {
                    await new Promise((r) => setTimeout(r, 100));
                    video.currentTime = +time - 1;
                    pState.startAt = +time - 1;
                }
                await new Promise((r) => setTimeout(r, 200));
                video.play();
            },
            { once: true }
        );
    })();

    (async () => {
        const info = await fetch(`/anime/${vid}/info.json`).then((r) => r.json());
        if (Object.keys(info.episodes).length > +ep) pState.next = true;
    })();
}

async function closePlayer(evt) {
    if (evt.target === player) {
        console.log("Player Closed");
        player.removeEventListener("click", closePlayer);
        video.pause();
        video.src = "";
        hls.stopLoad();
        player.style.opacity = "0";
        await new Promise((resolve) => setTimeout(resolve, 300));
        player.style.display = "none";
    }
}
