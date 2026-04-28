<template>
  <view :class="['profile-container', themeClass]" :style="profileContainerStyle">
    <view class="bg-layer">
      <view class="bg-orb orb-main"></view>
      <view class="bg-orb orb-accent"></view>
      <view class="bg-grid"></view>
    </view>
    <!-- 顶部工具栏 -->
    <view class="top-bar" :style="topBarStyle">
      <view class="switch-group">
        <view class="switch-btn" @click="handleQrLogin">
          <u-icon class="switch-icon" name="scan" size="20" color="var(--t-primary)" />
        </view>
        <view class="switch-btn" @click="handleLanguageToggle">
          <text class="switch-icon">{{ currentLang }}</text>
        </view>
        <view class="switch-btn" @click="handleThemeToggle">
          <text class="switch-icon">{{ appStore.theme === 'light' ? '☀️' : '🌙' }}</text>
        </view>
        <view class="switch-btn" @click="handleBaseURLSetting">
          <text class="switch-icon">URL</text>
        </view>
      </view>
    </view>

    <!-- 用户信息卡片 -->
    <view class="content">
      <view v-if="userInfo" class="user-card">
        <view class="user-header">
          <view class="avatar-wrapper">
            <view class="avatar-placeholder">
              <text class="avatar-text">{{ (userInfo?.nickname || userInfo?.realname || userInfo?.realName || '')?.charAt(0)?.toUpperCase() || '?' }}</text>
            </view>
          </view>
          <view class="user-info">
            <text class="username">{{ userInfo?.nickname || userInfo?.realname || userInfo?.realName || '-' }}</text>
          </view>
        </view>

        <view class="info-sections">
          <view class="info-section">
            <view class="section-title">{{ t('profile.accountInfo') }}</view>
            <view class="info-list">
              <view class="info-item">
                <text class="info-label">{{ t('profile.realname') }}</text>
                <text class="info-value">{{ userInfo?.realname || userInfo?.realName || '-' }}</text>
              </view>
              <view class="info-item">
                <text class="info-label">{{ t('profile.email') }}</text>
                <text class="info-value">{{ userInfo?.email || '-' }}</text>
              </view>
            </view>
          </view>

          <view class="info-section">
            <view class="section-title">{{ t('profile.roleInfo') }}</view>
            <view class="info-list">
              <view class="info-item">
                <text class="info-label">{{ t('profile.roles') }}</text>
                <view class="role-tags">
                  <text v-if="displayRoles.length" v-for="role in displayRoles" :key="role.id" class="role-tag">
                    {{ getRoleDisplay(role) }}
                  </text>
                  <text v-else class="info-value">{{ t('profile.noRoles') }}</text>
                </view>
              </view>
              <view class="info-item">
                <text class="info-label">{{ t('profile.accountStatus') }}</text>
                <view :class="['status-badge', userInfo?.accountLocked ? 'locked' : 'normal']">
                  {{ userInfo?.accountLocked ? t('status.locked') : t('status.normal') }}
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 操作按钮 -->
      <view class="action-section">
        <u-button
          type="primary"
          @click="showLogoutModal = true"
          :custom-style="buttonStyle"
        >
          {{ t('profile.logout') }}
        </u-button>
      </view>
    </view>

    <!-- 退出登录弹窗 -->
    <u-modal
      :show="showLogoutModal"
      :title="t('profile.logoutConfirm')"
      :content="t('profile.logoutMessage')"
      :show-cancel-button="true"
      :async-close="true"
      :confirm-text="t('common.confirm')"
      :cancel-text="t('common.cancel')"
      :custom-class="logoutModalClass"
      confirm-color="#EF4444"
      cancel-color="var(--t-regular)"
      @confirm="handleLogout"
      @cancel="handleLogoutCancel"
    ></u-modal>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useI18n } from 'vue-i18n'
import { useAppStore } from '@/store/app'
import { useUserStore } from '@/store/user'
import AuthAPI from '@/api/modules/auth'
import UserAPI from '@/api/modules/user'
import { redirectToLogin } from '@/utils/navigation'

const { t, te, locale } = useI18n()
const appStore = useAppStore()
const userStore = useUserStore()

const themeClass = computed(() => appStore.theme)
const profileContainerStyle = computed(() => ({
  '--logout-loading-text': `"${t('profile.logoutLoading').replace(/"/g, '\\"')}"`
}))
const statusBarHeight = uni.getSystemInfoSync().statusBarHeight || 0
const topBarStyle = {
  paddingTop: `calc(32rpx + ${statusBarHeight}px)`
}
const userInfo = computed(() => userStore.userInfo)

type RoleItem = {
  id?: string | number
  name?: string
  code?: string
}

const normalizeRoleToken = (value?: string): string => {
  if (!value) {
    return ''
  }
  return value.trim().toUpperCase().replace(/\s+/g, '_').replace(/-/g, '_')
}

const SYSTEM_ADMIN_TOKENS = new Set([
  'SYSTEM_ADMIN',
  'ROLE_SYSTEM_ADMIN',
  'SYS_ADMIN',
  'ROLE_SYS_ADMIN',
  '系统管理员'
])

const SUPER_ADMIN_TOKENS = new Set([
  'SUPER_ADMIN',
  'ROLE_SUPER_ADMIN',
  'SUPERADMIN',
  '超级管理员'
])

const isSystemAdminRole = (token: string): boolean => {
  if (!token) {
    return false
  }
  return SYSTEM_ADMIN_TOKENS.has(token) || token.includes('SYSTEM_ADMIN') || token.includes('SYS_ADMIN') || token.includes('系统管理员')
}

const isSuperAdminRole = (token: string): boolean => {
  if (!token) {
    return false
  }
  return SUPER_ADMIN_TOKENS.has(token) || token.includes('SUPER_ADMIN') || token.includes('SUPERADMIN') || token.includes('超级管理员')
}

const getCanonicalRoleKey = (role?: RoleItem): 'SYSTEM_ADMIN' | 'NORMAL_ADMIN' | 'SUPER_ADMIN' | '' => {
  const codeToken = normalizeRoleToken(role?.code)
  const nameToken = normalizeRoleToken(role?.name)

  if (!codeToken && !nameToken) {
    return ''
  }

  if (isSystemAdminRole(codeToken) || isSystemAdminRole(nameToken)) {
    return 'SYSTEM_ADMIN'
  }

  if (isSuperAdminRole(codeToken) || isSuperAdminRole(nameToken)) {
    return 'SUPER_ADMIN'
  }

  return 'NORMAL_ADMIN'
}

const displayRoles = computed<RoleItem[]>(() => {
  const roles = (userInfo.value?.roles || []) as RoleItem[]
  const seen = new Set<string>()

  return roles.filter((role) => {
    const canonicalKey = getCanonicalRoleKey(role)
    const dedupeKey = canonicalKey || `${normalizeRoleToken(role.code)}|${normalizeRoleToken(role.name)}`
    if (!dedupeKey || seen.has(dedupeKey)) {
      return false
    }
    seen.add(dedupeKey)
    return true
  })
})

// 退出登录弹窗状态
const showLogoutModal = ref(false)
const logoutLoading = ref(false)

const logoutModalClass = computed(() => {
  if (!logoutLoading.value) {
    return 'theme-modal'
  }
  return 'theme-modal theme-modal--logout-loading'
})

const currentLang = computed(() => {
  return appStore.language === 'zh-CN' ? 'CN' : 'EN'
})

const getRoleDisplay = (role?: RoleItem): string => {
  const canonicalRoleKey = getCanonicalRoleKey(role)
  if (canonicalRoleKey) {
    const canonicalKey = `roles.${canonicalRoleKey}`
    if (te(canonicalKey)) {
      return t(canonicalKey)
    }
  }

  const roleCode = role?.code
  if (!roleCode) {
    return role?.name?.trim() || '-'
  }

  const rawKey = `roles.${roleCode}`
  if (te(rawKey)) {
    return t(rawKey)
  }

  const normalizedRoleCode = roleCode.replace(/^ROLE_/, '')
  const normalizedKey = `roles.${normalizedRoleCode}`
  if (te(normalizedKey)) {
    return t(normalizedKey)
  }

  return role?.name?.trim() || normalizedRoleCode || roleCode
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

const fetchUserInfo = async (): Promise<void> => {
  try {
    const userInfoResponse = await UserAPI.getUserInfo()
    userStore.setUserInfo({
      id: userInfoResponse.id,
      username: userInfoResponse.username,
      nickname: userInfoResponse.nickname,
      realName: userInfoResponse.realname,
      realname: userInfoResponse.realname,
      email: userInfoResponse.email,
      roles: userInfoResponse.roles,
      accountLocked: userInfoResponse.accountLocked
    })
  } catch (error) {
    console.error('[个人中心] 获取用户信息失败', error)
  }
}

onShow(() => {
  if (!userStore.isLoggedIn()) {
    redirectToLogin()
    return
  }
  fetchUserInfo()
})

const handleThemeToggle = (): void => {
  appStore.toggleTheme()
}

const handleLanguageToggle = (): void => {
  appStore.toggleLanguage()
  locale.value = appStore.language
}

const handleBaseURLSetting = (): void => {
  uni.navigateTo({
    url: '/pages/baseurl/index'
  })
}

const handleQrLogin = (): void => {
  uni.navigateTo({
    url: '/pages/qr-login/index'
  })
}

const handleLogoutCancel = (): void => {
  if (logoutLoading.value) {
    return
  }
  showLogoutModal.value = false
}

const handleLogout = async (): Promise<void> => {
  if (logoutLoading.value) {
    return
  }

  logoutLoading.value = true
  try {
    await AuthAPI.logout()
    console.log('[个人中心] 退出登录成功')
  } catch (error) {
    console.log('[个人中心] 退出登录失败（可能是Token已过期）', error)
  } finally {
    logoutLoading.value = false
  }

  showLogoutModal.value = false
  userStore.logout()

  uni.reLaunch({
    url: '/pages/login/index'
  })
}
</script>

<style scoped>
.profile-container {
  min-height: 100vh;
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: linear-gradient(160deg, var(--c-bg) 0%, var(--c-bg-2) 100%);
}

.profile-container.light {
  --c-bg: #f4f7ff;
  --c-bg-2: #edf2ff;
  --c-card: rgba(255, 255, 255, 0.72);
  --c-main: #3f62ff;
  --c-main-light: rgba(63, 98, 255, 0.12);
  --t-primary: #0f172a;
  --t-regular: #475569;
  --t-secondary: #8090b0;
  --c-border: rgba(132, 158, 225, 0.24);
  --c-shadow: rgba(29, 41, 83, 0.14);
}

.profile-container.dark {
  --c-bg: #070d1a;
  --c-bg-2: #0a1428;
  --c-card: rgba(12, 22, 41, 0.74);
  --c-main: #80a2ff;
  --c-main-light: rgba(128, 162, 255, 0.2);
  --t-primary: #f8fbff;
  --t-regular: #c6d2ea;
  --t-secondary: #7a90b7;
  --c-border: rgba(101, 125, 170, 0.36);
  --c-shadow: rgba(0, 0, 0, 0.34);
}

.bg-layer {
  position: absolute;
  inset: 0;
  z-index: 0;
}

.bg-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(12rpx);
}

.orb-main {
  width: 620rpx;
  height: 620rpx;
  top: -170rpx;
  right: -180rpx;
  background: radial-gradient(circle, rgba(91, 123, 255, 0.34) 0%, rgba(91, 123, 255, 0) 74%);
}

.orb-accent {
  width: 420rpx;
  height: 420rpx;
  bottom: 80rpx;
  left: -120rpx;
  background: radial-gradient(circle, rgba(33, 184, 255, 0.26) 0%, rgba(33, 184, 255, 0) 76%);
}

.bg-grid {
  position: absolute;
  inset: 0;
  opacity: 0.3;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.18) 1rpx, transparent 1rpx),
    linear-gradient(90deg, rgba(255, 255, 255, 0.14) 1rpx, transparent 1rpx);
  background-size: 42rpx 42rpx;
}

/* 顶部工具栏 */
.top-bar {
  position: relative;
  z-index: 2;
  display: flex;
  justify-content: flex-end;
  padding: 32rpx 40rpx 0;
}

.switch-group {
  display: flex;
  gap: 16rpx;
}

.switch-btn {
  width: 64rpx;
  height: 64rpx;
  border-radius: 16rpx;
  background-color: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(10rpx);
  border: 2rpx solid var(--c-border);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.switch-btn:active {
  transform: scale(0.92);
  background-color: var(--c-border);
}

.switch-icon {
  font-size: 24rpx;
  font-weight: 600;
  color: var(--t-regular);
}

/* 内容区域 */
.content {
  flex: 1;
  position: relative;
  z-index: 2;
  padding: 40rpx;
  padding-bottom: 200rpx;
}

/* 用户卡片 */
.user-card {
  background-color: var(--c-card);
  backdrop-filter: blur(16rpx);
  border-radius: 24rpx;
  padding: 48rpx 40rpx;
  border: 2rpx solid var(--c-border);
  box-shadow: 0 8rpx 32rpx var(--c-shadow);
  margin-bottom: 32rpx;
}

.user-header {
  display: flex;
  align-items: center;
  gap: 24rpx;
  padding-bottom: 32rpx;
  border-bottom: 2rpx solid var(--c-border);
  margin-bottom: 32rpx;
}

.avatar-wrapper {
  flex-shrink: 0;
}

.avatar-placeholder {
  width: 96rpx;
  height: 96rpx;
  border-radius: 24rpx;
  background: linear-gradient(135deg, var(--c-main) 0%, rgba(99, 102, 241, 0.8) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar-text {
  font-size: 44rpx;
  font-weight: 700;
  color: #FFFFFF;
}

.user-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  min-width: 0;
}

.username {
  font-size: 36rpx;
  font-weight: 700;
  color: var(--t-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 信息区域 */
.info-sections {
  display: flex;
  flex-direction: column;
  gap: 32rpx;
}

.info-section {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.section-title {
  font-size: 28rpx;
  font-weight: 600;
  color: var(--t-regular);
  padding-bottom: 8rpx;
}

.info-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx 24rpx;
  background-color: var(--c-bg);
  border-radius: 16rpx;
  border: 2rpx solid var(--c-border);
}

.info-label {
  font-size: 28rpx;
  color: var(--t-regular);
}

.info-value {
  font-size: 28rpx;
  color: var(--t-primary);
  font-weight: 500;
  text-align: right;
  max-width: 400rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 角色标签 */
.role-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  justify-content: flex-end;
}

.role-tag {
  padding: 8rpx 20rpx;
  background-color: var(--c-main-light);
  border-radius: 8rpx;
  font-size: 24rpx;
  color: var(--c-main);
  font-weight: 500;
}

/* 状态徽章 */
.status-badge {
  padding: 8rpx 20rpx;
  border-radius: 8rpx;
  font-size: 24rpx;
  font-weight: 500;
}

.status-badge.normal {
  background-color: rgba(16, 185, 129, 0.1);
  color: #10B981;
}

.status-badge.locked {
  background-color: rgba(239, 68, 68, 0.1);
  color: #EF4444;
}

/* 操作区域 */
.action-section {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
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

::v-deep .theme-modal .u-line {
  border-color: var(--c-border) !important;
}

::v-deep .theme-modal .u-modal__button-group__wrapper--hover {
  background-color: var(--c-main-light);
}

::v-deep .theme-modal--logout-loading .u-modal__button-group__wrapper--confirm {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10rpx;
}

::v-deep .theme-modal--logout-loading .u-modal__button-group__wrapper--confirm::after {
  content: var(--logout-loading-text);
  color: #EF4444;
  font-size: 30rpx;
  font-weight: 500;
}
</style>
