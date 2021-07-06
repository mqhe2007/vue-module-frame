import { createRouter, createWebHashHistory } from "vue-router";
import Home from "./pages/Home.vue";
export default createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: "/",
      name: "home",
      component: Home
    },
  ],
});
