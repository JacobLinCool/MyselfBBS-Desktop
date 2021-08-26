const query = new URLSearchParams(location.search);
const id = query.get("id");

getInfo();

async function getInfo() {
    const data = await fetch(`/anime/${id}/info.json`).then((r) => r.json());
    document.querySelector("#title").innerHTML = data.title;
    document.querySelector("#description").innerHTML = data.description;
    document.querySelector("#image > img").src = `/anime/${id}/cover.jpg`;

    const list = document.createElement("ul");
    const categories = document.createElement("li");
    categories.innerHTML = "作品類型: " + data.category.join(", ");
    list.appendChild(categories);
    const author = document.createElement("li");
    author.innerHTML = "原著作者: " + data.author;
    list.appendChild(author);
    const ep = document.createElement("li");
    ep.innerHTML = "集數: " + (data.ep ? `${data.ep} 集` : "未定");
    list.appendChild(ep);
    const premiere = document.createElement("li");
    premiere.innerHTML = "首播日期: " + (data.premiere ? `${data.premiere[0]} 年 ${data.premiere[1]} 月 ${data.premiere[2]} 日` : "未知");
    list.appendChild(premiere);
    const myselfBBS = document.createElement("li");
    myselfBBS.innerHTML =
        "MyselfBBS: " + `<a href="http://myself-bbs.com/thread-${data.id}-1-1.html" target="_blank">http://myself-bbs.com/thread-${data.id}-1-1.html</a>`;
    list.appendChild(myselfBBS);
    document.querySelector("#info").appendChild(list);

    const epsodesHTML = Object.keys(data.episodes)
        .map(
            (ep, i) => `
    <div class="episode" data-ep="${(i + 1).toString().padStart(3, "0")}">${ep}</div>
    `
        )
        .join("");
    document.querySelector("#episodes").innerHTML = epsodesHTML;

    [...document.querySelectorAll(".episode")].forEach((node) => {
        node.addEventListener("click", () => {
            const ep = node.dataset.ep;
            window.parent.openPlayer(`/anime/${data.id}/${ep}/index.m3u8`);
        });
    });
}
