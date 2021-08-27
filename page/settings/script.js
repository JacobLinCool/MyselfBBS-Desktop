getConfig();

document.querySelector("#save").addEventListener("click", saveConfig);
document.querySelector("#reset").addEventListener("click", reset);

async function getConfig() {
    const config = await fetch("/config.json").then((r) => r.json());
    const { storage, port, font } = config;
    document.querySelector("#storage").value = storage;
    document.querySelector("#port").value = port;
    document.querySelector("#font").value = font;
}

async function saveConfig() {
    const storage = document.querySelector("#storage").value;
    const port = document.querySelector("#port").value;
    const font = document.querySelector("#font").value;
    await fetch("/config.json", {
        method: "POST",
        body: JSON.stringify({ storage, port, font }),
    });
    getConfig();
}

async function reset() {
    await fetch("/reset");
    getConfig();
}
