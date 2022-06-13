export function copy<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
}

export function sleep<T>(ms: number, val?: T): Promise<T> {
    return new Promise<T>((resolve) => setTimeout(() => resolve(val), ms));
}

export async function retry<T>(func: () => T | Promise<T>, max = 3): Promise<T> {
    let i = 0;
    while (i < max) {
        i++;
        try {
            return await func();
        } catch (err) {
            if (i === max) {
                throw err;
            }
        }
    }
}
