getConfig();

document.querySelector("#save").addEventListener("click", saveConfig);
document.querySelector("#reset").addEventListener("click", reset);

async function getConfig() {
    const config = await fetch("/config.json").then((r) => r.json());
    const { storage, port } = config;
    document.querySelector("#storage").value = storage;
    document.querySelector("#port").value = port;
}

async function saveConfig() {
    const storage = document.querySelector("#storage").value;
    const port = document.querySelector("#port").value;
    await fetch("/config.json", {
        method: "POST",
        body: JSON.stringify({ storage, port }),
    });
    getConfig();
}

async function reset() {
    await fetch("/reset");
    getConfig();
}
