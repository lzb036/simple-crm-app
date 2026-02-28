<template>
  <view :class="['page', themeClass]" :key="`customer-detail-${appStore.language}`">
    <!-- Header -->
    <view class="header" :style="headerStyle">
      <view class="header-content">
        <view class="back-btn" @click="handleBack">
          <u-icon name="arrow-left" size="24" color="var(--t-primary)"></u-icon>
        </view>
        <text class="header-title">{{ t('customer.viewDetail') }}</text>
        <view class="placeholder"></view>
      </view>
    </view>

    <!-- Content -->
    <scroll-view scroll-y class="scroll-content" :style="scrollContentStyle">
      <!-- Loading state -->
      <view v-if="loading" class="loading-wrapper">
        <u-loading-icon mode="circle" size="60" color="var(--c-main)"></u-loading-icon>
        <text class="loading-text">{{ t('common.loading') }}</text>
      </view>

      <view v-else-if="customer" class="content">
        <!-- Personal Info Card -->
        <view class="card">
          <view class="card-title">
            <u-icon name="account" size="20" color="var(--c-main)"></u-icon>
            <text>{{ t('customer.personalInfo') }}</text>
          </view>
          <view class="card-body">
            <view class="info-row">
              <text class="info-label">{{ t('customer.name') }}</text>
              <text class="info-value">{{ customer.name }}</text>
            </view>
            <view class="info-row">
              <text class="info-label">{{ t('customer.phone') }}</text>
              <text class="info-value">{{ customer.phone }}</text>
            </view>
            <view class="info-row">
              <text class="info-label">{{ t('customer.gender') }}</text>
              <view class="gender-badge" :class="getGenderClass(customer.gender)">
                {{ getGenderLabel(customer.gender) }}
              </view>
            </view>
            <view v-if="customer.age" class="info-row">
              <text class="info-label">{{ t('customer.age') }}</text>
              <text class="info-value">{{ customer.age }}</text>
            </view>
          </view>
        </view>

        <!-- Referrer Card -->
        <view v-if="customer.referrerName" class="card">
          <view class="card-title">
            <u-icon name="account-fill" size="20" color="var(--c-main)"></u-icon>
            <text>{{ t('customer.referrer') }}</text>
          </view>
          <view class="card-body">
            <view class="info-row">
              <text class="info-label">{{ t('customer.referrer') }}</text>
              <text class="info-value">{{ customer.referrerName }}</text>
            </view>
          </view>
        </view>

        <!-- Time Info Card -->
        <view class="card">
          <view class="card-title">
            <u-icon name="clock" size="20" color="var(--c-main)"></u-icon>
            <text>{{ t('customer.timeInfo') }}</text>
          </view>
          <view class="card-body">
            <view class="info-row">
              <text class="info-label">{{ t('customer.createdAt') }}</text>
              <text class="info-value">{{ formatTime(customer.birthDate) }}</text>
            </view>
            <view class="info-row">
              <text class="info-label">{{ t('customer.updatedAt') }}</text>
              <text class="info-value">{{ formatTime(customer.createdAt) }}</text>
            </view>
          </view>
        </view>
      </view>
    </scroll-view>

    <!-- 底部按钮栏 -->
    <view v-if="customer" class="bottom-bar">
      <view class="call-btn" @click="handleCall">
        <u-icon name="phone-fill" size="20" color="#FFFFFF"></u-icon>
        <text class="call-btn-text">{{ t('customer.callPhone') }}</text>
      </view>
      <view class="view-phone-btn" @click="handleViewPhone">
        <u-icon name="eye" size="20" color="#FFFFFF"></u-icon>
        <text class="view-phone-text">{{ t('customer.viewPhone') }}</text>
      </view>
    </view>

    <!-- 手机号弹窗 -->
    <u-popup :show="phonePopupVisible" mode="center" :round="16" :close-on-click-overlay="true" @close="phonePopupVisible = false">
      <view class="phone-popup">
        <view class="popup-title">{{ t('customer.phoneNumber') }}</view>
        <view class="popup-phone">{{ phoneNumber || '***' }}</view>
        <view class="popup-actions">
          <view class="copy-btn" @click="handleCopyPhone">
            <u-icon name="file-text" size="18" color="var(--c-main)"></u-icon>
            <text>{{ t('common.copy') }}</text>
          </view>
        </view>
      </view>
    </u-popup>

    <u-modal
      :show="deviceAuthPopupVisible"
      :title="t('customer.deviceAuthTitle')"
      :show-cancel-button="true"
      :confirm-text="t('common.confirm')"
      :cancel-text="t('common.cancel')"
      custom-class="theme-modal"
      confirm-color="var(--c-main)"
      cancel-color="var(--t-regular)"
      @confirm="handleDeviceAuthConfirm"
      @cancel="handleDeviceAuthCancel"
    >
      <view class="modal-device-auth-content">
        <u-icon name="lock-fill" size="40rpx" color="var(--c-main)"></u-icon>
        <text class="modal-device-auth-text">{{ t('customer.deviceAuthConfirm') }}</text>
      </view>
    </u-modal>
  </view>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue'
import { onLoad, onUnload } from '@dcloudio/uni-app'
import { useI18n } from 'vue-i18n'
import { useAppStore } from '@/store/app'
import { useUserStore } from '@/store/user'
import CustomerAPI from '@/api/modules/customer'
import { isDeviceUnauthorizedError, isPhoneImeiGenerateFailedError } from '@/utils/api-error'
import type { CustomerRecord } from '@/types/api'

const { t, locale } = useI18n()
const appStore = useAppStore()
const userStore = useUserStore()

const themeClass = computed(() => appStore.theme)
const statusBarHeight = uni.getSystemInfoSync().statusBarHeight || 0
const headerStyle = {
  paddingTop: `${statusBarHeight}px`
}
const scrollContentStyle = {
  paddingTop: `calc(88rpx + ${statusBarHeight}px)`
}
const customer = ref<CustomerRecord | null>(null)
const loading = ref(false)
const phonePopupVisible = ref(false)
const phoneNumber = ref('')
const customerId = ref('')
const deviceAuthPopupVisible = ref(false)
let deviceAuthConfirmResolver: ((confirmed: boolean) => void) | null = null

onUnmounted(() => {
  resolveDeviceAuthConfirm(false)
})

onUnload(() => {
  resolveDeviceAuthConfirm(false)
})

// 使用 onLoad 获取页面参数
onLoad((options) => {
  console.log('[客户详情] onLoad 参数:', options)

  if (!userStore.isLoggedIn()) {
    uni.reLaunch({
      url: '/pages/login/index'
    })
    return
  }

  if (options?.id) {
    customerId.value = options.id
    loadCustomerDetail(options.id)
  } else {
    console.error('[客户详情] 缺少 id 参数')
    uni.showToast({
      title: t('customer.paramError'),
      icon: 'none'
    })
    setTimeout(() => {
      uni.navigateBack()
    }, 1500)
  }
})

const loadCustomerDetail = async (id: string): Promise<void> => {
  loading.value = true
  try {
    customer.value = await CustomerAPI.getDetail(id)
  } catch (error) {
    console.error('[客户详情] 获取详情失败:', error)
    uni.showToast({
      title: t('customer.getDetailFailed'),
      icon: 'none'
    })
    setTimeout(() => {
      uni.navigateBack()
    }, 1500)
  } finally {
    loading.value = false
  }
}

const handleBack = (): void => {
  uni.navigateBack()
}

const getGenderClass = (gender: string): string => {
  const genderMap: Record<string, string> = {
    'M': 'male',
    'F': 'female',
    'U': 'unknown'
  }
  return genderMap[gender] || 'unknown'
}

const getGenderLabel = (gender: string): string => {
  return t(`customer.gender_${gender}`)
}

const formatDate = (dateStr: string): string => {
  if (!dateStr) return '-'
  return dateStr.split(' ')[0]
}

const formatTime = (timestamp: string): string => {
  if (!timestamp) return '-'
  return timestamp
}

function resolveDeviceAuthConfirm(confirmed: boolean): void {
  deviceAuthPopupVisible.value = false
  if (deviceAuthConfirmResolver) {
    deviceAuthConfirmResolver(confirmed)
    deviceAuthConfirmResolver = null
  }
}

function showDeviceAuthConfirmPopup(): Promise<boolean> {
  return new Promise((resolve) => {
    deviceAuthConfirmResolver = resolve
    deviceAuthPopupVisible.value = true
  })
}

function handleDeviceAuthConfirm(): void {
  resolveDeviceAuthConfirm(true)
}

function handleDeviceAuthCancel(): void {
  resolveDeviceAuthConfirm(false)
}

const handleCall = async (): Promise<void> => {
  if (!customerId.value) return

  try {
    const phone = await CustomerAPI.getPhone(customerId.value, 'dial', showDeviceAuthConfirmPopup)

    // 显示确认弹窗
    uni.showModal({
      title: t('customer.confirmCall'),
      content: locale.value === 'zh-CN'
        ? `是否拨打 ${phone}？`
        : `Call ${phone}?`,
      confirmText: t('customer.dial'),
      cancelText: t('common.cancel'),
      success: (res) => {
        if (res.confirm) {
          // 用户确认后拨打电话
          uni.makePhoneCall({
            phoneNumber: phone,
            success: () => {
              console.log('[拨打电话] 成功')
            },
            fail: (err: any) => {
              console.error('[拨打电话] 失败:', err)
              uni.showToast({
                title: t('customer.callFailed'),
                icon: 'none'
              })
            }
          })
        }
      }
    })
  } catch (error) {
    console.error('[拨打电话] 获取手机号失败:', error)
    if (isDeviceUnauthorizedError(error) || isPhoneImeiGenerateFailedError(error)) {
      return
    }
    uni.showToast({
      title: t('customer.getPhoneFailed'),
      icon: 'none'
    })
  }
}

const handleViewPhone = async (): Promise<void> => {
  if (!customerId.value) return

  try {
    phoneNumber.value = await CustomerAPI.getPhone(customerId.value, 'app_view', showDeviceAuthConfirmPopup)
    phonePopupVisible.value = true
  } catch (error) {
    console.error('[查看手机] 获取失败:', error)
    if (isDeviceUnauthorizedError(error) || isPhoneImeiGenerateFailedError(error)) {
      return
    }
    uni.showToast({
      title: t('customer.getPhoneFailed'),
      icon: 'none'
    })
  }
}

const handleCopyPhone = (): void => {
  if (!phoneNumber.value) return

  uni.setClipboardData({
    data: phoneNumber.value,
    success: () => {
      uni.showToast({
        title: t('common.copySuccess'),
        icon: 'success'
      })
      phonePopupVisible.value = false
    }
  })
}

const handleCallFromPopup = async (): Promise<void> => {
  if (!phoneNumber.value) return

  uni.makePhoneCall({
    phoneNumber: phoneNumber.value,
    success: () => {
      console.log('[拨打电话] 成功')
      phonePopupVisible.value = false
    },
    fail: (err: any) => {
      console.error('[拨打电话] 失败:', err)
      uni.showToast({
        title: t('customer.callFailed'),
        icon: 'none'
      })
    }
  })
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background-color: var(--c-bg);
  display: flex;
  flex-direction: column;
}

.page.light {
  --c-bg: #F4F6F8;
  --c-card: #FFFFFF;
  --c-main: #4F46E5;
  --t-primary: #111827;
  --t-regular: #4B5563;
  --t-light: #9CA3AF;
  --c-border: #F3F4F6;
  --c-divider: rgba(0, 0, 0, 0.06);
}

.page.dark {
  --c-bg: #0B0F19;
  --c-card: #111827;
  --c-main: #6366F1;
  --t-primary: #F9FAFB;
  --t-regular: #9CA3AF;
  --t-light: #6B7280;
  --c-border: #1F2937;
  --c-divider: rgba(255, 255, 255, 0.06);
}

/* Header */
.header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  background: var(--c-card);
  border-bottom: 1rpx solid var(--c-divider);
  z-index: 100;
  padding-top: 0;
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 32rpx;
  min-height: 88rpx;
}

.back-btn {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: background-color 0.2s;
}

.back-btn:active {
  background-color: var(--c-border);
}

.header-title {
  font-size: 32rpx;
  font-weight: 600;
  color: var(--t-primary);
}

.placeholder {
  width: 64rpx;
}

/* Scroll Content */
.scroll-content {
  flex: 1;
  padding-top: 88rpx;
}

.content {
  padding: 24rpx;
  padding-top: 24rpx;
  padding-bottom: 250rpx;
  margin-top: 40rpx;
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

/* Card */
.card {
  background-color: var(--c-card);
  border-radius: 24rpx;
  padding: 32rpx;
  box-shadow: 0 4rpx 24rpx rgba(0, 0, 0, 0.06);
}

.card-title {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 24rpx;
  padding-bottom: 20rpx;
  border-bottom: 1rpx solid var(--c-divider);
  font-size: 30rpx;
  font-weight: 600;
  color: var(--t-primary);
}

.card-body {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.info-label {
  font-size: 28rpx;
  color: var(--t-light);
  flex-shrink: 0;
}

.info-value {
  font-size: 28rpx;
  color: var(--t-regular);
  text-align: right;
  flex: 1;
  margin-left: 32rpx;
  word-break: break-all;
}

.gender-badge {
  padding: 8rpx 20rpx;
  border-radius: 8rpx;
  font-size: 24rpx;
  font-weight: 500;
  flex-shrink: 0;
}

.gender-badge.male {
  background-color: rgba(59, 130, 246, 0.1);
  color: #3B82F6;
}

.gender-badge.female {
  background-color: rgba(236, 72, 153, 0.1);
  color: #EC4899;
}

.gender-badge.unknown {
  background-color: rgba(156, 163, 175, 0.1);
  color: #9CA3AF;
}

.remark-content {
  font-size: 28rpx;
  color: var(--t-regular);
  line-height: 1.6;
}

/* Loading */
.loading-wrapper {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-height: 400rpx;
  gap: 24rpx;
}

.loading-text {
  font-size: 28rpx;
  color: var(--t-regular);
}

/* Bottom Bar */
.bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 24rpx 32rpx;
  padding-bottom: calc(24rpx + env(safe-area-inset-bottom));
  background: var(--c-card);
  border-top: 1rpx solid var(--c-divider);
  z-index: 99;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.call-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  height: 88rpx;
  background: #10B981;
  border-radius: 16rpx;
  transition: opacity 0.2s;
}

.call-btn:active {
  opacity: 0.8;
}

.call-btn-text {
  font-size: 30rpx;
  font-weight: 500;
  color: #FFFFFF;
}

.view-phone-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  height: 88rpx;
  background: var(--c-main);
  border-radius: 16rpx;
  transition: opacity 0.2s;
}

.view-phone-btn:active {
  opacity: 0.8;
}

.view-phone-text {
  font-size: 30rpx;
  font-weight: 500;
  color: #FFFFFF;
}

/* Phone Popup */
.phone-popup {
  width: 560rpx;
  padding: 48rpx 32rpx 32rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 32rpx;
}

.popup-title {
  font-size: 32rpx;
  font-weight: 600;
  color: var(--t-primary);
}

.popup-phone {
  font-size: 48rpx;
  font-weight: 600;
  color: var(--c-main);
  letter-spacing: 2rpx;
}

.popup-message {
  font-size: 28rpx;
  line-height: 1.5;
  color: var(--t-regular);
  text-align: center;
}

.popup-actions {
  width: 100%;
  display: flex;
  gap: 16rpx;
}

.call-popup-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  height: 80rpx;
  background: rgba(16, 185, 129, 0.1);
  border-radius: 12rpx;
  font-size: 28rpx;
  color: #10B981;
  transition: background-color 0.2s;
}

.call-popup-btn:active {
  background: rgba(16, 185, 129, 0.15);
}

.copy-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  height: 80rpx;
  background: rgba(79, 70, 229, 0.1);
  border-radius: 12rpx;
  font-size: 28rpx;
  color: var(--c-main);
  transition: background-color 0.2s;
}

.copy-btn:active {
  background: rgba(79, 70, 229, 0.15);
}

.modal-device-auth-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;
  padding: 10rpx 0 8rpx;
}

.modal-device-auth-text {
  font-size: 30rpx;
  line-height: 1.5;
  color: var(--t-regular);
  text-align: center;
}

::v-deep .theme-modal .u-popup__content {
  background: var(--c-card) !important;
  border: 2rpx solid var(--c-border);
  border-radius: 24rpx !important;
  backdrop-filter: blur(16rpx);
  box-shadow: 0 16rpx 40rpx rgba(0, 0, 0, 0.08);
}

::v-deep .theme-modal .u-modal {
  background: transparent;
}

::v-deep .theme-modal .u-modal__title {
  color: var(--t-primary);
}

::v-deep .theme-modal .u-modal__content__text {
  color: var(--t-regular);
}

::v-deep .theme-modal .u-line {
  border-color: var(--c-border) !important;
}

::v-deep .theme-modal .u-modal__button-group__wrapper--hover {
  background-color: var(--c-border);
}
</style>
