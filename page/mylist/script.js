list();
setInterval(update, 1000);

async function list() {
    const downloaded = await fetch("/downloaded.json").then((res) => res.json());
    const animes = await Promise.all(Object.keys(downloaded).map((id) => fetch(`/anime/${id}/info.json`).then((res) => res.json())));
    document.querySelector("#list").innerHTML = "";
    const html = animes
        .reverse()
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
                `
                    )
                    .join("")}
            </div>
        </div>
    `
        )
        .join("");
    document.querySelector("#list").innerHTML = html;

    [...document.querySelectorAll(".anime")].forEach((node) => {
        node.addEventListener("click", () => {
            window.parent.pageSwitch("anime", { id: node.dataset.id });
        });
    });
}

async function update() {
    const downloaded = await fetch("/downloaded.json").then((res) => res.json());
    const animes = await Promise.all(Object.keys(downloaded).map((id) => fetch(`/anime/${id}/info.json`).then((res) => res.json())));

    animes.reverse().map((anime) => {
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
        `
                )
                .join("");
        }
    });
}
