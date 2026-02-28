import { createI18n } from 'vue-i18n'
import zh from './zh'
import en from './en'

const messages = {
  'zh-CN': zh,
  'en-US': en
}

const i18n = createI18n({
  legacy: false,
  locale: 'zh-CN',
  fallbackLocale: 'zh-CN',
  messages
})

export default i18n
