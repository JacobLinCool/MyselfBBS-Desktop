document.querySelector("#search").addEventListener("keypress", (evt) => {
    if (evt.key === "Enter") {
        evt.target.blur();
        search();
    }
});

async function search() {
    document.querySelector("#grid").innerHTML = "";
    const { result: animes } = await fetch("/s/e/a/r/c/h/" + document.querySelector("#search").value).then((res) => res.json());

    const html = animes
        .map(
            (anime) => `
        <div class="anime" data-id="${anime.id}">
            <div class="anime-image">
                <img src="/anime/${anime.id}/cover.jpg" loading="lazy" />
            </div>
            <div class="anime-title">
                ${anime.title}
            </div>
        </div>
    `
        )
        .join("");
    document.querySelector("#grid").innerHTML = html;

    [...document.querySelectorAll(".anime")].forEach((node) => {
        node.addEventListener("click", () => {
            window.parent.pageSwitch("anime", { id: node.dataset.id });
        });
    });
}

function randomSearchTip() {
    const searchTips = ["想找什麼？", "今天想看什麼？", "小林家", "vivy", "命運石之門", "物語", "奇幻", "科幻", "冒險", "懸疑", "搞笑"];
    const random = Math.floor(Math.random() * searchTips.length);
    document.querySelector("#search").placeholder = searchTips[random];
}
