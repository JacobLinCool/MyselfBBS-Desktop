export interface Anime {
    id: number;
    title: string;
    category: string[];
    premiere: [number, number, number];
    ep: number;
    author: string;
    website: string;
    description: string;
    image: string;
    episodes: Record<string, [string, string]>;
}

export interface RawList {
    meta: { time: number; length: number };
    data: {
        id: number;
        title: string;
        link: string;
        ep: number;
        image: string;
        watch: number;
    }[];
}

export interface Config {
    port: number;
    storage: string;
}
