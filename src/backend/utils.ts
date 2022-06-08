export function copy<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
}

export function sleep<T>(ms: number, val?: T): Promise<T> {
    return new Promise<T>((resolve) => setTimeout(() => resolve(val), ms));
}
