let lastSearch = "";
let changed = false;
document.querySelector("#search").addEventListener("keydown", (evt) => {
    if (evt.key === "Tab") {
        evt.preventDefault();
        if (evt.target.value.trim() === "") {
            evt.target.value = evt.target.placeholder;
            changed = true;
            setTimeout(search, 10);
            randomSearchTip();
        }
    } else if (evt.key === "Enter" && evt.target.value.length > 0) {
        changed = true;
        evt.target.blur();
    } else if (evt.key !== "Backspace" && evt.key !== "Delete") {
        changed = true;
        setTimeout(search, 10);
    } else if (evt.target.value.length > 0) {
        changed = true;
        setTimeout(search, 10);
    }
});
document.querySelector("#search").addEventListener("compositionend", (evt) => {
    if (evt.target.value.length > 0) setTimeout(search, 10);
});
document.querySelector("#search").addEventListener("blur", () => {
    setTimeout(search, 10);
});
randomSearchTip();

async function search() {
    const query = document.querySelector("#search").value.trim();
    if (!changed || lastSearch === query) return;
    changed = false;
    document.querySelector("#grid").innerHTML = "";
    const { result: animes } = await fetch("/s/e/a/r/c/h/" + query).then((res) => res.json());

    const html = animes
        .map(
            ({ item: anime }) => `
        <div class="anime" data-id="${anime.id}">
            <div class="anime-image">
                <img src="/anime/${anime.id}/cover.jpg" loading="lazy" />
            </div>
            <div class="anime-title">
                ${anime.title}
            </div>
        </div>
    `,
        )
        .join("");
    document.querySelector("#grid").innerHTML = html;

    [...document.querySelectorAll(".anime")].forEach((node) => {
        node.addEventListener("click", () => {
            window.parent.pageSwitch("anime", { id: node.dataset.id });
        });
    });
    lastSearch = query;
}

function randomSearchTip() {
    const searchTips = [
        "想找什麼？",
        "今天想看什麼？",
        "小林家",
        "Vivy",
        "命運石之門",
        "Fate",
        "物語",
        "奇幻",
        "科幻",
        "冒險",
        "懸疑",
        "搞笑",
    ];
    const random = Math.floor(Math.random() * searchTips.length);
    document.querySelector("#search").placeholder = searchTips[random];
}
