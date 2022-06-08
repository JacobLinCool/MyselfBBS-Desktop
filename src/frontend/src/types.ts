export interface Anime {
    id: number;
    title: string;
    category: string[];
    premiere: number[];
    ep: number;
    author: string;
    website: string;
    description: string;
    image: string;
    episodes: Record<string, [string, string]>;
}
