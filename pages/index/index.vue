<template>
  <view :class="['page', themeClass]">
    <!-- 内容区域 -->
    <view class="page-content">
      <view :class="['tab-content', { active: currentTab === 0 }]">
        <CustomerPage />
      </view>
      <view :class="['tab-content', { active: currentTab === 1 }]">
        <ProfilePage />
      </view>
    </view>

    <!-- 底部导航栏 -->
    <view class="tab-bar">
      <view
        v-for="(tab, index) in tabs"
        :key="index"
        :class="['tab-item', { active: currentTab === index }]"
        @click="switchTab(index)"
      >
        <view class="tab-icon">
          <text class="icon-text">{{ tab.icon }}</text>
        </view>
        <text class="tab-label">{{ t(tab.labelKey) }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { useI18n } from 'vue-i18n'
import { useAppStore } from '@/store/app'
import { useUserStore } from '@/store/user'
import CustomerPage from '@/pages/tabs/customer.vue'
import ProfilePage from '@/pages/tabs/profile.vue'

interface TabItem {
  icon: string
  labelKey: string
  url: string
}

const { t } = useI18n()
const appStore = useAppStore()
const userStore = useUserStore()

const currentTab = ref(0)

const tabs: TabItem[] = [
  { icon: '👥', labelKey: 'tabs.customer', url: '/pages/tabs/customer' },
  { icon: '👤', labelKey: 'tabs.profile', url: '/pages/tabs/profile' }
]

const themeClass = computed(() => appStore.theme)

onLoad(() => {
  if (!userStore.isLoggedIn()) {
    uni.reLaunch({
      url: '/pages/login/index'
    })
  }
})

const switchTab = (index: number): void => {
  if (currentTab.value === index) {
    return
  }
  currentTab.value = index
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
  --c-tab-bar: #FFFFFF;
  --c-tab-active: rgba(79, 70, 229, 0.1);
  --t-tab: #9CA3AF;
  --t-tab-active: #4F46E5;
  --c-border: #F3F4F6;
}

.page.dark {
  --c-bg: #0B0F19;
  --c-tab-bar: #111827;
  --c-tab-active: rgba(99, 102, 241, 0.15);
  --t-tab: #6B7280;
  --t-tab-active: #6366F1;
  --c-border: #1F2937;
}

.page-content {
  flex: 1;
  min-height: 100vh;
  overflow: hidden;
  position: relative;
}

.tab-content {
  position: absolute;
  inset: 0;
  height: 100%;
  overflow: hidden;
  opacity: 0;
  pointer-events: none;
  visibility: hidden;
  z-index: 0;
}

.tab-content.active {
  opacity: 1;
  pointer-events: auto;
  visibility: visible;
  z-index: 1;
}

/* 底部导航栏 */
.tab-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  background-color: var(--c-tab-bar);
  border-top: 1rpx solid var(--c-border);
  padding-bottom: env(safe-area-inset-bottom);
  box-shadow: 0 -4rpx 16rpx rgba(0, 0, 0, 0.04);
  z-index: 100;
}

.tab-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 16rpx 0 24rpx;
  transition: all 0.3s ease;
  cursor: pointer;
}

.tab-item.active {
  background-color: var(--c-tab-active);
}

.tab-icon {
  margin-bottom: 8rpx;
}

.icon-text {
  font-size: 44rpx;
  line-height: 1;
}

.tab-label {
  font-size: 22rpx;
  color: var(--t-tab);
  transition: color 0.3s ease;
}

.tab-item.active .tab-label {
  color: var(--t-tab-active);
  font-weight: 600;
}
</style>
