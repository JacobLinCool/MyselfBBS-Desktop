<script setup lang="ts">
import { spacing } from "pangu";
import { Ref, inject, onBeforeUnmount, onMounted, reactive } from "vue";
import { get, post, store } from "../composables/api";
import config from "../config";
import { Anime } from "../types";
import Fade from "./Fade.vue";

const props = defineProps<{
    id: number;
}>();
const emit = defineEmits<{
    (event: "close"): void;
}>();

const info: Anime = reactive({
    id: 0,
    title: "",
    category: [] as string[],
    premiere: [] as number[],
    ep: 0,
    author: "",
    website: "",
    description: "",
    image: "",
    episodes: {} as Record<string, [string, string]>,
});

const status: Record<string, { watched: number; downloaded: number }> = reactive({});

const player_vid = inject<Ref<string>>("player_vid");
const player_ep = inject<Ref<string>>("player_ep");
const player_hidden = inject<Ref<boolean>>("player_hidden");

let timer: ReturnType<typeof setTimeout> | undefined;

function close(payload: MouseEvent) {
    if (payload.target === payload.currentTarget) {
        emit("close");
    }
}

async function get_data() {
    const info_res = store("info", { id: props.id });
    const status_res = store("status", { id: props.id });

    const info_data = await (await info_res).json();
    Object.assign(info, info_data);

    const status_data = await (await status_res).json();
    Object.assign(status, status_data);
}

function open_external(url: string) {
    let options = "height=700, width=1035, autoHideMenuBar=true, frame=true, nodeIntegration=no";
    window.open(url, "_blank", options);
}

function play(vid: string, ep: string) {
    if (player_vid && player_ep && player_hidden) {
        player_vid.value = vid;
        player_ep.value = ep;
        player_hidden.value = false;
    }
}

function delete_file(vid: string, ep: string) {
    const comfirm = window.confirm("Are you sure you want to delete this file?");
    if (comfirm) {
        post(`${vid}/${ep}/delete`);
    }
}

function delete_history(vid: string, ep: string) {
    const comfirm = window.confirm("Are you sure you want to delete this history?");
    if (comfirm) {
        post(`${vid}/${ep}/unwatch`);
    }
}

function prepare(vid: string, ep: string) {
    get(`${vid}/${ep}/index.m3u8`);
}

function second_to_time(second: number): string {
    second = Math.floor(second);
    const hour = Math.floor(second / 3600);
    const minute = Math.floor((second % 3600) / 60);
    const second_ = second % 60;

    return hour
        ? `${hour} 小時 ${minute} 分 ${second_} 秒`
        : minute
        ? `${minute} 分 ${second_} 秒`
        : `${second_} 秒`;
}

onMounted(() => {
    get_data();
    timer = setInterval(() => get_data(), 3000);
});

onBeforeUnmount(() => {
    if (timer) {
        clearInterval(timer);
        timer = undefined;
    }
});
</script>

<template>
    <div
        class="backdrop-blur-1 fixed flex h-full w-full justify-center bg-gray-900/60"
        @click="close"
    >
        <Fade>
            <div
                v-if="info.id !== 0"
                class="mt-16 h-[calc(100%-4rem)] w-full max-w-[900px] overflow-y-auto rounded-t-lg bg-gray-900 p-6"
            >
                <div class="text-lg sm:text-xl md:text-2xl">{{ info.title }}</div>
                <div class="flex flex-col items-center sm:flex-row sm:items-start">
                    <div class="h-[400px] w-[300px] p-[25px]">
                        <img
                            :src="`${config.backend}/store/cover?id=${info.id}`"
                            class="rounded-md"
                        />
                    </div>
                    <div class="flex-1 p-[25px]">
                        <p class="mb-4">{{ spacing(info.description) }}</p>
                        <ul>
                            <li>作品類型： {{ info.category.join(" / ") }}</li>
                            <li>原著作者： {{ info.author }}</li>
                            <li>
                                首播日期：
                                {{
                                    !Array.isArray(info.premiere) || info.premiere.length <= 1
                                        ? "未知"
                                        : info.premiere.length === 2
                                        ? `${info.premiere[0]} 年 ${info.premiere[1]} 月`
                                        : info.premiere.length === 3
                                        ? `${info.premiere[0]} 年 ${info.premiere[1]} 月 ${info.premiere[2]} 日`
                                        : `${info.premiere[0]} 年 ${info.premiere[1]} 月、${info.premiere[2]} 年 ${info.premiere[3]} 月`
                                }}
                            </li>
                            <li>播出集數： {{ info.ep ? `${info.ep} 集` : "未定" }}</li>
                            <li>
                                官方網站：
                                <a
                                    v-if="info.website"
                                    href="javascript:void(0)"
                                    @click="open_external(info.website)"
                                >
                                    {{ info.website }}
                                </a>
                                <span v-else>很抱歉，沒有這種東西</span>
                            </li>
                            <li>
                                MyselfBBS：
                                <a
                                    href="javascript:void(0)"
                                    @click="
                                        open_external(
                                            `http://myself-bbs.com/thread-${info.id}-1-1.html`,
                                        )
                                    "
                                >
                                    http://myself-bbs.com/thread-{{ info.id }}-1-1.html
                                </a>
                            </li>
                        </ul>
                    </div>
                </div>
                <div></div>
                <div>
                    <div v-for="key in Object.keys(info.episodes)" :key="key">
                        <div
                            class="flex h-12 w-full cursor-pointer items-center p-2 transition-all hover:rounded-lg hover:bg-white/20"
                            @click="play(info.episodes[key][0], info.episodes[key][1])"
                        >
                            <h2
                                :class="[
                                    'flex-1',
                                    'transition-all',
                                    status[info.episodes[key][1]]?.downloaded === 1
                                        ? 'text-emerald-500'
                                        : status[info.episodes[key][1]]?.downloaded > 0
                                        ? 'text-yellow-500'
                                        : 'text-white',
                                ]"
                                style="word-break: keep-all"
                            >
                                {{ key }}
                            </h2>

                            <span
                                v-if="status[info.episodes[key][1]]?.downloaded > 0"
                                class="rounded-full bg-sky-400/10 px-2 py-1 text-sky-400/60 transition-all"
                                @click="(event: MouseEvent) => {
                                    event.stopPropagation();
                                    status[info.episodes[key][1]]?.downloaded === 1
                                        ? delete_file(info.episodes[key][0], info.episodes[key][1])
                                        : prepare(info.episodes[key][0], info.episodes[key][1]);
                                }"
                            >
                                {{ (status[info.episodes[key][1]]?.downloaded * 100).toFixed(0) }}%
                            </span>
                            <span
                                v-else
                                class="rounded-full bg-fuchsia-400/10 px-2 py-1 text-fuchsia-400/60 transition-all"
                                @click="(event: MouseEvent) => {
                                    event.stopPropagation();
                                    prepare(info.episodes[key][0], info.episodes[key][1]);
                                }"
                            >
                                下載
                            </span>

                            <span
                                v-if="status[info.episodes[key][1]]?.watched"
                                class="ml-2 text-slate-500"
                                @click="(event: MouseEvent) => {
                                    event.stopPropagation();
                                    delete_history(info.episodes[key][0], info.episodes[key][1]);
                                }"
                            >
                                <span class="hidden text-slate-500 sm:inline">已觀看</span>
                                {{ second_to_time(status[info.episodes[key][1]].watched) }}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </Fade>
    </div>
</template>
