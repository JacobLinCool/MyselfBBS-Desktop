list();

async function list() {
    const { data: animes } = await fetch("/airing.json").then((res) => res.json());
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
    `,
        )
        .join("");
    document.querySelector("#grid").innerHTML = html;

    [...document.querySelectorAll(".anime")].forEach((node) => {
        node.addEventListener("click", () => {
            window.parent.pageSwitch("anime", { id: node.dataset.id });
        });
    });
}
