import api from './http'
import type {
  LoginResponse, User, UserCreate, UserUpdate,
  Store, StoreCreate, StoreUpdate,
  Vehicle, VehicleCreate, VehicleUpdate, VehicleLocationUpdate,
  DisposalFactory, DisposalFactoryCreate, DisposalFactoryUpdate,
  Appointment, AppointmentCreate, AppointmentUpdate, AppointmentAccept,
  Weighing, WeighingCreate, WeighingUpdate, WeighingSign,
  Route, RouteCreate, RouteUpdate, TrackPoint,
  DisposalProof, DisposalProofCreate, DisposalProofUpdate, DisposalProofVerify,
  ExceptionItem, ExceptionCreate, ExceptionUpdate, ExceptionHandle,
  Settlement, SettlementUpdate, SettlementFreeze,
  DashboardResponse, MapData
} from '@/types'

export const authApi = {
  login: (username: string, password: string) =>
    api.post<any, LoginResponse>('/auth/login',
      new URLSearchParams({ username, password }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    ),
  getMe: () => api.get<any, User>('/auth/me'),
  changePassword: (old_password: string, new_password: string) =>
    api.post('/auth/change-password', { old_password, new_password })
}

export const userApi = {
  list: (params?: any) => api.get<any, User[]>('/users', { params }),
  get: (id: number) => api.get<any, User>(`/users/${id}`),
  create: (data: UserCreate) => api.post<any, User>('/users', data),
  update: (id: number, data: UserUpdate) => api.put<any, User>(`/users/${id}`, data),
  remove: (id: number) => api.delete(`/users/${id}`)
}

export const storeApi = {
  list: (params?: any) => api.get<any, Store[]>('/stores', { params }),
  get: (id: number) => api.get<any, Store>(`/stores/${id}`),
  create: (data: StoreCreate) => api.post<any, Store>('/stores', data),
  update: (id: number, data: StoreUpdate) => api.put<any, Store>(`/stores/${id}`, data),
  remove: (id: number) => api.delete(`/stores/${id}`)
}

export const vehicleApi = {
  list: (params?: any) => api.get<any, Vehicle[]>('/vehicles', { params }),
  get: (id: number) => api.get<any, Vehicle>(`/vehicles/${id}`),
  create: (data: VehicleCreate) => api.post<any, Vehicle>('/vehicles', data),
  update: (id: number, data: VehicleUpdate) => api.put<any, Vehicle>(`/vehicles/${id}`, data),
  updateLocation: (id: number, data: VehicleLocationUpdate) =>
    api.post<any, Vehicle>(`/vehicles/${id}/location`, data),
  remove: (id: number) => api.delete(`/vehicles/${id}`)
}

export const factoryApi = {
  list: (params?: any) => api.get<any, DisposalFactory[]>('/disposal-factories', { params }),
  get: (id: number) => api.get<any, DisposalFactory>(`/disposal-factories/${id}`),
  create: (data: DisposalFactoryCreate) => api.post<any, DisposalFactory>('/disposal-factories', data),
  update: (id: number, data: DisposalFactoryUpdate) => api.put<any, DisposalFactory>(`/disposal-factories/${id}`, data),
  remove: (id: number) => api.delete(`/disposal-factories/${id}`)
}

export const appointmentApi = {
  list: (params?: any) => api.get<any, Appointment[]>('/appointments', { params }),
  get: (id: number) => api.get<any, Appointment>(`/appointments/${id}`),
  create: (data: AppointmentCreate) => api.post<any, Appointment>('/appointments', data),
  update: (id: number, data: AppointmentUpdate) => api.put<any, Appointment>(`/appointments/${id}`, data),
  accept: (id: number, data: AppointmentAccept) =>
    api.post<any, Appointment>(`/appointments/${id}/accept`, data),
  cancel: (id: number) => api.post<any, Appointment>(`/appointments/${id}/cancel`)
}

export const weighingApi = {
  list: (params?: any) => api.get<any, Weighing[]>('/weighings', { params }),
  get: (id: number) => api.get<any, Weighing>(`/weighings/${id}`),
  create: (data: WeighingCreate) => api.post<any, Weighing>('/weighings', data),
  update: (id: number, data: WeighingUpdate) => api.put<any, Weighing>(`/weighings/${id}`, data),
  sign: (id: number, data: WeighingSign) =>
    api.post<any, Weighing>(`/weighings/${id}/sign`, data),
  verify: (id: number) => api.post<any, Weighing>(`/weighings/${id}/verify`)
}

export const routeApi = {
  list: (params?: any) => api.get<any, Route[]>('/routes', { params }),
  get: (id: number) => api.get<any, Route>(`/routes/${id}`),
  getTracks: (id: number) => api.get<any, TrackPoint[]>(`/routes/${id}/tracks`),
  create: (data: RouteCreate) => api.post<any, Route>('/routes', data),
  update: (id: number, data: RouteUpdate) => api.put<any, Route>(`/routes/${id}`, data),
  start: (id: number) => api.post<any, Route>(`/routes/${id}/start`),
  end: (id: number) => api.post<any, Route>(`/routes/${id}/end`),
  addTrack: (id: number, data: Partial<TrackPoint>) =>
    api.post(`/routes/${id}/track`, data)
}

export const disposalApi = {
  list: (params?: any) => api.get<any, DisposalProof[]>('/disposal-proofs', { params }),
  get: (id: number) => api.get<any, DisposalProof>(`/disposal-proofs/${id}`),
  create: (data: DisposalProofCreate) => api.post<any, DisposalProof>('/disposal-proofs', data),
  update: (id: number, data: DisposalProofUpdate) => api.put<any, DisposalProof>(`/disposal-proofs/${id}`, data),
  verify: (id: number, data: DisposalProofVerify) =>
    api.post<any, DisposalProof>(`/disposal-proofs/${id}/verify`, data)
}

export const exceptionApi = {
  list: (params?: any) => api.get<any, ExceptionItem[]>('/exceptions', { params }),
  get: (id: number) => api.get<any, ExceptionItem>(`/exceptions/${id}`),
  create: (data: ExceptionCreate) => api.post<any, ExceptionItem>('/exceptions', data),
  update: (id: number, data: ExceptionUpdate) => api.put<any, ExceptionItem>(`/exceptions/${id}`, data),
  handle: (id: number, data: ExceptionHandle) =>
    api.post<any, ExceptionItem>(`/exceptions/${id}/handle`, data)
}

export const settlementApi = {
  list: (params?: any) => api.get<any, Settlement[]>('/settlements', { params }),
  get: (id: number) => api.get<any, Settlement>(`/settlements/${id}`),
  update: (id: number, data: SettlementUpdate) => api.put<any, Settlement>(`/settlements/${id}`, data),
  freeze: (id: number, data: SettlementFreeze) =>
    api.post<any, Settlement>(`/settlements/${id}/freeze`, data),
  unfreeze: (id: number) => api.post<any, Settlement>(`/settlements/${id}/unfreeze`),
  pay: (id: number) => api.post<any, Settlement>(`/settlements/${id}/pay`)
}

export const dashboardApi = {
  get: () => api.get<any, DashboardResponse>('/dashboard'),
  getMapData: () => api.get<any, MapData>('/dashboard/map-data')
}
