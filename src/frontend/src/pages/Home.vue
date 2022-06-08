<script lang="ts" setup>
import { reactive } from "vue";
import AnimeList from "../components/AnimeList.vue";
import Fade from "../components/Fade.vue";
import { Anime } from "../types";

const recent: Anime[] = reactive([]);
const downloaded: Anime[] = reactive([]);

get_list();

async function get_list() {
    const recent_res = fetch("/api/util/recent");
    const downloaded_res = fetch("/api/util/downloaded");

    const recent_data = await (await recent_res).json();
    recent.splice(0, recent.length, ...recent_data.list);

    const downloaded_data = await (await downloaded_res).json();
    downloaded.splice(0, downloaded.length, ...downloaded_data.list);
}
</script>

<template>
    <div class="p-4">
        <div class="mb-4">
            <h1 class="mb-4 text-2xl">繼續觀賞</h1>
            <div class="w-full overflow-x-auto">
                <div :style="{ width: recent.length * 260 + 'px', minWidth: '100%' }">
                    <Fade>
                        <AnimeList
                            v-show="recent.length"
                            :list="recent"
                            class="grid-cols-[repeat(auto-fit,minmax(225px,1fr))]"
                        />
                    </Fade>
                </div>
            </div>
        </div>

        <!-- 
        <div class="mb-4">
            <h1 class="mb-4 text-2xl">你可能會喜歡</h1>
            <AnimeList :list="[]" />
        </div>
        <div class="mb-4">
            <h1 class="mb-4 text-2xl">近期熱門</h1>
            <AnimeList :list="[]" />
        </div> 
        -->

        <div class="mb-4">
            <h1 class="mb-4 text-2xl">已下載</h1>
            <div class="w-full overflow-x-auto">
                <div :style="{ width: downloaded.length * 260 + 'px', minWidth: '100%' }">
                    <Fade>
                        <AnimeList
                            v-show="downloaded.length"
                            :list="downloaded"
                            class="grid-cols-[repeat(auto-fit,minmax(225px,1fr))]"
                        />
                    </Fade>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped></style>
