import { createRouter, createWebHashHistory } from 'vue-router'
import AdminView from './views/AdminView.vue'
import OrdersView from './views/OrdersView.vue'
import SettingsView from './views/SettingsView.vue'
import ShopView from './views/ShopView.vue'

export const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', component: ShopView },
    {
      path: '/admin',
      component: AdminView,
      children: [
        { path: '', component: OrdersView },
        { path: 'settings', component: SettingsView },
      ],
    },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})
