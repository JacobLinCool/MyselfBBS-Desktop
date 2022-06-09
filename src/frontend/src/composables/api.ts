import config from "../config";

export function store(
    method: "airing" | "completed" | "details" | "search" | "info" | "status" | "cover",
    args: Record<string, string | number | boolean> = {},
) {
    return fetch(`${config.backend}/store/${method}?${query(args).toString()}`);
}

export function util(
    action: "suggestion" | "recent" | "downloaded",
    args: Record<string, string | number | boolean> = {},
) {
    return fetch(`${config.backend}/util/${action}?${query(args).toString()}`);
}

export function get(path: string, args: Record<string, string | number | boolean> = {}) {
    return fetch(`${config.backend}/${path}?${query(args).toString()}`);
}

export function post(path: string, args: Record<string, string | number | boolean> = {}) {
    return fetch(`${config.backend}/${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(args),
    });
}

function query(args: Record<string, string | number | boolean>) {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(args)) {
        query.append(key, value.toString());
    }
    return query;
}
