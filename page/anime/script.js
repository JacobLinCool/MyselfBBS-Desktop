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
    premiere.innerHTML = "首播日期: ";
    if (!Array.isArray(data.premiere) || data.premiere.length <= 1) premiere.innerHTML += "未知";
    else if (data.premiere.length === 2)
        premiere.innerHTML += `${data.premiere[0]} 年 ${data.premiere[1]} 月`;
    else if (data.premiere.length === 3)
        premiere.innerHTML += `${data.premiere[0]} 年 ${data.premiere[1]} 月 ${data.premiere[2]} 日`;
    else if (data.premiere.length === 4)
        premiere.innerHTML += `${data.premiere[0]} 年 ${data.premiere[1]} 月、${data.premiere[2]} 年 ${data.premiere[3]} 月`;
    else premiere.innerHTML += data.premiere.join(", ");
    list.appendChild(premiere);
    const myselfBBS = document.createElement("li");
    myselfBBS.innerHTML =
        "MyselfBBS: " +
        `<a href="javascript:window.parent.openExternal('http://myself-bbs.com/thread-${data.id}-1-1.html')">http://myself-bbs.com/thread-${data.id}-1-1.html</a>`;
    list.appendChild(myselfBBS);
    document.querySelector("#info").appendChild(list);

    const epsodesHTML = Object.keys(data.episodes)
        .map(
            (ep, i) => `
    <div class="episode" data-ep="${(i + 1).toString().padStart(3, "0")}">
        <div class="status">=</div>
        <span class="ep-title">${ep}</span><br />
        <span class="watched"></span>
    </div>
    `,
        )
        .join("");
    document.querySelector("#episodes").innerHTML = epsodesHTML;

    [...document.querySelectorAll(".episode")].forEach((node) => {
        node.addEventListener("click", () => {
            const ep = node.dataset.ep;
            window.parent.openPlayer(`/anime/${data.id}/${ep}/index.m3u8`);
        });
    });
    [...document.querySelectorAll(".status")].forEach((node) => {
        node.addEventListener("click", (evt) => {
            evt.stopPropagation();
            const ep = node.parentElement.dataset.ep;
            const name = node.parentElement.querySelector(".ep-title").innerHTML;
            manage(ep, name);
        });
    });

    document.querySelector("#title").style.opacity = 1;
    document.querySelector("#description").style.opacity = 1;
    document.querySelector("#image").style.opacity = 1;
    document.querySelector("#info").style.opacity = 1;
    document.querySelector("#episodes").style.opacity = 1;

    time();
    setStatus();
}

async function time() {
    let history = await fetch(`/history/${id}/`).then((r) => {
        if (r.ok) return r.json();
        else return null;
    });

    const nodes = [...document.querySelectorAll(".episode")];

    nodes.forEach((node) => {
        const ep = node.dataset.ep;
        const elm = node.querySelector(".watched");

        const time = history ? history[ep] : null;
        if (time) {
            const hours = Math.floor(time / 3600);
            const minutes = Math.floor((time % 3600) / 60);
            const seconds = Math.floor(time % 60);
            if (hours > 0) {
                elm.innerHTML = `上次觀看至 ${hours} 小時 ${minutes} 分 ${seconds} 秒`;
            } else if (minutes > 0) {
                elm.innerHTML = `上次觀看至 ${minutes} 分 ${seconds} 秒`;
            } else {
                elm.innerHTML = `上次觀看至 ${seconds} 秒`;
            }
        } else {
            elm.innerHTML = "未有觀看紀錄";
        }
    });
}

async function setStatus() {
    let s = await fetch("/downloaded.json").then((r) => r.json());

    if (!s[id]) return;

    const nodes = [...document.querySelectorAll(".episode")];

    nodes.forEach((node) => {
        const st = node.querySelector(".status");
        const ep = node.dataset.ep;
        const status = s[id].find((x) => x.ep === ep);
        if (status) {
            const { ep, downloaded, total } = status;
            if (downloaded === total) {
                st.innerHTML = "V";
                st.style.color = "#7eff95";
            } else {
                st.innerHTML = ((downloaded / total) * 100).toFixed(0) + "%";
                st.style.color = "#ffc559";
            }
        } else {
            st.innerHTML = "U";
            st.style.color = "";
        }
    });
}

function manage(ep, name) {
    const node = document.querySelector(`.episode[data-ep="${ep}"] .status`);
    if (node.innerHTML === "V") {
        document.querySelector("#popup-content").innerHTML = `確定到刪除 ${name} 的檔案？︁`;
        openPopup(async () => {
            await delFile(ep);
            await new Promise((resolve) => setTimeout(resolve, 500));
            await setStatus();
        });
    } else if (node.innerHTML === "U" && node.dataset.dl !== "true") {
        node.dataset.dl = "true";
        node.innerHTML = "0%";
        fetch(`/anime/${id}/${ep}/index.m3u8`).then(() => {
            for (let i = 1; i <= 6; i++) {
                setTimeout(setStatus, i * 5000);
            }
        });
    }
}

async function delFile(ep) {
    await fetch(`/api/del/${id}/${ep}`);
}

async function openPopup(func = async () => {}) {
    const popup = document.querySelector("#popup");
    const confirm = document.querySelector("#popup-confirm");
    const cancel = document.querySelector("#popup-cancel");
    confirm.disabled = false;
    cancel.disabled = false;

    popup.style.display = "block";
    popup.style.opacity = 1;
    cancel.onclick = () => {
        confirm.disabled = true;
        cancel.disabled = true;
        popup.style.opacity = 0;
        setTimeout(() => {
            popup.style.display = "none";
        }, 300);
    };
    confirm.onclick = async () => {
        confirm.disabled = true;
        cancel.disabled = true;
        await func();
        popup.style.opacity = 0;
        setStatus();
        setTimeout(() => {
            popup.style.display = "none";
        }, 300);
    };
}
