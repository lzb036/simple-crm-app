<template>
  <view :class="['page', themeClass]" @click="handlePageClick" :key="`customer-page-${appStore.language}`">
<!-- 查询区域 - 固定在顶部 -->
    <view class="search-fixed" @click.stop :style="searchFixedStyle">
      <view class="search-card">
        <view class="search-bar">
          <view class="search-input-wrapper">
            <u-icon name="search" size="18" color="var(--c-main)"></u-icon>
            <input
              class="search-input"
              v-model="searchForm.name"
              :placeholder="t('customerSearchType.name')"
              placeholder-class="search-input-placeholder"
            />
          </view>
          <view class="filter-btn" @click="showFilterPanel = !showFilterPanel">
            <u-icon name="list" size="20" :color="hasFilter ? 'var(--c-main)' : 'var(--t-regular)'"></u-icon>
            <text :class="['filter-btn-text', { 'filter-active': hasFilter }]">{{ t('customer.search') }}</text>
          </view>
          <view class="refresh-btn" @click="handleRefresh">
            <u-icon name="reload" size="20" color="var(--t-regular)"></u-icon>
            <text class="refresh-btn-text">{{ t('customer.refresh') }}</text>
          </view>
        </view>

        <!-- 筛选面板 -->
        <view class="filter-panel-shell" :class="{ open: showFilterPanel }" @click.stop>
          <view class="filter-panel">
          <view class="filter-item">
            <view class="filter-label">
              <u-icon name="list" size="16" color="var(--c-main)"></u-icon>
              <text>{{ t('customerSearchType.phone') }}</text>
            </view>
            <view class="filter-input-wrapper">
              <input
                class="filter-input"
                v-model="searchForm.phoneLast4"
                :placeholder="t('customerSearchType.phone')"
                placeholder-class="filter-input-placeholder"
              />
            </view>
          </view>

          <view class="filter-item">
            <view class="filter-label">
              <u-icon name="list" size="16" color="var(--c-main)"></u-icon>
              <text>{{ t('customerSearchType.referrer') }}</text>
            </view>
            <view class="filter-input-wrapper">
              <input
                class="filter-input"
                v-model="searchForm.referrerName"
                :placeholder="t('customerSearchType.referrer')"
                placeholder-class="filter-input-placeholder"
              />
            </view>
          </view>

          <view class="filter-actions">
            <view class="reset-btn" @click="handleReset">
              <text>{{ t('customer.reset') }}</text>
            </view>
            <view class="confirm-btn" @click="handleSearch">
              <u-icon name="search" size="16" color="#FFFFFF"></u-icon>
              <text>{{ t('customer.search') }}</text>
            </view>
          </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 可滚动内容区域 -->
    <scroll-view
      scroll-y
      class="scroll-content"
      :style="scrollContentStyle"
      :scroll-top="scrollTop"
      @scroll="onScroll"
    >
      <view class="content">
        <!-- 加载状态 -->
        <view v-if="loading" class="loading-wrapper">
          <u-loading-icon mode="circle" size="60" color="var(--c-main)"></u-loading-icon>
          <text class="loading-text">{{ t('common.loading') }}</text>
        </view>

        <!-- 空状态 -->
        <u-empty
          v-else-if="customers.length === 0"
          :text="t('customer.noData')"
          textColor="var(--t-regular)"
          iconColor="var(--t-light)"
          mode="data"
        ></u-empty>

        <!-- 列表 -->
        <view v-else class="list">
          <view
            v-for="item in customers"
            :key="item.id"
            class="record-card"
            @click="handleCardClick(item)"
          >
            <view class="card-content">
              <view class="user-info">
                <text class="username">{{ item.name }}</text>
                <text class="user-phone">{{ item.phone }}</text>
                <text class="user-address">{{ t('customer.address') }}：{{ item.address || '-' }}</text>
                <text class="user-remark">{{ t('customer.remark') }}：{{ item.remark || '-' }}</text>
              </view>
              <view class="gender-badge" :class="getGenderClass(item.gender)">
                {{ getGenderLabel(item.gender) }}
              </view>
            </view>

            <view class="card-footer">
              <view class="action-buttons">
                <view :class="['call-btn', { 'btn-loading': !!callLoadingMap[item.id] }]" @click.stop="handleCall(item)">
                  <u-icon v-if="callLoadingMap[item.id]" name="reload" size="20" color="#FFFFFF" class="loading-spin"></u-icon>
                  <u-icon v-else name="phone-fill" size="18" color="#FFFFFF"></u-icon>
                  <text class="call-btn-text">{{ callLoadingMap[item.id] ? t('common.loading') : t('customer.callPhone') }}</text>
                </view>
                <view :class="['view-phone-btn', { 'btn-loading': !!viewPhoneLoadingMap[item.id] }]" @click.stop="handleViewPhone(item)">
                  <u-icon v-if="viewPhoneLoadingMap[item.id]" name="reload" size="20" color="#FFFFFF" class="loading-spin"></u-icon>
                  <u-icon v-else name="eye" size="18" color="#FFFFFF"></u-icon>
                  <text class="view-phone-text">{{ viewPhoneLoadingMap[item.id] ? t('common.loading') : t('customer.viewPhone') }}</text>
                </view>
              </view>
            </view>
        </view>
      </view>

      <!-- 加载更多提示 -->
      <view v-if="customers.length > 0" class="load-more">
        <u-loading-icon v-if="loadMoreLoading" mode="circle" size="24" color="var(--c-main)"></u-loading-icon>
        <text v-else-if="!hasMore" class="no-more">{{ t('customer.noMore') }}</text>
      </view>
      </view>
    </scroll-view>

    <!-- 手机号弹窗 -->
    <u-modal
      :show="phonePopupVisible"
      :title="t('customer.phoneNumber')"
      :show-cancel-button="true"
      :confirm-text="t('common.copy')"
      :cancel-text="t('common.cancel')"
      custom-class="theme-modal"
      confirm-color="var(--c-main)"
      cancel-color="var(--t-regular)"
      @confirm="handleCopyPhone"
      @cancel="phonePopupVisible = false"
    >
      <view class="modal-phone-content">
        <text class="modal-phone-number">{{ phoneNumber || '***' }}</text>
      </view>
    </u-modal>

    <u-modal
      :show="deviceAuthModalVisible"
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

    <u-modal
      :show="callConfirmVisible"
      :title="t('customer.confirmCall')"
      :content="callConfirmContent"
      :show-cancel-button="true"
      :confirm-text="t('customer.dial')"
      :cancel-text="t('common.cancel')"
      custom-class="theme-modal"
      confirm-color="var(--c-main)"
      cancel-color="var(--t-regular)"
      @confirm="handleConfirmCall"
      @cancel="handleCancelCall"
    ></u-modal>
  </view>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { onReachBottom } from '@dcloudio/uni-app'
import { useI18n } from 'vue-i18n'
import { useAppStore } from '@/store/app'
import { useUserStore } from '@/store/user'
import CustomerAPI from '@/api/modules/customer'
import { isDeviceUnauthorizedError, isPhoneImeiGenerateFailedError } from '@/utils/api-error'
import type { CustomerRecord, Pager } from '@/types/api'

const { t, locale } = useI18n()
const appStore = useAppStore()
const userStore = useUserStore()

// 监听语言变化
watch(() => appStore.language, (newLang: string) => {
  locale.value = newLang
})

const themeClass = computed(() => appStore.theme)
const statusBarHeight = uni.getSystemInfoSync().statusBarHeight || 0
const searchFixedStyle = {
  paddingTop: `calc(16rpx + ${statusBarHeight}px)`
}

// 计算滚动区域高度
const scrollHeight = computed(() => {
  const systemInfo = uni.getSystemInfoSync()
  return `${systemInfo.windowHeight}px`
})
const scrollContentStyle = computed(() => ({
  height: scrollHeight.value,
  marginTop: `calc(120rpx + ${statusBarHeight}px)`
}))

const customers = ref<CustomerRecord[]>([])
const pager = ref<Pager>({
  total: 0,
  rp: 10,
  current: 1,
  pages: 0
})
const loading = ref(false)

// 查询状态
const searchForm = ref({
  name: '',
  phoneLast4: '',
  referrerName: ''
})

const showFilterPanel = ref(false)
const loadMoreLoading = ref(false)
const scrollTop = ref(0)
const lastScrollTop = ref(0)
const isLoading = ref(false)
const phonePopupVisible = ref(false)
const phoneNumber = ref('')
const callConfirmVisible = ref(false)
const callConfirmPhone = ref('')
const callLoadingMap = ref<Record<string, boolean>>({})
const viewPhoneLoadingMap = ref<Record<string, boolean>>({})
const deviceAuthModalVisible = ref(false)
let deviceAuthConfirmResolver: ((confirmed: boolean) => void) | null = null

// 是否有更多数据
const hasMore = computed(() => {
  // 如果没有数据，允许搜索
  if (customers.value.length === 0) return true
  return pager.value.current < pager.value.pages
})

// 是否有筛选条件
const hasFilter = computed(() => {
  return searchForm.value.name !== '' || searchForm.value.phoneLast4 !== '' || searchForm.value.referrerName !== ''
})

const callConfirmContent = computed(() => {
  if (!callConfirmPhone.value) {
    return ''
  }
  return locale.value === 'zh-CN'
    ? `是否拨打 ${callConfirmPhone.value}？`
    : `Call ${callConfirmPhone.value}?`
})

onMounted(() => {
  if (!userStore.isLoggedIn()) {
    uni.reLaunch({
      url: '/pages/login/index'
    })
    return
  }
  loadList()
})

onUnmounted(() => {
  resolveDeviceAuthConfirm(false)
})

const loadList = async (): Promise<void> => {
  // 防止重复请求
  if (isLoading.value) {
    return
  }

  // 确保 pager 存在
  if (!pager.value) {
    return
  }

  const shouldRestoreScroll = pager.value.current > 1
  const isLoadingMore = pager.value.current > 1

  isLoading.value = true

  // 只有首次加载时才显示全屏loading
  if (!isLoadingMore) {
    loading.value = true
  }
  try {
    const params: Record<string, any> = {
      page: pager.value.current,
      pageSize: 10
    }

    // 添加搜索参数
    if (searchForm.value.name) {
      params.name = searchForm.value.name
    }
    if (searchForm.value.phoneLast4) {
      params.phoneLast4 = searchForm.value.phoneLast4
    }
    if (searchForm.value.referrerName) {
      params.referrerName = searchForm.value.referrerName
    }

    const response = await CustomerAPI.getList(params)

    // 再次检查 pager 是否存在（防止在请求期间组件被销毁）
    if (!pager.value) return

    if (pager.value.current === 1) {
      // 首次加载，替换数据
      customers.value = response.list || []
    } else {
      // 加载更多，追加数据
      customers.value = [...customers.value, ...(response.list || [])]
    }
    // 只有当 pager 存在时才更新（防止空结果时 pager 为 undefined）
    if (response.pager) {
      pager.value = response.pager
    }

    if (shouldRestoreScroll) {
      await nextTick()
      scrollTop.value = lastScrollTop.value
    }
  } catch (error) {
    console.error('[客户] 获取列表失败:', error)
    // 发生错误时也要重置状态
  } finally {
    isLoading.value = false
    // 只有首次加载时才关闭全屏loading
    if (!isLoadingMore) {
      loading.value = false
    }
  }
}

const onScroll = (e: any): void => {
  lastScrollTop.value = e.detail.scrollTop
}

onReachBottom(() => {
  onScrollLower()
})

// 上拉加载更多
const onScrollLower = (): void => {
  // 安全检查
  if (!pager.value || !hasMore.value || loadMoreLoading.value || loading.value || isLoading.value) return

  loadMoreLoading.value = true
  pager.value.current++
  loadList().finally(() => {
    if (pager.value) {
      loadMoreLoading.value = false
    }
  })
}

const handleSearch = (): void => {
  if (!pager.value) {
    return
  }
  showFilterPanel.value = false
  pager.value.current = 1
  loadList()
}

const handleReset = (): void => {
  if (!pager.value) {
    return
  }
  showFilterPanel.value = false
  searchForm.value.name = ''
  searchForm.value.phoneLast4 = ''
  searchForm.value.referrerName = ''
  pager.value.current = 1
  loadList()
}

const handleRefresh = (): void => {
  if (!pager.value) {
    return
  }
  pager.value.current = 1
  loadList()
}

// 点击页面其他区域收起筛选面板
const handlePageClick = (): void => {
  if (showFilterPanel.value) {
    showFilterPanel.value = false
  }
}

const handleCardClick = (item: CustomerRecord): void => {
  // 点击卡片不再跳转详情页
}

function resolveDeviceAuthConfirm(confirmed: boolean): void {
  deviceAuthModalVisible.value = false
  if (deviceAuthConfirmResolver) {
    deviceAuthConfirmResolver(confirmed)
    deviceAuthConfirmResolver = null
  }
}

function showDeviceAuthConfirmModal(): Promise<boolean> {
  return new Promise((resolve) => {
    deviceAuthConfirmResolver = resolve
    deviceAuthModalVisible.value = true
  })
}

function handleDeviceAuthConfirm(): void {
  resolveDeviceAuthConfirm(true)
}

function handleDeviceAuthCancel(): void {
  resolveDeviceAuthConfirm(false)
}

const handleViewPhone = async (item: CustomerRecord): Promise<void> => {
  if (callLoadingMap.value[item.id] || viewPhoneLoadingMap.value[item.id]) {
    return
  }

  viewPhoneLoadingMap.value[item.id] = true
  try {
    phoneNumber.value = await CustomerAPI.getPhone(item.id, 'app_view', showDeviceAuthConfirmModal)
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
  } finally {
    delete viewPhoneLoadingMap.value[item.id]
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

const handleCall = async (item: CustomerRecord): Promise<void> => {
  if (callLoadingMap.value[item.id] || viewPhoneLoadingMap.value[item.id]) {
    return
  }

  callLoadingMap.value[item.id] = true
  try {
    const phone = await CustomerAPI.getPhone(item.id, 'dial', showDeviceAuthConfirmModal)
    callConfirmPhone.value = phone
    callConfirmVisible.value = true
  } catch (error) {
    console.error('[拨打电话] 获取手机号失败:', error)
    if (isDeviceUnauthorizedError(error) || isPhoneImeiGenerateFailedError(error)) {
      return
    }
    uni.showToast({
      title: t('permission.getPhoneFailed'),
      icon: 'none'
    })
  } finally {
    delete callLoadingMap.value[item.id]
  }
}

const handleCancelCall = (): void => {
  callConfirmVisible.value = false
  callConfirmPhone.value = ''
}

const handleConfirmCall = (): void => {
  const phone = callConfirmPhone.value
  handleCancelCall()

  if (!phone) {
    return
  }

  uni.makePhoneCall({
    phoneNumber: phone,
    success: () => {
      console.log('[拨打电话] 成功')
    },
    fail: (err: any) => {
      console.error('[拨打电话] 失败:', err)
      uni.showToast({
        title: t('permission.callFailed'),
        icon: 'none'
      })
    }
  })
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
  // dateStr format: "2026-01-16 13:42:13"
  return dateStr.split(' ')[0]
}

const formatTime = (timestamp: string): string => {
  if (!timestamp) return '-'
  // timestamp format: "2026-01-20 11:17:44"
  return timestamp
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
  --c-card: rgba(255, 255, 255, 0.74);
  --c-list-card: rgba(255, 255, 255, 0.64);
  --c-main: #4F46E5;
  --t-primary: #111827;
  --t-regular: #4B5563;
  --t-light: #9CA3AF;
  --c-border: rgba(132, 158, 225, 0.24);
  --c-divider: rgba(0, 0, 0, 0.06);
}

.page.dark {
  --c-bg: #0B0F19;
  --c-card: rgba(12, 22, 41, 0.74);
  --c-list-card: rgba(12, 22, 41, 0.62);
  --c-main: #6366F1;
  --t-primary: #F9FAFB;
  --t-regular: #9CA3AF;
  --t-light: #6B7280;
  --c-border: rgba(101, 125, 170, 0.36);
  --c-divider: rgba(255, 255, 255, 0.06);
}



.search-fixed {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  background: linear-gradient(180deg, var(--c-bg) 0%, var(--c-bg) 80%, transparent 100%);
  padding: 16rpx 24rpx 24rpx;
  z-index: 100;
}

.scroll-content {
  flex: 1;
  height: 0;
  margin-top: 120rpx;
}

.content {
  padding: 24rpx;
  padding-bottom: 200rpx;
}

/* 搜索卡片 */
.search-card {
  background: var(--c-card);
  backdrop-filter: blur(14rpx);
  border-radius: 20rpx;
  border: 2rpx solid var(--c-border);
  box-shadow: 0 4rpx 20rpx rgba(79, 70, 229, 0.12);
  overflow: hidden;
}

/* 搜索栏 */
.search-bar {
  display: flex;
  align-items: center;
  padding: 16rpx 20rpx;
  gap: 16rpx;
}

.search-input-wrapper {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 16rpx 20rpx;
  background-color: var(--c-bg);
  border-radius: 16rpx;
}

.search-input {
  flex: 1;
  font-size: 28rpx;
  color: var(--t-primary);
}

.search-input-placeholder {
  color: var(--t-light);
}


/* 筛选按钮 */
.filter-btn {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 16rpx 20rpx;
  background-color: var(--c-bg);
  border-radius: 16rpx;
  transition: all 0.2s;
}

.filter-btn:active {
  transform: scale(0.95);
}

.filter-btn-text {
  font-size: 28rpx;
  color: var(--t-regular);
  font-weight: 500;
}

.filter-active {
  color: var(--c-main);
}

.refresh-btn {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 16rpx 20rpx;
  background-color: var(--c-bg);
  border-radius: 16rpx;
  transition: all 0.2s;
}

.refresh-btn:active {
  transform: scale(0.95);
}

.refresh-btn-text {
  font-size: 28rpx;
  color: var(--t-regular);
  font-weight: 500;
}

/* 筛选面板 */
.filter-panel-shell {
  overflow: hidden;
  max-height: 0;
  opacity: 0;
  transform: translateY(-14rpx) scaleY(0.92);
  transition:
    max-height 0.34s cubic-bezier(0.22, 0.84, 0.22, 1),
    opacity 0.22s ease,
    transform 0.32s cubic-bezier(0.2, 0.85, 0.25, 1.02);
}

.filter-panel-shell.open {
  max-height: 640rpx;
  opacity: 1;
  transform: translateY(0) scaleY(1);
}
.filter-panel {
  padding: 0 20rpx 20rpx;
  border-top: 1rpx solid var(--c-divider);
  margin-top: 4rpx;
}

.filter-item {
  padding: 20rpx 0;
}

.filter-label {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin-bottom: 16rpx;
  font-size: 26rpx;
  color: var(--t-regular);
  font-weight: 500;
}

.filter-input-wrapper {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 16rpx 20rpx;
  background-color: var(--c-bg);
  border-radius: 12rpx;
}

.filter-input {
  flex: 1;
  font-size: 28rpx;
  color: var(--t-primary);
}

.filter-input-placeholder {
  color: var(--t-light);
}


.filter-actions {
  display: flex;
  gap: 16rpx;
  margin-top: 24rpx;
}

.reset-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  height: 72rpx;
  background-color: var(--c-bg);
  border-radius: 12rpx;
  font-size: 28rpx;
  color: var(--t-regular);
  font-weight: 500;
  transition: all 0.2s;
}

.reset-btn:active {
  transform: scale(0.98);
  background-color: var(--c-border);
}

.confirm-btn {
  flex: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  height: 72rpx;
  background: linear-gradient(135deg, var(--c-main) 0%, rgba(99, 102, 241, 0.9) 100%);
  border-radius: 12rpx;
  font-size: 28rpx;
  color: #FFFFFF;
  font-weight: 500;
  transition: all 0.2s;
}

.confirm-btn:active {
  transform: scale(0.98);
  opacity: 0.9;
}

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

.list {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.record-card {
  background-color: var(--c-list-card);
  backdrop-filter: blur(14rpx);
  border-radius: 24rpx;
  padding: 32rpx;
  border: 2rpx solid var(--c-border);
  box-shadow: 0 4rpx 24rpx rgba(0, 0, 0, 0.06);
  transition: box-shadow 0.2s;
}

.record-card:first-of-type {
  margin-top: 8rpx;
}

.card-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.user-info {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  flex: 1;
}

.username {
  font-size: 32rpx;
  font-weight: 600;
  color: var(--t-primary);
  line-height: 1.3;
}

.user-phone {
  font-size: 28rpx;
  color: var(--t-regular);
}

.user-address {
  font-size: 26rpx;
  color: var(--t-light);
}

.user-remark {
  font-size: 26rpx;
  color: var(--t-light);
}

.gender-badge {
  padding: 12rpx 24rpx;
  border-radius: 12rpx;
  font-size: 26rpx;
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

.card-footer {
  margin-top: 20rpx;
  padding-top: 20rpx;
  border-top: 1rpx solid var(--c-divider);
}

.action-buttons {
  display: flex;
  gap: 16rpx;
}

.call-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  height: 72rpx;
  border-radius: 12rpx;
  background: #10B981;
  transition: all 0.2s;
}

.call-btn:active {
  opacity: 0.8;
  transform: scale(0.98);
}

.call-btn-text {
  font-size: 28rpx;
  color: #FFFFFF;
  font-weight: 500;
}

.view-phone-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  height: 72rpx;
  border-radius: 12rpx;
  background: var(--c-main);
  transition: all 0.2s;
}

.btn-loading {
  opacity: 1;
  transform: scale(1.02);
  position: relative;
  overflow: hidden;
}

.btn-loading::after {
  content: '';
  position: absolute;
  top: 0;
  left: -120%;
  width: 80%;
  height: 100%;
  background: linear-gradient(90deg, rgba(255, 255, 255, 0), rgba(255, 255, 255, 0.28), rgba(255, 255, 255, 0));
  animation: btnShimmer 1s ease-in-out infinite;
}

.loading-spin {
  animation: spin 0.9s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@keyframes btnShimmer {
  0% {
    left: -120%;
  }
  100% {
    left: 140%;
  }
}

.view-phone-btn:active {
  opacity: 0.8;
  transform: scale(0.98);
}

.view-phone-text {
  font-size: 28rpx;
  color: #FFFFFF;
  font-weight: 500;
}

::v-deep .theme-modal .u-popup__content {
  background: var(--c-card) !important;
  border: 2rpx solid var(--c-border);
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

.modal-phone-content {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 12rpx 0 8rpx;
}

.modal-phone-number {
  font-size: 52rpx;
  line-height: 1.1;
  font-weight: 700;
  letter-spacing: 2rpx;
  font-family: 'Consolas', 'SFMono-Regular', 'Roboto Mono', 'Menlo', monospace;
  color: var(--c-main);
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

::v-deep .theme-modal .u-line {
  border-color: var(--c-border) !important;
}

::v-deep .theme-modal .u-modal__button-group__wrapper--hover {
  background-color: var(--c-border);
}

.load-more {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 30rpx 0;
  gap: 12rpx;
}

.no-more {
  font-size: 26rpx;
  color: var(--t-light);
}
</style>

