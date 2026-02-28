<template>
  <view :class="['baseurl-container', themeClass]">
    <view class="bg-layer">
      <view class="bg-orb orb-main"></view>
      <view class="bg-orb orb-accent"></view>
      <view class="bg-orb orb-soft"></view>
      <view class="bg-grid"></view>
    </view>

    <view class="navbar" :style="navbarStyle">
      <view class="navbar-content">
        <view class="tool-btn" @click="handleGoBack">
          <u-icon name="arrow-left" size="22" color="var(--t-primary)"></u-icon>
        </view>
        <text class="nav-title">{{ t('baseurl.title') }}</text>
        <view class="tool-btn" @click="showAddPopup = true">
          <u-icon name="plus" size="20" color="var(--t-primary)"></u-icon>
        </view>
      </view>
    </view>

    <view class="content">
      <view class="current-card">
        <view class="card-header">
          <view class="header-main">
            <text class="header-title">{{ t('baseurl.current') }}</text>
            <text class="header-subtitle">{{ t('baseurl.title') }}</text>
          </view>
          <view class="current-badge">{{ t('baseurl.using') }}</view>
        </view>
        <view class="current-url">
          <text class="url-text">{{ currentURL || DEFAULT_BASE_URL }}</text>
        </view>
      </view>

      <view class="list-section">
        <view class="section-header">
          <view class="section-title-wrap">
            <text class="section-title">{{ t('baseurl.savedList') }}</text>
            <text class="section-count">{{ baseURLList.length }}</text>
          </view>
        </view>

        <view v-if="baseURLList.length === 0" class="empty-state">
          <view class="empty-badge">URL</view>
          <text class="empty-text">{{ t('baseurl.noSaved') }}</text>
        </view>

        <view v-else class="url-list">
          <view
            v-for="item in baseURLList"
            :key="item.id"
            :class="['url-item', { active: item.url === currentURL }]"
            @click="handleSelectURL(item)"
          >
            <view class="url-dot"></view>
            <view class="url-info">
              <view class="url-header">
                <text class="url-name">{{ item.name }}</text>
                <view v-if="item.url === currentURL" class="active-badge">
                  <text class="badge-text">{{ t('baseurl.active') }}</text>
                </view>
              </view>
              <text class="url-address">{{ item.url }}</text>
            </view>
            <view class="url-arrow">
              <u-icon name="arrow-right" size="14" color="var(--t-secondary)"></u-icon>
            </view>
            <view v-if="!item.isDefault && item.url !== currentURL" class="url-delete" @click.stop="handleDeleteURL(item)">
              <u-icon name="trash" size="18" color="var(--t-secondary)"></u-icon>
            </view>
          </view>
        </view>
      </view>
    </view>

    <view v-if="showTestingModal" class="testing-overlay" @touchmove.stop.prevent>
      <view class="testing-modal">
        <view class="testing-content">
          <u-loading-icon size="48" mode="circle" color="var(--c-main)"></u-loading-icon>
          <text class="testing-title">{{ t('baseurl.testingTitle') }}</text>
          <text class="testing-current">{{ testingCurrentName }}</text>
        </view>
      </view>
    </view>

    <u-popup :show="showAddPopup" mode="center" :round="24" :close-on-click-overlay="true" @close="handleClosePopup">
      <view class="add-popup">
        <view class="popup-header">
          <text class="popup-title">{{ t('baseurl.addNew') }}</text>
          <text class="popup-subtitle">{{ t('baseurl.title') }}</text>
        </view>

        <view class="popup-body">
          <view class="form-group">
            <text class="form-label">{{ t('baseurl.nameLabel') }}</text>
            <u-input
              v-model="newItem.name"
              :placeholder="t('baseurl.namePlaceholder')"
              border="none"
              :custom-style="inputStyle"
              :placeholder-style="placeholderStyle"
            />
          </view>

          <view class="form-group">
            <text class="form-label">{{ t('baseurl.urlLabel') }}</text>
            <u-input
              v-model="newItem.url"
              :placeholder="t('baseurl.urlPlaceholder')"
              border="none"
              :custom-style="inputStyle"
              :placeholder-style="placeholderStyle"
            />
          </view>

          <u-button
            type="primary"
            :loading="saving"
            :loading-text="t('common.loading')"
            :custom-style="buttonStyle"
            @click="handleAddURL"
          >
            {{ t('baseurl.addButton') }}
          </u-button>
        </view>
      </view>
    </u-popup>

    <u-modal
      :show="showSwitchModal"
      :title="t('baseurl.switchTitle')"
      :show-cancel-button="true"
      :confirm-text="t('common.confirm')"
      :cancel-text="t('common.cancel')"
      custom-class="theme-modal"
      confirm-color="var(--c-main)"
      @confirm="handleConfirmSwitch"
      @cancel="showSwitchModal = false"
    >
      <view class="switch-modal-content">
        <view class="switch-info-row">
          <text class="switch-label">{{ t('baseurl.nameLabel') }}</text>
          <text class="switch-value">{{ selectedItem?.name }}</text>
        </view>
        <view class="switch-info-row">
          <text class="switch-label">{{ t('baseurl.urlLabel') }}</text>
          <text class="switch-value">{{ selectedItem?.url }}</text>
        </view>
      </view>
    </u-modal>

    <u-modal
      :show="showDeleteModal"
      :title="t('baseurl.deleteTitle')"
      :show-cancel-button="true"
      :confirm-text="t('common.confirm')"
      :cancel-text="t('common.cancel')"
      custom-class="theme-modal"
      confirm-color="#EF4444"
      @confirm="handleConfirmDelete"
      @cancel="showDeleteModal = false"
    >
      <view class="delete-modal-content">
        <view class="delete-info-row">
          <text class="delete-label">{{ t('baseurl.nameLabel') }}</text>
          <text class="delete-value">{{ deleteItem?.name }}</text>
        </view>
        <view class="delete-info-row">
          <text class="delete-label">{{ t('baseurl.urlLabel') }}</text>
          <text class="delete-value">{{ deleteItem?.url }}</text>
        </view>
        <view class="delete-warning">
          <text class="warning-text">{{ t('baseurl.deleteWarning') }}</text>
        </view>
      </view>
    </u-modal>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAppStore } from '@/store/app'
import {
  getCurrentBaseURL,
  getBaseURLList,
  addBaseURL,
  deleteBaseURL,
  switchBaseURL,
  validateURL,
  formatURL,
  DEFAULT_BASE_URL,
  type BaseURLItem
} from '@/utils/baseurl'

const { t } = useI18n()
const appStore = useAppStore()

const themeClass = computed(() => appStore.theme)
const statusBarHeight = uni.getSystemInfoSync().statusBarHeight || 0
const navbarStyle = {
  paddingTop: `calc(32rpx + ${statusBarHeight}px)`
}

// current baseURL
const currentURL = ref<string>('')

// baseURL list
const baseURLList = ref<BaseURLItem[]>([])

// dialog visibility
const showAddPopup = ref(false)
const showSwitchModal = ref(false)
const showDeleteModal = ref(false)

// selected switch item
const selectedItem = ref<BaseURLItem | null>(null)
// selected delete item
const deleteItem = ref<BaseURLItem | null>(null)

const showTestingModal = ref(false)
const testing = ref(false)
const testingCurrentName = ref('')

// new item
const newItem = ref({
  name: '',
  url: ''
})

// saving state
const saving = ref(false)

const inputStyle = computed(() => ({
  backgroundColor: 'var(--c-input)',
  borderRadius: '18rpx',
  padding: '24rpx',
  fontSize: '28rpx',
  color: 'var(--t-primary)',
  border: '2rpx solid var(--c-input-border)'
}))

const placeholderStyle = computed(() => ({
  color: 'var(--t-secondary)'
}))

const buttonStyle = computed(() => ({
  width: '100%',
  height: '92rpx',
  borderRadius: '18rpx',
  fontSize: '31rpx',
  fontWeight: '600',
  marginTop: '34rpx',
  background: 'linear-gradient(135deg, var(--c-main) 0%, var(--c-main-2) 100%)',
  border: 'none',
  boxShadow: '0 14rpx 32rpx var(--c-main-shadow)'
}))

onMounted(() => {
  loadData()
})

const loadData = () => {
  currentURL.value = getCurrentBaseURL()
  baseURLList.value = getBaseURLList()
}

const handleGoBack = () => {
  uni.navigateBack()
}

const handleClosePopup = () => {
  showAddPopup.value = false
  newItem.value = {
    name: '',
    url: ''
  }
}

const handleSelectURL = (item: BaseURLItem) => {
  if (item.url === currentURL.value) {
    return
  }
  selectedItem.value = item
  showSwitchModal.value = true
}

const handleConfirmSwitch = async () => {
  if (!selectedItem.value) return

  showSwitchModal.value = false

  testing.value = true
  showTestingModal.value = true
  testingCurrentName.value = selectedItem.value.name

  const result = await testConnection(selectedItem.value)

  showTestingModal.value = false
  testingCurrentName.value = ''

  if (result === 'success') {
    switchBaseURL(selectedItem.value.url)
    currentURL.value = selectedItem.value.url
    selectedItem.value = null

    uni.showToast({
      title: t('baseurl.switchSuccess'),
      icon: 'success'
    })
  } else {
    uni.showModal({
      title: t('baseurl.switchTestFailed'),
      content: t('baseurl.switchTestFailedMessage'),
      showCancel: false,
      confirmText: t('common.confirm')
    })
  }

  testing.value = false
}

const handleDeleteURL = (item: BaseURLItem) => {
  if (item.url === currentURL.value) {
    uni.showToast({
      title: t('baseurl.deleteCurrentNotAllowed'),
      icon: 'none'
    })
    return
  }

  deleteItem.value = item
  showDeleteModal.value = true
}

const handleConfirmDelete = () => {
  if (!deleteItem.value) return

  if (deleteItem.value.url === currentURL.value) {
    showDeleteModal.value = false
    deleteItem.value = null
    uni.showToast({
      title: t('baseurl.deleteCurrentNotAllowed'),
      icon: 'none'
    })
    return
  }

  deleteBaseURL(deleteItem.value.id)
  loadData()
  showDeleteModal.value = false
  deleteItem.value = null

  uni.showToast({
    title: t('baseurl.deleteSuccess'),
    icon: 'success'
  })
}

const handleAddURL = () => {
  if (!newItem.value.name) {
    uni.showToast({
      title: t('baseurl.nameRequired'),
      icon: 'none'
    })
    return
  }

  if (!newItem.value.url) {
    uni.showToast({
      title: t('baseurl.urlRequired'),
      icon: 'none'
    })
    return
  }

  const formattedURL = formatURL(newItem.value.url)

  if (!validateURL(formattedURL)) {
    uni.showToast({
      title: t('baseurl.urlInvalid'),
      icon: 'none'
    })
    return
  }

  const exists = baseURLList.value.some(item => item.url === formattedURL)
  if (exists) {
    uni.showToast({
      title: t('baseurl.urlExists'),
      icon: 'none'
    })
    return
  }

  saving.value = true

  try {
    addBaseURL(newItem.value.name, formattedURL)
    loadData()

    showAddPopup.value = false
    newItem.value = {
      name: '',
      url: ''
    }

    uni.showToast({
      title: t('baseurl.addSuccess'),
      icon: 'success'
    })
  } catch (error) {
    uni.showToast({
      title: t('common.error'),
      icon: 'none'
    })
  } finally {
    saving.value = false
  }
}

const testConnection = (item: BaseURLItem): Promise<'success' | 'error'> => {
  return new Promise((resolve) => {
    uni.request({
      url: `${item.url}/api/app/auth-manager/public-key`,
      method: 'HEAD',
      timeout: 5000,
      success: () => {
        resolve('success')
      },
      fail: () => {
        uni.request({
          url: `${item.url}/api/app/auth-manager/public-key`,
          method: 'GET',
          timeout: 5000,
          success: () => {
            resolve('success')
          },
          fail: () => {
            resolve('error')
          }
        })
      }
    })
  })
}
</script>

<style scoped>
.baseurl-container {
  min-height: 100vh;
  position: relative;
  overflow-x: hidden;
}

.baseurl-container.light {
  --c-bg: #f4f7ff;
  --c-bg-2: #edf2ff;
  --c-main: #3f62ff;
  --c-main-2: #5e7dff;
  --c-main-shadow: rgba(63, 98, 255, 0.34);
  --c-accent: #17b3ff;
  --c-card: rgba(255, 255, 255, 0.76);
  --c-card-border: rgba(255, 255, 255, 0.86);
  --c-input: rgba(255, 255, 255, 0.88);
  --c-input-border: rgba(126, 154, 255, 0.22);
  --t-primary: #0f172a;
  --t-regular: #475569;
  --t-secondary: #7b8fb2;
  --t-light: #8ea1c1;
  --c-divider: rgba(129, 153, 214, 0.24);
  --c-shadow: rgba(29, 41, 83, 0.16);
}

.baseurl-container.dark {
  --c-bg: #070d1a;
  --c-bg-2: #0a1428;
  --c-main: #5a8bff;
  --c-main-2: #7ea0ff;
  --c-main-shadow: rgba(90, 139, 255, 0.34);
  --c-accent: #1cb4ff;
  --c-card: rgba(12, 22, 41, 0.78);
  --c-card-border: rgba(98, 122, 172, 0.3);
  --c-input: rgba(15, 27, 48, 0.84);
  --c-input-border: rgba(98, 122, 172, 0.4);
  --t-primary: #f8fbff;
  --t-regular: #c6d2ea;
  --t-secondary: #89a0c6;
  --t-light: #7691bb;
  --c-divider: rgba(101, 125, 170, 0.36);
  --c-shadow: rgba(0, 0, 0, 0.34);
}

.bg-layer {
  position: fixed;
  inset: 0;
  z-index: 0;
  background: linear-gradient(160deg, var(--c-bg) 0%, var(--c-bg-2) 100%);
}

.bg-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(10rpx);
}

.orb-main {
  width: 620rpx;
  height: 620rpx;
  top: -150rpx;
  right: -200rpx;
  background: radial-gradient(circle, rgba(91, 123, 255, 0.42) 0%, rgba(91, 123, 255, 0) 74%);
}

.orb-accent {
  width: 420rpx;
  height: 420rpx;
  bottom: 120rpx;
  left: -120rpx;
  background: radial-gradient(circle, rgba(33, 184, 255, 0.32) 0%, rgba(33, 184, 255, 0) 76%);
}

.orb-soft {
  width: 320rpx;
  height: 320rpx;
  top: 46%;
  right: 14%;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.22) 0%, rgba(255, 255, 255, 0) 78%);
}

.bg-grid {
  position: absolute;
  inset: 0;
  opacity: 0.3;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.18) 1rpx, transparent 1rpx),
    linear-gradient(90deg, rgba(255, 255, 255, 0.16) 1rpx, transparent 1rpx);
  background-size: 42rpx 42rpx;
}

.navbar {
  position: relative;
  z-index: 3;
  padding: 24rpx 32rpx 4rpx;
}

.navbar-content {
  display: flex;
  align-items: center;
  gap: 14rpx;
  padding: 16rpx 18rpx;
  border-radius: 24rpx;
  border: 2rpx solid var(--c-card-border);
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(14rpx);
  box-shadow: 0 12rpx 28rpx rgba(0, 0, 0, 0.08);
}

.tool-btn {
  width: 68rpx;
  height: 68rpx;
  border-radius: 18rpx;
  border: 2rpx solid rgba(255, 255, 255, 0.22);
  background: rgba(255, 255, 255, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: transform 0.16s ease;
}

.tool-btn:active {
  transform: scale(0.94);
}

.nav-title {
  flex: 1;
  text-align: center;
  font-size: 32rpx;
  font-weight: 700;
  color: var(--t-primary);
  letter-spacing: 1rpx;
}

.content {
  position: relative;
  z-index: 2;
  padding: 16rpx 32rpx 56rpx;
}

.current-card,
.list-section {
  border-radius: 28rpx;
  border: 2rpx solid var(--c-card-border);
  background: var(--c-card);
  backdrop-filter: blur(16rpx);
  box-shadow: 0 18rpx 42rpx var(--c-shadow);
}

.current-card {
  padding: 30rpx;
  margin-bottom: 24rpx;
}

.card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16rpx;
  margin-bottom: 20rpx;
}

.header-main {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.header-title {
  font-size: 30rpx;
  font-weight: 700;
  color: var(--t-primary);
}

.header-subtitle {
  font-size: 24rpx;
  color: var(--t-secondary);
}

.current-badge {
  padding: 8rpx 20rpx;
  border-radius: 999rpx;
  background: linear-gradient(135deg, var(--c-main) 0%, var(--c-main-2) 100%);
  color: #ffffff;
  font-size: 22rpx;
  font-weight: 600;
  box-shadow: 0 8rpx 18rpx var(--c-main-shadow);
}

.current-url {
  padding: 22rpx;
  border-radius: 18rpx;
  border: 2rpx solid var(--c-input-border);
  background: var(--c-input);
}

.url-text {
  font-size: 26rpx;
  line-height: 1.5;
  color: var(--t-primary);
  word-break: break-all;
}

.list-section {
  padding: 26rpx;
}

.section-header {
  margin-bottom: 20rpx;
}

.section-title-wrap {
  display: inline-flex;
  align-items: center;
  gap: 12rpx;
}

.section-title {
  font-size: 30rpx;
  font-weight: 700;
  color: var(--t-primary);
}

.section-count {
  min-width: 42rpx;
  height: 42rpx;
  padding: 0 12rpx;
  border-radius: 999rpx;
  background: rgba(63, 98, 255, 0.14);
  color: var(--c-main);
  font-size: 24rpx;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.empty-state {
  padding: 56rpx 0 44rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14rpx;
}

.empty-badge {
  width: 92rpx;
  height: 92rpx;
  border-radius: 24rpx;
  background: rgba(63, 98, 255, 0.14);
  color: var(--c-main);
  font-size: 26rpx;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty-text {
  font-size: 26rpx;
  color: var(--t-secondary);
}

.url-list {
  display: flex;
  flex-direction: column;
  gap: 14rpx;
}

.url-item {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 20rpx 18rpx;
  border-radius: 18rpx;
  border: 2rpx solid var(--c-input-border);
  background: var(--c-input);
  transition: transform 0.16s ease, box-shadow 0.2s ease;
}

.url-item:active {
  transform: scale(0.985);
}

.url-item.active {
  border-color: rgba(88, 121, 255, 0.56);
  box-shadow: 0 10rpx 24rpx rgba(88, 121, 255, 0.2);
}

.url-dot {
  width: 14rpx;
  height: 14rpx;
  border-radius: 50%;
  background: var(--t-light);
  flex-shrink: 0;
}

.url-item.active .url-dot {
  background: var(--c-main);
  box-shadow: 0 0 0 8rpx rgba(88, 121, 255, 0.14);
}

.url-info {
  flex: 1;
  min-width: 0;
}

.url-header {
  display: flex;
  align-items: center;
  gap: 10rpx;
  margin-bottom: 8rpx;
}

.url-name {
  font-size: 28rpx;
  font-weight: 600;
  color: var(--t-primary);
}

.active-badge {
  padding: 4rpx 14rpx;
  border-radius: 999rpx;
  background: linear-gradient(135deg, var(--c-main) 0%, var(--c-main-2) 100%);
}

.badge-text {
  font-size: 20rpx;
  color: #ffffff;
}

.url-address {
  font-size: 24rpx;
  color: var(--t-regular);
  line-height: 1.45;
  word-break: break-all;
}

.url-arrow {
  width: 40rpx;
  display: flex;
  justify-content: center;
  flex-shrink: 0;
}

.url-delete {
  width: 56rpx;
  height: 56rpx;
  border-radius: 16rpx;
  border: 2rpx solid var(--c-input-border);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.url-delete:active {
  transform: scale(0.94);
}

.add-popup {
  width: 630rpx;
  border-radius: 26rpx;
  overflow: hidden;
  border: 2rpx solid var(--c-card-border);
  background: var(--c-card);
  backdrop-filter: blur(18rpx);
  box-shadow: 0 18rpx 44rpx var(--c-shadow);
}

.popup-header {
  padding: 30rpx 34rpx 22rpx;
  border-bottom: 2rpx solid var(--c-divider);
}

.popup-title {
  display: block;
  font-size: 32rpx;
  font-weight: 700;
  color: var(--t-primary);
  text-align: center;
}

.popup-subtitle {
  display: block;
  margin-top: 8rpx;
  font-size: 24rpx;
  color: var(--t-secondary);
  text-align: center;
}

.popup-body {
  padding: 30rpx 34rpx 34rpx;
}

.form-group {
  margin-bottom: 22rpx;
}

.form-label {
  display: block;
  margin-bottom: 14rpx;
  font-size: 26rpx;
  color: var(--t-regular);
}

.switch-modal-content,
.delete-modal-content {
  padding: 30rpx;
  display: flex;
  flex-direction: column;
  gap: 18rpx;
}

.switch-info-row,
.delete-info-row {
  display: flex;
  flex-direction: column;
  gap: 10rpx;
  padding: 18rpx;
  border-radius: 16rpx;
  border: 2rpx solid var(--c-input-border);
  background: var(--c-input);
}

.switch-label,
.delete-label {
  font-size: 24rpx;
  color: var(--t-secondary);
}

.switch-value,
.delete-value {
  font-size: 28rpx;
  color: var(--t-primary);
  font-weight: 600;
  word-break: break-all;
}

.delete-warning {
  margin-top: 4rpx;
  padding: 18rpx;
  border-radius: 14rpx;
  border: 2rpx solid rgba(239, 68, 68, 0.28);
  background: rgba(239, 68, 68, 0.08);
}

.warning-text {
  font-size: 26rpx;
  color: #ef4444;
  text-align: center;
}

.testing-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(2, 8, 23, 0.48);
  backdrop-filter: blur(4rpx);
}

.testing-modal {
  width: 560rpx;
  padding: 44rpx 36rpx;
  border-radius: 24rpx;
  border: 2rpx solid var(--c-card-border);
  background: var(--c-card);
  backdrop-filter: blur(18rpx);
  box-shadow: 0 16rpx 40rpx var(--c-shadow);
}

.testing-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 18rpx;
}

.testing-title {
  font-size: 30rpx;
  font-weight: 700;
  color: var(--t-primary);
}

.testing-current {
  font-size: 26rpx;
  line-height: 1.45;
  text-align: center;
  color: var(--t-regular);
  word-break: break-all;
}

::v-deep .theme-modal .u-popup__content {
  background: var(--c-card) !important;
  border: 2rpx solid var(--c-card-border);
  border-radius: 24rpx !important;
  backdrop-filter: blur(16rpx);
  box-shadow: 0 16rpx 40rpx var(--c-shadow);
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
  border-color: var(--c-divider) !important;
}

::v-deep .theme-modal .u-modal__button-group__wrapper--hover {
  background-color: rgba(88, 121, 255, 0.12);
}
</style>
