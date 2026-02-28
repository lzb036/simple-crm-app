/**
 * 用户相关接口
 */

import request from '../index'
import type { AdminUserInfo } from '@/types/api'

const UserAPI = {
  /**
   * 获取当前登录用户信息
   * @returns 用户信息
   */
  getUserInfo(): Promise<AdminUserInfo> {
    return request.post('/api/mgr/user/getUserInfo', {})
  }
}

export default UserAPI
