<template>
  <view :class="['debug-container', themeClass]">
    <view class="top-bar" :style="topBarStyle">
      <view class="top-btn" @click="handleBack">
        <text class="top-btn-text">返回</text>
      </view>
      <text class="top-title">认证调试</text>
      <view class="top-btn" @click="handleRefreshStatus">
        <text class="top-btn-text">刷新</text>
      </view>
    </view>

    <scroll-view class="content" scroll-y :show-scrollbar="false">
      <view class="card">
        <text class="card-title">当前认证状态</text>

        <view class="row">
          <text class="label">登录状态</text>
          <text class="value" :class="snapshot.loggedIn ? 'ok' : 'bad'">
            {{ snapshot.loggedIn ? '已登录' : '未登录' }}
          </text>
        </view>
        <view class="row">
          <text class="label">认证头</text>
          <text class="value mono">{{ snapshot.authHeader }}</text>
        </view>
        <view class="row">
          <text class="label">Access Token</text>
          <text class="value mono">{{ tokenPreview }}</text>
        </view>
        <view class="row">
          <text class="label">Refresh Token</text>
          <text class="value mono">{{ refreshTokenText }}</text>
        </view>
        <view class="row">
          <text class="label">Access过期时间</text>
          <text class="value">{{ accessExpireAtText }}</text>
        </view>
        <view class="row">
          <text class="label">Access剩余时长</text>
          <text class="value">{{ accessTtlText }}</text>
        </view>
        <view class="row">
          <text class="label">最近刷新</text>
          <text class="value">{{ snapshot.updatedAt }}</text>
        </view>
      </view>

      <view class="card">
        <text class="card-title">调试动作</text>
        <text class="card-subtitle">当前执行：{{ running || '空闲' }}</text>

        <view class="btn-grid" :style="btnGridStyle">
          <u-button size="mini" :loading="running === '手动刷新Token'" :custom-style="actionButtonStyle" @click="handleManualRefresh">
            手动 refresh
          </u-button>
          <u-button size="mini" :loading="running === '请求用户信息'" :custom-style="actionButtonStyle" @click="handleRequestUserInfo">
            请求用户
          </u-button>
          <u-button size="mini" :loading="running === '并发请求用户信息'" :custom-style="actionButtonStyle" @click="handleConcurrentRequest">
            并发请求 x5
          </u-button>
          <u-button size="mini" :loading="running === '设置过期时间'" :custom-style="actionButtonStyle" @click="handleSetExpired">
            设为已过期
          </u-button>
          <u-button size="mini" :loading="running === '设置未来过期时间'" :custom-style="actionButtonStyle" @click="handleSetFutureExpire">
            设为1分钟后过期
          </u-button>
          <u-button size="mini" :loading="running === '写入无效Token'" :custom-style="actionButtonStyle" @click="handleSetInvalidToken">
            写入无效 Token
          </u-button>
          <u-button size="mini" :loading="running === '模拟过期自动刷新'" :custom-style="actionButtonStyle" @click="handleSimulateExpiredFlow">
            测试过期自动刷新
          </u-button>
          <u-button size="mini" :loading="running === '模拟401自动刷新'" :custom-style="actionButtonStyle" @click="handleSimulate401Flow">
            测试401自动刷新
          </u-button>
          <u-button size="mini" :loading="running === '恢复初始Token'" :custom-style="actionButtonStyle" @click="handleRestoreOriginalToken">
            恢复初始 Token
          </u-button>
          <u-button size="mini" :loading="running === '清理认证状态'" :custom-style="dangerButtonStyle" @click="handleClearAuth">
            清理认证状态
          </u-button>
        </view>
      </view>

      <view class="card">
        <view class="log-head">
          <text class="card-title">执行日志</text>
          <view class="clear-btn" @click="clearLogs">
            <text class="clear-btn-text">清空</text>
          </view>
        </view>

        <view v-if="logs.length === 0" class="empty-log">暂无日志</view>
        <view v-else class="log-list">
          <view v-for="item in logs" :key="item.id" class="log-item" :class="`level-${item.level}`">
            <text class="log-time">{{ item.time }}</text>
            <text class="log-text">{{ item.text }}</text>
          </view>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { onHide, onShow } from '@dcloudio/uni-app'
import { useAppStore } from '@/store/app'
import { useUserStore } from '@/store/user'
import AuthAPI from '@/api/modules/auth'
import UserAPI from '@/api/modules/user'

type LogLevel = 'info' | 'success' | 'error'

interface DebugLog {
  id: number
  time: string
  level: LogLevel
  text: string
}

interface AuthSnapshot {
  loggedIn: boolean
  token: string
  authHeader: string
  accessTokenExpireTime: number | null
  refreshTokenExpireTime: number | null
  updatedAt: string
}

const appStore = useAppStore()
const userStore = useUserStore()

const themeClass = computed(() => appStore.theme)
const systemInfo = uni.getSystemInfoSync()
const statusBarHeight = systemInfo.statusBarHeight || 0
const windowWidth = systemInfo.windowWidth || 375
const topBarStyle = {
  paddingTop: `calc(24rpx + ${statusBarHeight}px)`
}

const btnGridStyle = computed(() => ({
  gridTemplateColumns: windowWidth <= 430 ? '1fr' : 'repeat(2, minmax(0, 1fr))'
}))

const running = ref('')
const logs = ref<DebugLog[]>([])
const logId = ref(0)
const originalToken = ref('')
const nowTick = ref(Date.now())
let ttlTimer: ReturnType<typeof setInterval> | null = null

const snapshot = ref<AuthSnapshot>({
  loggedIn: false,
  token: '',
  authHeader: 'X-Service-Authorization',
  accessTokenExpireTime: null,
  refreshTokenExpireTime: null,
  updatedAt: '-'
})

const actionButtonStyle = computed(() => ({
  width: '100%',
  height: '82rpx',
  borderRadius: '14rpx',
  fontSize: '22rpx',
  fontWeight: '600',
  padding: '0 10rpx',
  color: 'var(--t-primary)',
  backgroundColor: 'var(--c-action)',
  border: '2rpx solid var(--c-border)'
}))

const dangerButtonStyle = computed(() => ({
  width: '100%',
  height: '82rpx',
  borderRadius: '14rpx',
  fontSize: '22rpx',
  fontWeight: '600',
  padding: '0 10rpx',
  color: '#ef4444',
  backgroundColor: 'rgba(239, 68, 68, 0.08)',
  border: '2rpx solid rgba(239, 68, 68, 0.22)'
}))

const tokenPreview = computed(() => {
  const token = snapshot.value.token
  if (!token) return '(空)'
  if (token.length <= 28) return token
  return `${token.slice(0, 14)}...${token.slice(-10)}`
})

const refreshTokenText = computed(() => {
  if (!snapshot.value.loggedIn) return '(空)'
  return 'HttpOnly Cookie（前端不可读）'
})

function pad2(value: number): string {
  return String(value).padStart(2, '0')
}

function formatDateTime(value: number | Date): string {
  const date = typeof value === 'number' ? new Date(value) : value
  if (Number.isNaN(date.getTime())) return '未知'
  const year = date.getFullYear()
  const month = pad2(date.getMonth() + 1)
  const day = pad2(date.getDate())
  const hour = pad2(date.getHours())
  const minute = pad2(date.getMinutes())
  const second = pad2(date.getSeconds())
  return `${year}年${month}月${day}日 ${hour}:${minute}:${second}`
}

function formatDuration(expireTime: number | null): string {
  if (!expireTime) return '未知'
  const diff = expireTime - nowTick.value
  if (diff <= 0) return '0天00时00分00秒'
  const totalSeconds = Math.floor(diff / 1000)
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return `${days}天${pad2(hours)}时${pad2(minutes)}分${pad2(seconds)}秒`
}

const accessExpireAtText = computed(() => {
  const expireTime = snapshot.value.accessTokenExpireTime
  if (!expireTime) return '未知'
  return formatDateTime(expireTime)
})

const accessTtlText = computed(() => {
  return formatDuration(snapshot.value.accessTokenExpireTime)
})

function getTokenFromStorage(): string {
  return uni.getStorageSync('user_token') || uni.getStorageSync('token') || ''
}

function getAuthHeaderFromStorage(): string {
  return uni.getStorageSync('authHeader') || 'X-Service-Authorization'
}

function getAccessExpireFromStorage(): number | null {
  const value = uni.getStorageSync('access_token_expire_time')
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() && !Number.isNaN(Number(value))) {
    return Number(value)
  }
  return null
}

function getRefreshExpireFromStorage(): number | null {
  const value = uni.getStorageSync('refresh_token_expire_time')
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() && !Number.isNaN(Number(value))) {
    return Number(value)
  }
  return null
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  try {
    return JSON.stringify(error)
  } catch {
    return '未知错误'
  }
}

function appendLog(level: LogLevel, text: string): void {
  logId.value += 1
  logs.value.unshift({
    id: logId.value,
    level,
    text,
    time: new Date().toLocaleTimeString()
  })
  if (logs.value.length > 80) {
    logs.value = logs.value.slice(0, 80)
  }
}

function updateSnapshot(): void {
  nowTick.value = Date.now()
  snapshot.value = {
    loggedIn: userStore.isLoggedIn(),
    token: getTokenFromStorage(),
    authHeader: getAuthHeaderFromStorage(),
    accessTokenExpireTime: getAccessExpireFromStorage(),
    refreshTokenExpireTime: getRefreshExpireFromStorage(),
    updatedAt: formatDateTime(new Date())
  }
}

async function runAction(actionName: string, action: () => Promise<void>): Promise<void> {
  if (running.value) {
    uni.showToast({
      title: `正在执行：${running.value}`,
      icon: 'none'
    })
    return
  }

  running.value = actionName
  appendLog('info', `${actionName} 开始`)
  try {
    await action()
  } catch (error) {
    appendLog('error', `${actionName} 失败：${getErrorMessage(error)}`)
  } finally {
    updateSnapshot()
    running.value = ''
  }
}

function handleBack(): void {
  uni.navigateBack({
    delta: 1,
    fail: () => {
      uni.reLaunch({
        url: '/pages/index/index'
      })
    }
  })
}

function handleRefreshStatus(): void {
  updateSnapshot()
  appendLog('info', '状态已刷新')
}

async function handleManualRefresh(): Promise<void> {
  await runAction('手动刷新Token', async () => {
    const result = await AuthAPI.refresh()
    const accessToken = result.accessToken || result.token || ''
    if (!accessToken) {
      throw new Error('refresh 响应中未返回 accessToken')
    }
    userStore.setAccessToken({
      accessToken,
      accessTokenExpireTime: result.accessTokenExpireTime,
      refreshTokenExpireTime: result.refreshTokenExpireTime,
      header: result.header || getAuthHeaderFromStorage()
    })
    appendLog('success', `refresh 成功，Access过期：${result.accessTokenExpireTime || '未知'}，Refresh过期：${result.refreshTokenExpireTime || '未知'}`)
  })
}

async function handleRequestUserInfo(): Promise<void> {
  await runAction('请求用户信息', async () => {
    const info = await UserAPI.getUserInfo()
    appendLog('success', `用户信息请求成功：${info.username || info.id}`)
  })
}

async function handleConcurrentRequest(): Promise<void> {
  await runAction('并发请求用户信息', async () => {
    const count = 5
    const requests = Array.from({ length: count }, () => UserAPI.getUserInfo())
    const results = await Promise.allSettled(requests)
    const successCount = results.filter(item => item.status === 'fulfilled').length
    const failCount = count - successCount
    appendLog('success', `并发完成：成功 ${successCount}，失败 ${failCount}`)
    if (failCount > 0) {
      const firstError = results.find(item => item.status === 'rejected') as PromiseRejectedResult | undefined
      if (firstError) {
        appendLog('error', `并发首个失败：${getErrorMessage(firstError.reason)}`)
      }
    }
  })
}

async function handleSetExpired(): Promise<void> {
  await runAction('设置过期时间', async () => {
    const currentToken = getTokenFromStorage()
    if (!currentToken) {
      throw new Error('当前无可用 token')
    }
    userStore.setAccessToken({
      accessToken: currentToken,
      accessTokenExpireTime: Date.now() - 60 * 1000,
      header: getAuthHeaderFromStorage()
    })
    appendLog('success', '已将 access token 标记为过期')
  })
}

async function handleSetFutureExpire(): Promise<void> {
  await runAction('设置未来过期时间', async () => {
    const currentToken = getTokenFromStorage()
    if (!currentToken) {
      throw new Error('当前无可用 token')
    }
    userStore.setAccessToken({
      accessToken: currentToken,
      accessTokenExpireTime: Date.now() + 1 * 60 * 1000,
      header: getAuthHeaderFromStorage()
    })
    appendLog('success', '已将 access token 标记为 1 分钟后过期')
  })
}

async function handleSetInvalidToken(): Promise<void> {
  await runAction('写入无效Token', async () => {
    const currentToken = getTokenFromStorage()
    if (currentToken && !originalToken.value) {
      originalToken.value = currentToken
    }
    userStore.setAccessToken({
      accessToken: `invalid-token-${Date.now()}`,
      accessTokenExpireTime: Date.now() + 10 * 60 * 1000,
      header: getAuthHeaderFromStorage()
    })
    appendLog('success', '已写入无效 token（用于触发 401 测试）')
  })
}

async function handleSimulateExpiredFlow(): Promise<void> {
  await runAction('模拟过期自动刷新', async () => {
    const currentToken = getTokenFromStorage()
    if (!currentToken) {
      throw new Error('当前无可用 token')
    }
    userStore.setAccessToken({
      accessToken: currentToken,
      accessTokenExpireTime: Date.now() - 1000,
      header: getAuthHeaderFromStorage()
    })
    appendLog('info', '已设置过期，开始请求用户信息')
    const info = await UserAPI.getUserInfo()
    appendLog('success', `请求成功：${info.username || info.id}（过期刷新链路有效）`)
  })
}

async function handleSimulate401Flow(): Promise<void> {
  await runAction('模拟401自动刷新', async () => {
    const oldToken = getTokenFromStorage()
    if (!oldToken) {
      throw new Error('当前无可用 token')
    }
    if (!originalToken.value) {
      originalToken.value = oldToken
    }
    userStore.setAccessToken({
      accessToken: `invalid-token-${Date.now()}`,
      accessTokenExpireTime: Date.now() + 10 * 60 * 1000,
      header: getAuthHeaderFromStorage()
    })
    appendLog('info', '已写入无效 token，开始请求用户信息')
    const info = await UserAPI.getUserInfo()
    appendLog('success', `请求成功：${info.username || info.id}（401 刷新重试链路有效）`)
  })
}

async function handleRestoreOriginalToken(): Promise<void> {
  await runAction('恢复初始Token', async () => {
    if (!originalToken.value) {
      throw new Error('没有可恢复的初始 token')
    }
    userStore.setAccessToken({
      accessToken: originalToken.value,
      header: getAuthHeaderFromStorage()
    })
    appendLog('success', '已恢复初始 token')
  })
}

async function handleClearAuth(): Promise<void> {
  await runAction('清理认证状态', async () => {
    userStore.logout()
    appendLog('success', '认证状态已清理')
  })
}

function clearLogs(): void {
  logs.value = []
}

function startTtlTimer(): void {
  if (ttlTimer) return
  ttlTimer = setInterval(() => {
    nowTick.value = Date.now()
  }, 1000)
}

function stopTtlTimer(): void {
  if (!ttlTimer) return
  clearInterval(ttlTimer)
  ttlTimer = null
}

onMounted(() => {
  updateSnapshot()
  originalToken.value = getTokenFromStorage()
  startTtlTimer()
  appendLog('info', '认证调试页已就绪')
})

onShow(() => {
  updateSnapshot()
  startTtlTimer()
})

onHide(() => {
  stopTtlTimer()
})

onUnmounted(() => {
  stopTtlTimer()
})
</script>

<style scoped>
.debug-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: linear-gradient(160deg, var(--c-bg) 0%, var(--c-bg-2) 100%);
  overflow: hidden;
  box-sizing: border-box;
}

.debug-container.light {
  --c-bg: #f4f7ff;
  --c-bg-2: #edf2ff;
  --c-card: rgba(255, 255, 255, 0.78);
  --c-border: rgba(132, 158, 225, 0.28);
  --c-action: rgba(63, 98, 255, 0.08);
  --t-primary: #0f172a;
  --t-regular: #475569;
  --c-shadow: rgba(29, 41, 83, 0.14);
}

.debug-container.dark {
  --c-bg: #070d1a;
  --c-bg-2: #0a1428;
  --c-card: rgba(12, 22, 41, 0.76);
  --c-border: rgba(101, 125, 170, 0.36);
  --c-action: rgba(128, 162, 255, 0.16);
  --t-primary: #f8fbff;
  --t-regular: #c6d2ea;
  --c-shadow: rgba(0, 0, 0, 0.34);
}

.top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14rpx;
  padding: 20rpx 28rpx 14rpx;
  box-sizing: border-box;
}

.top-btn {
  min-width: 96rpx;
  height: 58rpx;
  border-radius: 14rpx;
  border: 2rpx solid var(--c-border);
  background: var(--c-card);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.top-btn-text {
  font-size: 24rpx;
  color: var(--t-regular);
}

.top-title {
  flex: 1;
  min-width: 0;
  text-align: center;
  font-size: 34rpx;
  font-weight: 700;
  color: var(--t-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.content {
  flex: 1;
  width: 100%;
  padding: 0 24rpx calc(28rpx + env(safe-area-inset-bottom));
  box-sizing: border-box;
}

.card {
  background-color: var(--c-card);
  border-radius: 20rpx;
  border: 2rpx solid var(--c-border);
  box-shadow: 0 8rpx 28rpx var(--c-shadow);
  padding: 24rpx;
  margin-bottom: 18rpx;
  width: 100%;
  box-sizing: border-box;
  overflow: hidden;
}

.card-title {
  display: block;
  font-size: 30rpx;
  font-weight: 700;
  color: var(--t-primary);
  margin-bottom: 18rpx;
}

.card-subtitle {
  display: block;
  font-size: 22rpx;
  color: var(--t-regular);
  margin-top: -8rpx;
  margin-bottom: 16rpx;
}

.row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 18rpx;
  padding: 14rpx 0;
  border-bottom: 1rpx solid var(--c-border);
  width: 100%;
  box-sizing: border-box;
}

.row:last-child {
  border-bottom: none;
}

.label {
  font-size: 24rpx;
  color: var(--t-regular);
  flex-shrink: 0;
  width: 172rpx;
  line-height: 1.42;
}

.value {
  font-size: 24rpx;
  color: var(--t-primary);
  flex: 1;
  min-width: 0;
  text-align: right;
  line-height: 1.42;
  white-space: normal;
  word-break: break-all;
  overflow-wrap: anywhere;
}

.value.ok {
  color: #10b981;
}

.value.bad {
  color: #ef4444;
}

.value.mono {
  font-family: Consolas, Monaco, 'Courier New', monospace;
  font-size: 22rpx;
  background: var(--c-action);
  border: 1rpx dashed var(--c-border);
  border-radius: 10rpx;
  padding: 8rpx 10rpx;
}

.btn-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12rpx;
}

.log-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10rpx;
}

.clear-btn {
  min-width: 84rpx;
  height: 52rpx;
  border-radius: 12rpx;
  border: 2rpx solid var(--c-border);
  display: flex;
  align-items: center;
  justify-content: center;
}

.clear-btn-text {
  font-size: 22rpx;
  color: var(--t-regular);
}

.empty-log {
  font-size: 24rpx;
  color: var(--t-regular);
  padding: 20rpx 0 10rpx;
}

.log-list {
  display: flex;
  flex-direction: column;
  gap: 10rpx;
}

.log-item {
  border-radius: 12rpx;
  padding: 12rpx 14rpx;
  border: 1rpx solid var(--c-border);
  background: rgba(148, 163, 184, 0.08);
  width: 100%;
  box-sizing: border-box;
}

.log-item.level-success {
  background: rgba(16, 185, 129, 0.08);
}

.log-item.level-error {
  background: rgba(239, 68, 68, 0.1);
}

.log-time {
  display: block;
  font-size: 20rpx;
  color: var(--t-regular);
  margin-bottom: 6rpx;
}

.log-text {
  font-size: 23rpx;
  color: var(--t-primary);
  line-height: 1.45;
  white-space: normal;
  word-break: break-all;
  overflow-wrap: anywhere;
}
</style>
