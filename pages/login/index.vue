<template>
  <view :class="['login-container', themeClass]" @touchmove.stop.prevent>
    <view class="bg-layer">
      <view class="bg-orb orb-main"></view>
      <view class="bg-orb orb-accent"></view>
      <view class="bg-orb orb-soft"></view>
      <view class="bg-grid"></view>
    </view>

    <view class="top-bar" :style="topBarStyle">
      <view class="switch-group">
        <view class="switch-btn" @click="handleLanguageToggle">
          <text class="switch-icon">{{ appStore.language === 'zh-CN' ? 'CN' : 'EN' }}</text>
        </view>
        <view class="switch-btn" @click="handleThemeToggle">
          <text class="switch-icon">{{ appStore.theme === 'light' ? '☀️' : '🌙' }}</text>
        </view>
        <view class="switch-btn" @click="handleBaseURLSetting">
          <text class="switch-icon">URL</text>
        </view>
      </view>
    </view>

    <view class="content-wrap">
      <view class="form-panel" :style="formPanelStyle">
        <view class="form-group">
          <text class="input-label">{{ t('login.username') }}</text>
          <view class="input-wrap">
            <u-input
              v-model="formData.username"
              :placeholder="t('login.usernamePlaceholder')"
              border="none"
              :custom-style="inputStyle"
              :placeholder-style="placeholderStyle"
              clearable
            />
          </view>
        </view>

        <view class="form-group">
          <text class="input-label">{{ t('login.password') }}</text>
          <view class="input-wrap">
            <u-input
              v-model="formData.password"
              :type="showPassword ? 'text' : 'password'"
              :placeholder="t('login.passwordPlaceholder')"
              border="none"
              :custom-style="inputStyle"
              :placeholder-style="placeholderStyle"
              :password-visibility-toggle="false"
            />
            <view class="password-toggle" @click="showPassword = !showPassword">
              <u-icon :name="showPassword ? 'eye-fill' : 'eye-off'" size="36rpx" color="var(--t-secondary)"></u-icon>
            </view>
          </view>
        </view>

        <u-button
          type="primary"
          :loading="loading"
          :loading-text="t('login.loggingIn')"
          :custom-style="buttonStyle"
          @click="handleLogin"
        >
          {{ t('login.loginButton') }}
        </u-button>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useAppStore } from '@/store/app'
import { useUserStore } from '@/store/user'
import { useI18n } from 'vue-i18n'
import AuthAPI from '@/api/modules/auth'
import UserAPI from '@/api/modules/user'
import { encryptWithPublicKey } from '@/utils/rsa'

interface LoginFormData {
  username: string
  password: string
  rememberMe: boolean
}

const appStore = useAppStore()
const userStore = useUserStore()
const { t, locale } = useI18n()

const themeClass = computed(() => appStore.theme)
const statusBarHeight = uni.getSystemInfoSync().statusBarHeight || 0
const topBarStyle = {
  paddingTop: `calc(26rpx + ${statusBarHeight}px)`
}

const loading = ref(false)
const showPassword = ref(false)
const keyboardHeight = ref(0)
let keyboardHeightHandler: ((res: { height?: number }) => void) | null = null

const formData = ref<LoginFormData>({
  username: '',
  password: '',
  rememberMe: false
})

const formPanelStyle = computed(() => {
  if (keyboardHeight.value <= 0) {
    return {}
  }

  const shift = Math.min(Math.max(keyboardHeight.value * 0.62, 140), 360)
  return {
    transform: `translateY(-${shift}px)`
  }
})

const inputStyle = computed(() => ({
  backgroundColor: 'transparent',
  border: 'none',
  padding: '30rpx 0',
  fontSize: '32rpx',
  color: 'var(--t-primary)'
}))

const placeholderStyle = computed(() => ({
  color: 'var(--t-secondary)'
}))

const buttonStyle = computed(() => ({
  width: '100%',
  height: '100rpx',
  borderRadius: '22rpx',
  fontSize: '31rpx',
  fontWeight: '600',
  marginTop: '28rpx',
  background: 'linear-gradient(135deg, var(--c-main) 0%, var(--c-main-2) 100%)',
  border: 'none',
  boxShadow: '0 16rpx 34rpx var(--c-main-shadow)'
}))

watch(() => appStore.language, (newLang: string) => {
  locale.value = newLang
})

onMounted(() => {
  if (typeof uni.onKeyboardHeightChange !== 'function') {
    return
  }

  keyboardHeightHandler = (res: { height?: number }) => {
    keyboardHeight.value = Number(res?.height || 0)
  }

  uni.onKeyboardHeightChange(keyboardHeightHandler)
})

onUnmounted(() => {
  if (keyboardHeightHandler && typeof uni.offKeyboardHeightChange === 'function') {
    uni.offKeyboardHeightChange(keyboardHeightHandler)
  }
  keyboardHeightHandler = null
})

const handleThemeToggle = (): void => {
  appStore.toggleTheme()
}

const handleLanguageToggle = (): void => {
  appStore.toggleLanguage()
}

const handleBaseURLSetting = (): void => {
  uni.navigateTo({
    url: '/pages/baseurl/index'
  })
}

const handleLogin = async (): Promise<void> => {
  if (!formData.value.username) {
    uni.showToast({
      title: t('login.usernameRequired'),
      icon: 'none'
    })
    return
  }

  if (!formData.value.password) {
    uni.showToast({
      title: t('login.passwordRequired'),
      icon: 'none'
    })
    return
  }

  loading.value = true

  console.log('[登录] 开始登录，请求参数:', {
    username: formData.value.username
  })

  try {
    const publicKey = await AuthAPI.getPublicKey(true)
    if (!publicKey) {
      uni.showToast({
        title: 'Failed to load public key',
        icon: 'none'
      })
      return
    }

    let encryptedPassword = ''
    try {
      encryptedPassword = encryptWithPublicKey(publicKey, formData.value.password)
    } catch (error) {
      console.error('[login] password encryption failed', error)
      uni.showToast({
        title: 'Password encryption failed',
        icon: 'none'
      })
      return
    }

    const response = await AuthAPI.login({
      username: formData.value.username,
      password: encryptedPassword,
      rememberMe: false,
      mode: 'none',
      authToken: ''
    })

    console.log('[登录] 登录成功，响应:', response)

    const accessToken = response.accessToken || response.token || ''
    if (!accessToken) {
      throw new Error('登录响应中缺少 access token')
    }

    userStore.setAccessToken({
      accessToken,
      accessTokenExpireTime: response.accessTokenExpireTime,
      refreshTokenExpireTime: response.refreshTokenExpireTime ?? null,
      header: response.header
    })
    console.log('[登录] access token已存储:', accessToken)

    try {
      const userInfo = await UserAPI.getUserInfo()
      console.log('[登录] 获取用户信息成功:', userInfo)
      userStore.setUserInfo({
        id: userInfo.id,
        username: userInfo.username,
        nickname: userInfo.nickname,
        realname: userInfo.realname,
        email: userInfo.email,
        avatar: '',
        roles: userInfo.roles
      })
    } catch (userError) {
      console.error('[登录] 获取用户信息失败:', userError)
      userStore.setUserInfo({
        id: response.userId,
        username: formData.value.username,
        realname: response.realName
      })
    }

    uni.showToast({
      title: t('login.loginSuccess'),
      icon: 'success'
    })

    setTimeout(() => {
      uni.reLaunch({
        url: '/pages/index/index'
      })
    }, 1000)
  } catch (error) {
    console.error('[登录] 登录失败，错误:', error)
    uni.showToast({
      title: t('login.loginFailed'),
      icon: 'none'
    })
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-container {
  min-height: 100vh;
  height: 100vh;
  position: fixed;
  inset: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.login-container.light {
  --c-bg: #f4f7ff;
  --c-bg-2: #edf2ff;
  --c-main: #3f62ff;
  --c-main-2: #5e7dff;
  --c-main-shadow: rgba(63, 98, 255, 0.35);
  --c-accent: #17b3ff;
  --c-card: rgba(255, 255, 255, 0.76);
  --c-card-border: rgba(255, 255, 255, 0.86);
  --c-input: rgba(255, 255, 255, 0.86);
  --c-input-border: rgba(126, 154, 255, 0.22);
  --t-primary: #0f172a;
  --t-regular: #475569;
  --t-secondary: #94a3b8;
  --t-weak: #7c8bb0;
  --c-shadow: rgba(29, 41, 83, 0.14);
}

.login-container.dark {
  --c-bg: #070d1a;
  --c-bg-2: #0a1428;
  --c-main: #5a8bff;
  --c-main-2: #7ea0ff;
  --c-main-shadow: rgba(90, 139, 255, 0.34);
  --c-accent: #1cb4ff;
  --c-card: rgba(12, 22, 41, 0.78);
  --c-card-border: rgba(98, 122, 172, 0.28);
  --c-input: rgba(15, 27, 48, 0.82);
  --c-input-border: rgba(98, 122, 172, 0.4);
  --t-primary: #f8fbff;
  --t-regular: #c6d2ea;
  --t-secondary: #8fa4c9;
  --t-weak: #7a90b7;
  --c-shadow: rgba(0, 0, 0, 0.4);
}

.bg-layer {
  position: absolute;
  inset: 0;
  background: linear-gradient(160deg, var(--c-bg) 0%, var(--c-bg-2) 100%);
}

.bg-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(8rpx);
}

.orb-main {
  width: 620rpx;
  height: 620rpx;
  top: -140rpx;
  right: -180rpx;
  background: radial-gradient(circle, rgba(91, 123, 255, 0.42) 0%, rgba(91, 123, 255, 0) 72%);
}

.orb-accent {
  width: 420rpx;
  height: 420rpx;
  bottom: 160rpx;
  left: -120rpx;
  background: radial-gradient(circle, rgba(33, 184, 255, 0.34) 0%, rgba(33, 184, 255, 0) 74%);
}

.orb-soft {
  width: 320rpx;
  height: 320rpx;
  top: 46%;
  right: 15%;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.24) 0%, rgba(255, 255, 255, 0) 76%);
}

.bg-grid {
  position: absolute;
  inset: 0;
  opacity: 0.34;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.18) 1rpx, transparent 1rpx),
    linear-gradient(90deg, rgba(255, 255, 255, 0.16) 1rpx, transparent 1rpx);
  background-size: 42rpx 42rpx;
}

.top-bar {
  position: relative;
  z-index: 2;
  display: flex;
  justify-content: flex-end;
  padding: 24rpx 34rpx 0;
}

.switch-group {
  display: flex;
  gap: 14rpx;
}

.switch-btn {
  width: 66rpx;
  height: 66rpx;
  border-radius: 18rpx;
  border: 2rpx solid rgba(255, 255, 255, 0.24);
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(10rpx);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 10rpx 18rpx rgba(0, 0, 0, 0.08);
  transition: all 0.18s ease;
}

.switch-btn:active {
  transform: scale(0.92);
}

.switch-icon {
  font-size: 24rpx;
  font-weight: 700;
  color: var(--t-primary);
}

.content-wrap {
  position: relative;
  z-index: 2;
  flex: 1;
  padding: 120rpx 52rpx 92rpx;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.form-panel {
  width: 100%;
  max-width: 660rpx;
  display: flex;
  flex-direction: column;
  gap: 34rpx;
  margin-top: -56rpx;
  transition: transform 0.22s ease;
  will-change: transform;
}

.form-group {
  margin-bottom: 0;
}

.input-label {
  display: block;
  font-size: 26rpx;
  color: var(--t-weak);
  margin-bottom: 14rpx;
  letter-spacing: 0.6rpx;
}

.input-wrap {
  min-height: 104rpx;
  padding: 0 30rpx;
  border-radius: 22rpx;
  border: 2rpx solid var(--c-input-border);
  background: var(--c-input);
  display: flex;
  align-items: center;
  transition: all 0.2s ease;
}

.password-toggle {
  width: 62rpx;
  height: 62rpx;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.password-toggle:active {
  background: rgba(120, 138, 180, 0.16);
}

.input-wrap:focus-within {
  border-color: rgba(103, 133, 255, 0.66);
  box-shadow: 0 0 0 4rpx rgba(103, 133, 255, 0.12);
}

::v-deep .u-input {
  color: var(--t-primary) !important;
  font-size: 30rpx !important;
}

::v-deep .uni-input-input {
  color: var(--t-primary) !important;
}

::v-deep .u-input__content__clear .u-icon__icon,
::v-deep .u-input__content__subfix-icon .u-icon__icon,
::v-deep .u-input__right-icon .u-icon {
  color: var(--t-secondary) !important;
}
</style>
