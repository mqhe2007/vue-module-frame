import vue from "@vitejs/plugin-vue";
import { name } from "./package.json";
import { resolve } from "path";
export default ({ command }) => {
  /**
   * @type {import('vite').UserConfig}
   */
  const config = {
    resolve: {
      alias: {
        "@": resolve(__dirname, "./src"),
      },
    },
    plugins: [vue()],
  };
  if (command === "build" && process.env.BUILD_MODULE === "1") {
    config.build = {
      sourcemap: true,
      lib: {
        entry: resolve(__dirname, "src/module.js"),
        // 格式必须为iife
        formats: ["iife"],
        name: name,
      },
      minify: false,
      rollupOptions: {
        // 为了使用同一vue对象，所有模块必须外置化vue
        external: ["vue"],
      },
    };
  }
  return config;
};