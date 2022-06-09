<script setup lang="ts">
import { onMounted, provide, reactive, ref } from "vue";
import AnimeDetail from "./components/AnimeDetail.vue";
import Fade from "./components/Fade.vue";
import Nav from "./components/Nav.vue";
import Player from "./components/Player.vue";
import { check_ready } from "./composables/ready";
import raw_config, { default_endpoint } from "./config";

const ready = ref(false);
const detail_selected = ref(0);
const player_hidden = ref(true);
const player_vid = ref("");
const player_ep = ref("");
const config = reactive(raw_config);

provide("detail_selected", detail_selected);
provide("player_vid", player_vid);
provide("player_ep", player_ep);
provide("player_hidden", player_hidden);

onMounted(() => {
    check_ready(ready);
});
</script>

<template>
    <Nav class="h-12" />

    <div class="h-[calc(100%-3rem)] w-full overflow-y-auto">
        <router-view v-if="ready" v-slot="{ Component }">
            <Fade>
                <component :is="Component" />
            </Fade>
        </router-view>
    </div>

    <Fade>
        <AnimeDetail
            v-if="detail_selected !== 0"
            :id="detail_selected"
            :class="['z-20']"
            @close="detail_selected = 0"
        />
    </Fade>

    <Fade>
        <Player
            v-show="!player_hidden"
            :vid="player_vid"
            :ep="player_ep"
            :class="['z-30']"
            @close="player_hidden = true"
            @enter_pip="player_hidden = true"
            @leave_pip="player_hidden = false"
        />
    </Fade>

    <Fade>
        <div v-if="!ready" class="absolute top-0 left-0 z-50 h-full w-full bg-slate-800">
            <div class="flex h-full w-full items-center justify-center">
                <p class="text-lg">
                    <span>Connecting to {{ config.backend }} ...</span>
                    <input
                        type="text"
                        :value="config.backend"
                        @keyup.enter="
                            (event) => {
                                if(event.target) {
                                    config.backend = (event.target as HTMLInputElement).value;
                                }
                            }
                        "
                        title="press enter key to apply"
                        class="mt-4 mb-2 block w-80 rounded-lg border border-gray-600 bg-transparent px-4 py-2 transition-all hover:border-gray-400 focus:border-gray-400 focus:outline-none"
                    />
                    <span
                        @click="config.backend = default_endpoint"
                        class="cursor-pointer text-white/50"
                        >default: {{ default_endpoint }}
                    </span>
                </p>
            </div>
        </div>
    </Fade>
</template>

<style>
* {
    @apply relative text-white;
}
html,
body,
#app {
    @apply m-0 h-full w-full bg-slate-800 p-0;
}

#app {
    @apply flex flex-col;
}

.vjs-button > .vjs-icon-placeholder {
    top: -14px;
}
</style>
