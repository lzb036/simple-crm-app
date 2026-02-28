import App from './App.vue'
import uviewPlus from 'uview-plus'
import { createPinia } from 'pinia'
import i18n from './locales/index'

// #ifndef VUE3
import Vue from 'vue'
import './uni.promisify.adaptor'
Vue.config.productionTip = false
App.mpType = 'app'
const app = new Vue({
  ...App
})
app.$mount()
// #endif

// #ifdef VUE3
import { createSSRApp, type App as AppType } from 'vue'

export function createApp(): { app: AppType } {
  const app = createSSRApp(App)
  const pinia = createPinia()

  app.use(pinia)
  app.use(uviewPlus)
  app.use(i18n)

  return {
    app
  }
}
// #endif
