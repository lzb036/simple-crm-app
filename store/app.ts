import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

export type ThemeMode = 'light' | 'dark'
export type LanguageMode = 'zh-CN' | 'en-US'

// 类型守卫函数
function isThemeMode(value: unknown): value is ThemeMode {
  return value === 'light' || value === 'dark'
}

function isLanguageMode(value: unknown): value is LanguageMode {
  return value === 'zh-CN' || value === 'en-US'
}

export const useAppStore = defineStore('app', () => {
  const theme = ref<ThemeMode>('light')
  const language = ref<LanguageMode>('zh-CN')

  const setTheme = (newTheme: ThemeMode): void => {
    theme.value = newTheme
  }

  const setLanguage = (newLanguage: LanguageMode): void => {
    language.value = newLanguage
  }

  const toggleTheme = (): void => {
    const newTheme: ThemeMode = theme.value === 'light' ? 'dark' : 'light'
    setTheme(newTheme)
  }

  const toggleLanguage = (): void => {
    const newLanguage: LanguageMode = language.value === 'zh-CN' ? 'en-US' : 'zh-CN'
    setLanguage(newLanguage)
  }

  const initTheme = (): void => {
    try {
      const savedTheme = uni.getStorageSync('app_theme')
      const savedLanguage = uni.getStorageSync('app_language')

      if (isThemeMode(savedTheme)) {
        theme.value = savedTheme
      }
      if (isLanguageMode(savedLanguage)) {
        language.value = savedLanguage
      }
    } catch {
      // 存储读取失败，静默处理
    }
  }

  watch(theme, (newTheme: ThemeMode) => {
    try {
      uni.setStorageSync('app_theme', newTheme)
    } catch {
      // 存储写入失败，静默处理
    }
  })

  watch(language, (newLanguage: LanguageMode) => {
    try {
      uni.setStorageSync('app_language', newLanguage)
    } catch {
      // 存储写入失败，静默处理
    }
  })

  return {
    theme,
    language,
    setTheme,
    setLanguage,
    toggleTheme,
    toggleLanguage,
    initTheme
  }
})

// 持久化配置
export const piniaPluginPersistedstate = {
  key: 'app-store',
  paths: ['theme', 'language']
}
