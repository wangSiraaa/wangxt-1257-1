import { create } from 'zustand'
import type { User, UserRole } from '@/types'

interface AuthState {
  token: string | null
  user: User | null
  isAuthenticated: boolean
  login: (token: string, user: User) => void
  logout: () => void
  updateUser: (user: Partial<User>) => void
  hasRole: (...roles: UserRole[]) => boolean
}

const STORAGE_KEY = 'oil_recycle_auth'

function loadFromStorage(): Partial<AuthState> {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    if (data) {
      const parsed = JSON.parse(data)
      return {
        token: parsed.token || null,
        user: parsed.user || null,
        isAuthenticated: !!parsed.token
      }
    }
  } catch (e) {
    console.error('Failed to load auth from storage', e)
  }
  return {}
}

const initial = loadFromStorage()

export const useAuthStore = create<AuthState>((set, get) => ({
  token: initial.token || null,
  user: initial.user || null,
  isAuthenticated: initial.isAuthenticated || false,

  login: (token: string, user: User) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ token, user }))
    set({ token, user, isAuthenticated: true })
  },

  logout: () => {
    localStorage.removeItem(STORAGE_KEY)
    set({ token: null, user: null, isAuthenticated: false })
  },

  updateUser: (user: Partial<User>) => {
    const current = get().user
    if (current) {
      const updated = { ...current, ...user }
      const token = get().token
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ token, user: updated }))
      set({ user: updated })
    }
  },

  hasRole: (...roles: UserRole[]) => {
    const user = get().user
    if (!user) return false
    return roles.includes(user.role)
  }
}))
