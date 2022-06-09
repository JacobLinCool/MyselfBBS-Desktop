const config: Record<string, string> = localStorage.getItem("config")
    ? JSON.parse(localStorage.getItem("config") as string)
    : {
          backend: `${window.location.protocol}//${window.location.hostname}:${
              window.location.search.toLowerCase().includes("dev") ? 29621 : 29620
          }`,
      };

const proxy = new Proxy(config, {
    get(target, prop) {
        if (typeof prop === "string") {
            return target[prop];
        } else {
            return undefined;
        }
    },
    set(target, prop, value) {
        if (typeof prop === "string") {
            target[prop] = value;
            localStorage.setItem("config", JSON.stringify(config));
            return true;
        } else {
            return false;
        }
    },
});

console.log("config", proxy);

export default proxy;

export const default_endpoint = `${window.location.protocol}//${window.location.hostname}:${
    window.location.search.toLowerCase().includes("dev") ? 29621 : 29620
}`;
