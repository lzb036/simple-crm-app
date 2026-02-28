<template>
  <view :class="['qr-login-container', themeClass]">
    <!-- 顶部导航栏 -->
    <view class="nav-bar" :style="navBarStyle">
      <view class="nav-back" @click="handleBack">
        <text class="back-icon">←</text>
      </view>
      <view class="nav-title">{{ t('qrLogin.title') }}</view>
      <view class="nav-placeholder"></view>
    </view>

    <!-- 主要内容区域 -->
    <view class="content">
      <!-- 扫码阶段 -->
      <view v-if="scanStatus === ScanStatus.SCANNING" class="scan-section">
        <view class="scan-icon-wrapper">
          <text class="scan-icon">📷</text>
        </view>
        <text class="scan-tip">{{ t('qrLogin.scanTip') }}</text>
        <u-button
          type="primary"
          @click="handleScan"
          :custom-style="buttonStyle"
        >
          {{ t('qrLogin.scanButton') }}
        </u-button>
      </view>

      <!-- 确认阶段 -->
      <view v-else-if="scanStatus === ScanStatus.CONFIRMING" class="confirm-section">
        <view class="confirm-icon-wrapper">
          <text class="confirm-icon">🔐</text>
        </view>
        <text class="confirm-title">{{ t('qrLogin.confirmTitle') }}</text>
        <text class="confirm-tip">{{ t('qrLogin.confirmTip') }}</text>

        <view class="confirm-info">
          <text class="info-label">{{ t('qrLogin.deviceInfo') }}</text>
          <text class="info-value">PC / Web</text>
        </view>

        <view class="button-group">
          <u-button
            type="default"
            @click="handleCancel"
            :custom-style="cancelButtonStyle"
          >
            {{ t('common.cancel') }}
          </u-button>
          <u-button
            type="primary"
            @click="handleConfirm"
            :loading="submitting"
            :custom-style="confirmButtonStyle"
          >
            {{ t('common.confirm') }}
          </u-button>
        </view>
      </view>

      <!-- 成功阶段 -->
      <view v-else-if="scanStatus === ScanStatus.SUCCESS" class="success-section">
        <view class="success-icon-wrapper">
          <text class="success-icon">✓</text>
        </view>
        <text class="success-title">{{ t('qrLogin.successTitle') }}</text>
        <text class="success-tip">{{ t('qrLogin.successTip') }}</text>
        <u-button
          type="primary"
          @click="handleBack"
          :custom-style="buttonStyle"
        >
          {{ t('qrLogin.backButton') }}
        </u-button>
      </view>

      <!-- 失败阶段 -->
      <view v-else-if="scanStatus === ScanStatus.ERROR" class="error-section">
        <view class="error-icon-wrapper">
          <text class="error-icon">✕</text>
        </view>
        <text class="error-title">{{ t('qrLogin.errorTitle') }}</text>
        <text class="error-tip">{{ errorMessage || t('qrLogin.errorTip') }}</text>
        <u-button
          type="primary"
          @click="handleRescan"
          :custom-style="buttonStyle"
        >
          {{ t('qrLogin.rescanButton') }}
        </u-button>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAppStore } from '@/store/app'
import { useUserStore } from '@/store/user'
import QrLoginAPI from '@/api/modules/qr-login'

const { t } = useI18n()
const appStore = useAppStore()
const userStore = useUserStore()

// 扫码状态枚举
enum ScanStatus {
  SCANNING = 'scanning',    // 扫码中
  CONFIRMING = 'confirming', // 确认中
  SUCCESS = 'success',      // 成功
  ERROR = 'error'           // 失败
}

// 状态变量
const scanStatus = ref<ScanStatus>(ScanStatus.SCANNING)
const submitting = ref(false)
const errorMessage = ref('')
const currentQrCode = ref('')
const getAppToken = (): string => {
  const storeToken = userStore.token
  if (storeToken) return storeToken
  const savedToken = uni.getStorageSync('user_token') || uni.getStorageSync('token')
  return typeof savedToken === 'string' ? savedToken : ''
}

// 样式计算
const themeClass = computed(() => appStore.theme)
const statusBarHeight = uni.getSystemInfoSync().statusBarHeight || 0
const navBarStyle = {
  paddingTop: `calc(16rpx + ${statusBarHeight}px)`
}

const buttonStyle = computed(() => ({
  width: '100%',
  height: '88rpx',
  borderRadius: '16rpx',
  fontSize: '32rpx',
  fontWeight: '500',
  backgroundColor: 'var(--c-main)',
  border: 'none'
}))

const confirmButtonStyle = computed(() => ({
  flex: 1,
  height: '88rpx',
  borderRadius: '16rpx',
  fontSize: '32rpx',
  fontWeight: '500',
  backgroundColor: 'var(--c-main)',
  border: 'none'
}))

const cancelButtonStyle = computed(() => ({
  flex: 1,
  height: '88rpx',
  borderRadius: '16rpx',
  fontSize: '32rpx',
  fontWeight: '500',
  backgroundColor: 'var(--c-border)',
  color: 'var(--t-primary)',
  border: 'none'
}))

// 返回上一页
const handleBack = (): void => {
  uni.navigateBack()
}

// 扫描二维码
const handleScan = (): void => {
  // #ifdef APP-PLUS || MP-WEIXIN
  uni.scanCode({
    success: (res) => {
      console.log('[扫码登录] uni.scanCode 完整返回:', res)
      processQrCode(res.result)
    },
    fail: (err) => {
      console.error('[扫码登录] 扫码失败:', err)
      showError(t('qrLogin.scanFailed'))
    }
  })
  // #endif

  // #ifdef H5
  // H5 环境模拟扫码（实际应用中需要使用 web 扫码库）
  uni.showModal({
    title: t('qrLogin.h5TipTitle'),
    content: t('qrLogin.h5TipContent'),
    editable: true,
    placeholderText: t('qrLogin.qrCodePlaceholder'),
    success: (res) => {
      if (res.confirm && res.content) {
        processQrCode(res.content.trim())
      }
    }
  })
  // #endif
}

// 处理二维码内容
const processQrCode = (qrCode: string): void => {
  if (!qrCode || qrCode.trim().length === 0) {
    showError(t('qrLogin.invalidQrCode'))
    return
  }

  const trimmedCode = qrCode.trim()

  // 如果是 URL 格式（如 dengine://qrlogin?code=xxx），提取 code 参数
  if (trimmedCode.includes('://') && trimmedCode.includes('?code=')) {
    try {
      const url = new URL(trimmedCode)
      const codeParam = url.searchParams.get('code')
      if (codeParam) {
        currentQrCode.value = codeParam
        console.log('[扫码登录] 提取的 qrCode:', codeParam)
        scanStatus.value = ScanStatus.CONFIRMING
        return
      }
    } catch {
      // URL 解析失败，尝试正则匹配
      const match = trimmedCode.match(/[?&]code=([^&]+)/)
      if (match && match[1]) {
        currentQrCode.value = match[1]
        console.log('[扫码登录] 提取的 qrCode:', match[1])
        scanStatus.value = ScanStatus.CONFIRMING
        return
      }
    }
    showError(t('qrLogin.invalidQrCode'))
    return
  }

  // 直接使用二维码内容
  currentQrCode.value = trimmedCode
  console.log('[扫码登录] 提取的 qrCode:', trimmedCode)
  scanStatus.value = ScanStatus.CONFIRMING
}

// 确认登录
const handleConfirm = async (): Promise<void> => {
  if (!currentQrCode.value) {
    showError(t('qrLogin.invalidQrCode'))
    return
  }

  submitting.value = true
  try {
    const appToken = getAppToken()
    await QrLoginAPI.submit(currentQrCode.value, appToken)
    scanStatus.value = ScanStatus.SUCCESS
  } catch (error: any) {
    console.error('[扫码登录] 确认失败:', error)
    const message = error?.message || error?.msg || t('qrLogin.submitFailed')
    showError(message)
  } finally {
    submitting.value = false
  }
}

// 取消登录
const handleCancel = async (): Promise<void> => {
  if (!currentQrCode.value) {
    handleRescan()
    return
  }

  try {
    await QrLoginAPI.cancel(currentQrCode.value)
  } catch (error) {
    console.error('[扫码登录] 取消失败:', error)
  }

  handleRescan()
}

// 重新扫码
const handleRescan = (): void => {
  currentQrCode.value = ''
  errorMessage.value = ''
  scanStatus.value = ScanStatus.SCANNING
}

// 显示错误状态
const showError = (message: string): void => {
  errorMessage.value = message
  scanStatus.value = ScanStatus.ERROR
}
</script>

<style scoped>
.qr-login-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: var(--c-bg);
}

.qr-login-container.light {
  --c-bg: #F5F7FA;
  --c-card: #FFFFFF;
  --c-main: #2563EB;
  --c-main-light: #EFF6FF;
  --t-primary: #1F2937;
  --t-regular: #6B7280;
  --t-secondary: #9CA3AF;
  --c-border: #E5E7EB;
  --c-shadow: rgba(0, 0, 0, 0.06);
}

.qr-login-container.dark {
  --c-bg: #0F172A;
  --c-card: #1E293B;
  --c-main: #3B82F6;
  --c-main-light: #1E3A5F;
  --t-primary: #F1F5F9;
  --t-regular: #94A3B8;
  --t-secondary: #64748B;
  --c-border: #334155;
  --c-shadow: rgba(0, 0, 0, 0.25);
}

/* 导航栏 */
.nav-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 32rpx 40rpx;
  padding-bottom: 24rpx;
  background-color: var(--c-bg);
}

.nav-back {
  width: 64rpx;
  height: 64rpx;
  border-radius: 16rpx;
  background-color: var(--c-card);
  border: 2rpx solid var(--c-border);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.nav-back:active {
  transform: scale(0.92);
  background-color: var(--c-border);
}

.back-icon {
  font-size: 32rpx;
  font-weight: 600;
  color: var(--t-primary);
}

.nav-title {
  flex: 1;
  text-align: center;
  font-size: 36rpx;
  font-weight: 700;
  color: var(--t-primary);
}

.nav-placeholder {
  width: 64rpx;
}

/* 内容区域 */
.content {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 60rpx 40rpx;
}

/* 扫码阶段 */
.scan-section,
.confirm-section,
.success-section,
.error-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 32rpx;
  width: 100%;
}

/* 图标容器 */
.scan-icon-wrapper,
.confirm-icon-wrapper,
.success-icon-wrapper,
.error-icon-wrapper {
  width: 160rpx;
  height: 160rpx;
  border-radius: 50%;
  background-color: var(--c-card);
  border: 4rpx solid var(--c-border);
  display: flex;
  align-items: center;
  justify-content: center;
}

.scan-icon,
.confirm-icon {
  font-size: 80rpx;
}

.success-icon {
  font-size: 80rpx;
  color: #10B981;
  font-weight: 700;
}

.error-icon {
  font-size: 80rpx;
  color: #EF4444;
  font-weight: 700;
}

/* 文字样式 */
.scan-tip,
.confirm-tip,
.success-tip,
.error-tip {
  font-size: 28rpx;
  color: var(--t-regular);
  text-align: center;
  line-height: 1.6;
}

.confirm-title,
.success-title,
.error-title {
  font-size: 36rpx;
  font-weight: 700;
  color: var(--t-primary);
}

/* 确认信息卡片 */
.confirm-info {
  width: 100%;
  padding: 32rpx;
  background-color: var(--c-card);
  border-radius: 16rpx;
  border: 2rpx solid var(--c-border);
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.info-label {
  font-size: 26rpx;
  color: var(--t-secondary);
}

.info-value {
  font-size: 32rpx;
  font-weight: 600;
  color: var(--t-primary);
}

/* 按钮组 */
.button-group {
  display: flex;
  gap: 24rpx;
  width: 100%;
}
</style>
