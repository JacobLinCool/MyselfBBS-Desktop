// eslint-disable-next-line import/no-unresolved
import "video.js/dist/video-js.css";
import "virtual:windi.css";
import { createApp } from "vue";
import App from "./App.vue";
import router from "./router";

const app = createApp(App);
app.use(router);
app.mount("#app");
