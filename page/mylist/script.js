const _animes = {};
let prev = null;
let updating = false;

list();
// setInterval(async () => {
//     update();
// }, 5000);
document.querySelector("#update").addEventListener("click", async () => {
    document.querySelector("#update").style.transform = "skew(-10deg) translateY(10px) scaleY(0)";
    await update();
    document.querySelector("#update").style.transform = "";
});

async function list() {
    updating = true;
    const downloaded = await fetch("/downloaded.json").then((res) => res.json());
    const animes = await Promise.all(Object.keys(downloaded).map((id) => getInfo(id)));
    document.querySelector("#list").innerHTML = "";
    prev = animes.reverse();
    const html = prev
        .map(
            (anime) => `
        <div class="anime" data-id="${anime.id}">
            <div class="anime-title">
                ${anime.title}
            </div>
            <div class="anime-image">
                <img src="/anime/${anime.id}/cover.jpg" loading="lazy" />
            </div>
            <div class="downloaded-details">
                ${Object.keys(anime.episodes)
                    .map(
                        (name, i) => `
                    <div class="item">
                        ${(() => {
                            const dl = downloaded[anime.id].find((e) => Number(e.ep) === i + 1);
                            if (dl && dl.downloaded === dl.total) {
                                return `<span class="downloaded">${name}: 已完整下載</span>`;
                            } else if (dl) {
                                return `<span class="started">${name}: 已下載 ${((dl.downloaded / dl.total) * 100).toFixed(0)}%</span>`;
                            } else {
                                return `<span class="nothing">${name}: 尚未下載</span>`;
                            }
                        })()}
                    </div>
                `,
                    )
                    .join("")}
            </div>
        </div>
    `,
        )
        .join("");
    document.querySelector("#list").innerHTML = html;

    [...document.querySelectorAll(".anime")].forEach((node) => {
        node.addEventListener("click", () => {
            window.parent.pageSwitch("anime", { id: node.dataset.id });
        });
    });
    updating = false;
}

async function update() {
    if (updating) return;
    updating = true;
    const downloaded = await fetch("/downloaded.json").then((res) => res.json());
    const animes = await Promise.all(Object.keys(downloaded).map((id) => getInfo(id)));

    animes.reverse().map((anime) => {
        if (JSON.stringify(anime) === JSON.stringify(prev.find((x) => x.id === anime.id))) {
            return;
        }
        const node = document.querySelector(`.anime[data-id="${anime.id}"]`);
        if (node) {
            node.querySelector(".downloaded-details").innerHTML = Object.keys(anime.episodes)
                .map(
                    (name, i) => `
            <div class="item">
                ${(() => {
                    const dl = downloaded[anime.id].find((e) => Number(e.ep) === i + 1);
                    if (dl && dl.downloaded === dl.total) {
                        return `<span class="downloaded">${name}: 已完整下載</span>`;
                    } else if (dl) {
                        return `<span class="started">${name}: 已下載 ${((dl.downloaded / dl.total) * 100).toFixed(0)}%</span>`;
                    } else {
                        return `<span class="nothing">${name}: 尚未下載</span>`;
                    }
                })()}
            </div>
        `,
                )
                .join("");
        }
    });
    prev = animes;
    updating = false;
}

async function getInfo(id) {
    if (!_animes[id]) _animes[id] = await fetch(`/anime/${id}/info.json`).then((res) => res.json());
    return _animes[id];
}
