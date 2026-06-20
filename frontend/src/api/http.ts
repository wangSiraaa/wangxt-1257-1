import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse } from 'axios'
import { message } from 'antd'
import { useAuthStore } from '@/store/auth'

const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

const api: AxiosInstance = axios.create({
  baseURL: `${baseURL}/api`,
  timeout: 30000
})

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = useAuthStore.getState().token
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

api.interceptors.response.use(
  (response: AxiosResponse) => response.data,
  (error) => {
    if (error.response) {
      const { status, data } = error.response
      if (status === 401) {
        useAuthStore.getState().logout()
        message.error('登录已过期，请重新登录')
      } else if (status === 403) {
        message.error('没有操作权限')
      } else if (status === 400 || status === 422) {
        const detail = data?.detail || '请求参数错误'
        if (typeof detail === 'string') {
          message.error(detail)
        } else if (Array.isArray(detail)) {
          message.error(detail.map((e: any) => e.msg).join('; '))
        }
      } else if (status >= 500) {
        message.error('服务器错误，请稍后重试')
      }
    } else if (error.request) {
      message.error('网络错误，请检查连接')
    }
    return Promise.reject(error)
  }
)

export default api
