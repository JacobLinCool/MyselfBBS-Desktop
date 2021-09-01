getConfig();

document.querySelector("#save").addEventListener("click", saveConfig);
document.querySelector("#reset").addEventListener("click", reset);
document.querySelector("#reload").addEventListener("click", reload);

async function getConfig() {
    const config = await fetch("/config.json").then((r) => r.json());
    const { storage, port, font, autoRemove, autoRemoveTime, FVL } = config;
    document.querySelector("#storage").value = storage;
    document.querySelector("#port").value = port;
    document.querySelector("#font").value = font;
    document.querySelector("#autoRemove").checked = autoRemove;
    document.querySelector("#autoRemoveTime").value = autoRemoveTime;
    document.querySelector("#FVL").value = FVL;
}

async function saveConfig() {
    document.querySelector("#save").disabled = true;
    const storage = document.querySelector("#storage").value;
    const port = +document.querySelector("#port").value;
    const font = document.querySelector("#font").value;
    const autoRemove = document.querySelector("#autoRemove").checked;
    const autoRemoveTime = +document.querySelector("#autoRemoveTime").value;
    const FVL = +document.querySelector("#FVL").value;
    await fetch("/config.json", {
        method: "POST",
        body: JSON.stringify({ storage, port, font, autoRemove, autoRemoveTime, FVL }),
    });
    await getConfig();
    document.querySelector("#save").disabled = false;
}

async function reset() {
    document.querySelector("#reset").disabled = true;
    await fetch("/reset");
    await getConfig();
    document.querySelector("#reset").disabled = false;
}

async function reload() {
    document.querySelector("#reload").disabled = true;
    await fetch("/reload");
    document.querySelector("#reload").disabled = false;
}
