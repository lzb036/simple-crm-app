import { getCurrentBaseURL } from '@/utils/baseurl'

// 全局状态
let isChecking = false
let downloadTask: any = null
let waiting: any = null

/**
 * 检查应用更新（全局只检查一次）
 */
export function checkUpdate() {
	if (isChecking) {
		console.log('[AppUpdate] 正在检查中，跳过重复请求')
		return
	}

	isChecking = true
	console.log('[AppUpdate] ===== 开始检查更新 =====')

	try {
		// @ts-ignore
		if (typeof plus === 'undefined') {
			console.log('[AppUpdate] plus API 不可用，当前环境可能不是 App 环境')
			isChecking = false
			return
		}

		console.log('[AppUpdate] plus API 可用，获取应用信息...')

		// @ts-ignore - plus.runtime 是 5+Runtime API
		plus.runtime.getProperty(plus.runtime.appid, (versionInfo: any) => {
			console.log('[AppUpdate] 当前版本信息:', versionInfo)

			const requestData = {
				appkey: 'simple-crm-app',
				versionName: versionInfo.version,
				hotVersion: versionInfo.versionCode,
				platform: uni.getSystemInfoSync().platform,
			}
			const requestUrl = getCurrentBaseURL() + '/api/public/app/checkupdate'
			const queryString = Object.entries(requestData)
				.filter(([, value]) => value !== undefined && value !== null && value !== '')
				.map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
				.join('&')
			const fullRequestUrl = queryString ? `${requestUrl}?${queryString}` : requestUrl

			console.log('[AppUpdate] 请求更新参数:', requestData)
			console.log('[AppUpdate] 检查更新完整请求地址:', fullRequestUrl)

			uni.request({
				url: requestUrl,
				method: 'GET',
				data: requestData,
				header: {
					'content-type': 'application/json;charset=UTF-8',
				},
			}).then((res: any) => {
				console.log('[AppUpdate] 服务器响应:', res.data)

				if (res.data.forwardUrl && res.data.forwardUrl.length > 0) {
					console.log('[AppUpdate] 发现更新包:', res.data.forwardUrl)

					try {
						if (res.data.forwardUrl.endsWith('.apk')) {
							console.log('[AppUpdate] 这是 APK 安装包，跳转浏览器下载')
							// @ts-ignore
							plus.runtime.openURL(res.data.packageUrl)
						} else {
							console.log('[AppUpdate] 开始热更新下载')
							startDownload(res.data.forwardUrl)
						}
					} catch (error) {
						console.log('[AppUpdate] 处理更新失败:', error)
					}
				} else {
					console.log('[AppUpdate] 当前已是最新版本，无需更新')
				}
				isChecking = false
			}).catch((err: any) => {
				console.log('[AppUpdate] 检查更新失败:', err)
				isChecking = false
			})
		})
	} catch (e) {
		console.log('[AppUpdate] 检查更新异常:', e)
		isChecking = false
	}
}

/**
 * 开始下载更新包
 */
function startDownload(forwardUrl: string) {
	console.log('[AppUpdate] 显示下载进度弹窗')

	// 使用 plus.nativeUI.showWaiting 显示带进度条的加载界面
	// @ts-ignore
	waiting = plus.nativeUI.showWaiting('正在下载更新包 0%', {
		width: '200px',
		height: '120px',
		size: '14px',
		padding: '15px',
		background: 'rgba(0,0,0,0.7)',
		color: '#ffffff'
	})

	let progress = 0

	// @ts-ignore - plus.downloader 是 5+Runtime API
	const task = plus.downloader.createDownload(forwardUrl, {
		method: 'GET',
		filename: '_doc/update/'
	}, (download: any, status: number) => {
		console.log('[AppUpdate] 下载完成, status:', status, 'filename:', download.filename)

		// 关闭进度弹窗
		if (waiting) {
			waiting.close()
			waiting = null
		}

		if (status === 200) {
			console.log('[AppUpdate] 开始安装更新包:', download.filename)

			// @ts-ignore
			plus.runtime.install(download.filename, {
				force: true
			}, () => {
				console.log('[AppUpdate] 安装成功，提示重启')
				uni.showModal({
					title: '更新完成',
					content: '应用已更新完成，需要重启才能生效',
					showCancel: false,
					confirmText: '立即重启',
					success: () => {
						console.log('[AppUpdate] 用户点击重启应用')
						// @ts-ignore
						plus.runtime.restart()
					}
				})
			}, (error: any) => {
				console.log('[AppUpdate] 安装失败:', error)
				uni.showToast({
					title: '安装失败',
					icon: 'none'
				})
			})
		} else {
			console.log('[AppUpdate] 下载失败, status:', status)
			uni.showToast({
				title: '下载失败',
				icon: 'none'
			})
		}
	})

	// 监听下载进度
	task.addEventListener('statechanged', (task: any, status: number) => {
		if (task.state === 3 && task.totalSize > 0) { // 下载中
			const currentProgress = parseInt(
				(task.downloadedSize / task.totalSize) * 100
			)
			// 只在进度变化时输出
			if (currentProgress !== progress) {
				progress = currentProgress
				console.log('[AppUpdate] 下载进度:', progress + '%', '(' + task.downloadedSize + '/' + task.totalSize + ' bytes)')

				// 更新进度弹窗
				if (waiting) {
					waiting.setTitle('正在下载更新包 ' + progress + '%')
				}
			}
		}
	})

	console.log('[AppUpdate] 启动下载任务')
	task.start()
	downloadTask = task
}
