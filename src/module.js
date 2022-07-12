import * as Vue from "vue";
import { name } from "../package.json";
import { useModule } from "vue-module-loader";
import router from "./router";
import App from "./App.vue";
// 导出模块定义对象
export default {
  name,
  install(
    /**
     * @type {import('vue-module-loader/src/interfaces').Context}
     */
    ctx
  ) {
    ctx.Vue = Vue;
    const app = Vue.createApp(App);
    // 主框架实例化后应存储在上下文对象中供其他模块安装时使用
    ctx.app = app;
    app.use(router);
    app.mount("#app");
    // 加载远程模块
    useModule(
      "http://static.mengqinghe.com/vml/module/vue-module-module.iife.js"
    );
  },
};
