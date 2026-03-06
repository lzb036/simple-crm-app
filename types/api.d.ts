// API 响应类型定义
export interface ApiResponse<T = unknown> {
  code: number | string
  data?: T
  message?: string
  msg?: string
}

// 登录请求参数
export interface LoginParams {
  username: string
  password: string
  rememberMe?: boolean
  mode?: string
  authToken?: string
}

// 用户角色类型
export interface UserRole {
  id: string
  name: string
  code: string
}

// 管理员用户信息类型
export interface AdminUserInfo {
  id: string
  flag: boolean
  username: string
  email: string
  authVerifyType: string
  nickname: string
  realname: string
  initPwdChanged: boolean
  accountLocked: boolean
  roles: UserRole[]
}

// 登录响应数据
export interface LoginResponse {
  // 兼容旧接口
  token?: string
  // DEngineLite 双 Token 标准字段
  accessToken?: string
  accessTokenExpireTime?: number
  refreshTokenExpireTime?: number
  tokenType?: string
  header?: string
  userId?: string
  realName?: string
  verifyType?: number
  appUse?: string
}

// 刷新 Access Token 响应数据
export interface RefreshTokenResponse {
  // DEngineLite 标准字段
  accessToken?: string
  accessTokenExpireTime?: number
  refreshTokenExpireTime?: number
  tokenType?: string
  // 兼容旧字段
  token?: string
  header?: string
}

// 前端用户基础信息（Store 使用）
export interface UserInfo {
  id: string | number
  username?: string
  nickname?: string
  realName?: string
  realname?: string
  email?: string
  avatar?: string
  roles?: UserRole[]
  accountLocked?: boolean
}

// 分页器信息
export interface Pager {
  total: number
  rp: number
  current: number
  pages: number
}

// 提现记录
export interface WithdrawRecord {
  id: string
  userId: string
  userName: string
  account: string
  status: number
  statusName: string
  createTime: string
  confirmTime?: string
  amount: number
  receiveAmount: number
  showEmail: string
  addressLink: string
  tronLink?: string
  netConsume?: string
  energyUsageTotal?: string
  trxTotalFee?: number
}

// 提现列表查询参数
export interface WithdrawListParams {
  page: number
  pageSize: number
  account?: string
  status?: string
}

// 提现列表响应
export interface WithdrawListResponse {
  datas: {
    list: WithdrawRecord[]
    pager: Pager
  }
}

// 交易记录
export interface TradeRecord {
  errors: string[]
  id: string
  flag: boolean
  offerId?: string
  appId: number
  appName: string
  marketHashName: string
  marketName: string
  schemaId: string
  nums: number
  type: number
  status: number
  cancelReason?: number
  cancelDesc?: string
  buyer: string
  buyerName: string
  seller: string
  sellerName: string
  sellerSelfOwned: boolean
  createTime: string
  sendTime?: string
  receiveTime?: string
  endTime?: string
  protectionTime?: string
  price: number
  realPrice: number
  fee: number
  score: number
}

// 交易列表查询参数
export interface TradeListParams {
  page: number
  pageSize: number
  status?: number
  appId?: number
  buyerName?: string
  sellerName?: string
}

// 交易列表响应
export interface TradeListResponse {
  list: TradeRecord[]
  pager: Pager
}

// 物品详情记录
export interface TradeItemDetail {
  errors: string[]
  id: string
  flag: boolean
  appId: number
  appName: string
  marketHashName: string
  marketName: string
  schemaId: string
  recordId: string
  itemId: string
  assetId: string
  paintSeed?: number
  paintWear?: number
  status: number
  cancelDesc?: string
  stickers: any[]
  keychains: any[]
  price: number
  score: number
  realPrice: number
  fee: number
}

// 物品详情列表查询参数
export interface TradeItemListParams {
  page: number
  pageSize: number
  recordId: string
  appId: number
}

// 物品详情列表响应
export interface TradeItemListResponse {
  list: TradeItemDetail[]
  pager: Pager
}

// Ticket record
export interface TicketRecord {
  errors: string[]
  id: string
  flag: boolean
  title: string
  context: string
  creator: string
  createName: string
  createTime: string
  status: number
  statusName: string
  isTech: boolean
  isIgnore: boolean
  steamId?: string
}

// Ticket list params
export interface TicketListParams {
  page: number
  pageSize: number
  status?: string
  steamId?: string
  isIgnore?: boolean
}

// Ticket list response
export interface TicketListResponse {
  list: TicketRecord[]
  pager: Pager
}

// Customer record
export interface CustomerRecord {
  id: string
  name: string
  phoneLast4: string
  phone: string
  gender: 'M' | 'F' | 'U'
  birthDate: string
  age?: number
  address?: string
  referrerId?: string
  referrerName?: string
  remark?: string
  isDeleted: number
  createdAt: string
  updatedAt: string
}

// Customer list params
export interface CustomerListParams {
  page: number
  pageSize: number
}

// Customer list response
export interface CustomerListResponse {
  list: CustomerRecord[]
  pager: Pager
}
