<script setup lang="ts">
const items: [string, string][] = [
    ["首頁", "/"],
    ["本季新番", "/airing"],
    ["完結動畫", "/completed"],
    ["搜尋", "/search"],
    ["設定", "/settings"],
];
</script>

<template>
    <div
        class="flex w-full items-center bg-slate-900 shadow-xl"
        style="-webkit-user-select: none; -webkit-app-region: drag"
    >
        <div
            v-for="(item, index) in items"
            :key="index"
            :class="[
                'mx-4',
                'text-sm',
                'md:text-lg',
                'transition-all',
                'duration-300',
                $route.path === item[1] ? 'text-lg md:text-xl' : 'hover:text-lg md:hover:text-xl',
            ]"
            style="-webkit-app-region: no-drag"
        >
            <router-link :to="item[1]" class="nav-link">
                {{ item[0] }}
            </router-link>
        </div>
    </div>
</template>
