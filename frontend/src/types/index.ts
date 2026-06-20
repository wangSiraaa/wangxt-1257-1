export type UserRole = 'admin' | 'store' | 'driver' | 'inspector'

export interface User {
  id: number
  username: string
  real_name: string
  phone?: string
  email?: string
  role: UserRole
  is_active: boolean
  avatar_url?: string
  created_at: string
  updated_at: string
}

export interface LoginResponse {
  access_token: string
  token_type: string
  user: User
}

export interface Store {
  id: number
  store_code: string
  store_name: string
  address: string
  longitude: number
  latitude: number
  contact_person: string
  contact_phone: string
  business_license?: string
  daily_output_kg: number
  user_id?: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export type VehicleStatus = 'idle' | 'in_service' | 'maintenance' | 'disabled'

export interface Vehicle {
  id: number
  plate_number: string
  vehicle_type: string
  capacity_kg: number
  driver_id?: number
  status: VehicleStatus
  device_id?: string
  current_longitude?: number
  current_latitude?: number
  last_update_time?: string
  created_at: string
  updated_at: string
}

export interface DisposalFactory {
  id: number
  factory_code: string
  factory_name: string
  address: string
  longitude: number
  latitude: number
  contact_person: string
  contact_phone: string
  qualification_cert?: string
  user_id?: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export type AppointmentStatus = 'pending' | 'accepted' | 'completed' | 'cancelled'

export interface Appointment {
  id: number
  appointment_no: string
  store_id: number
  vehicle_id?: number
  driver_id?: number
  expected_weight_kg: number
  oil_type: string
  appointment_time: string
  actual_arrive_time?: string
  actual_complete_time?: string
  status: AppointmentStatus
  remark?: string
  created_by?: number
  created_at: string
  updated_at: string
}

export type WeighingStatus = 'draft' | 'signed' | 'verified' | 'exception'

export interface Weighing {
  id: number
  weighing_no: string
  appointment_id: number
  store_id: number
  vehicle_id: number
  driver_id: number
  declared_weight_kg: number
  actual_weight_kg: number
  tare_weight_kg: number
  net_weight_kg: number
  weight_diff_percent?: number
  photo_urls?: string[]
  status: WeighingStatus
  signature_data?: string
  signed_at?: string
  signed_by?: number
  remark?: string
  created_at: string
  updated_at: string
}

export type RouteStatus = 'planning' | 'in_transit' | 'completed' | 'deviated'

export interface RoutePoint {
  longitude: number
  latitude: number
  order?: number
}

export interface Route {
  id: number
  route_no: string
  weighing_id: number
  vehicle_id: number
  disposal_factory_id: number
  planned_path: RoutePoint[]
  actual_start_time?: string
  actual_end_time?: string
  distance_km?: number
  status: RouteStatus
  deviation_count: number
  max_deviation_meters: number
  created_at: string
  updated_at: string
}

export interface TrackPoint {
  id: number
  longitude: number
  latitude: number
  speed_kmh?: number
  heading?: number
  is_deviated: boolean
  deviation_distance_meters?: number
  recorded_at: string
}

export type DisposalStatus = 'pending' | 'verified' | 'rejected'

export interface DisposalProof {
  id: number
  proof_no: string
  weighing_id: number
  route_id: number
  disposal_factory_id: number
  vehicle_id: number
  received_weight_kg: number
  weight_diff_kg?: number
  weight_diff_percent?: number
  receive_time: string
  received_by?: number
  photo_urls?: string[]
  status: DisposalStatus
  verified_by?: number
  verified_at?: string
  remark?: string
  created_at: string
  updated_at: string
}

export type ExceptionType = 'weight_diff' | 'route_deviation' | 'no_signature' | 'timeout'
export type ExceptionStatus = 'open' | 'processing' | 'resolved' | 'closed'

export interface ExceptionItem {
  id: number
  exception_no: string
  type: ExceptionType
  related_type?: string
  related_id?: number
  title: string
  description?: string
  severity: number
  status: ExceptionStatus
  handled_by?: number
  handled_at?: string
  handle_note?: string
  created_at: string
  updated_at: string
}

export type SettlementStatus = 'pending' | 'frozen' | 'paid' | 'cancelled'

export interface Settlement {
  id: number
  settlement_no: string
  store_id: number
  weighing_id: number
  weight_kg: number
  unit_price: number
  total_amount: number
  status: SettlementStatus
  is_frozen: boolean
  frozen_reason?: string
  paid_at?: string
  paid_by?: number
  remark?: string
  created_at: string
  updated_at: string
}

export interface DailyStats {
  date: string
  weight_kg: number
  count: number
}

export interface DashboardStats {
  total_stores: number
  active_vehicles: number
  today_appointments: number
  today_weighings: number
  pending_exceptions: number
  pending_verifications: number
  total_weight_kg_today: number
  total_amount_today: number
}

export interface DashboardResponse {
  stats: DashboardStats
  weekly_trend: DailyStats[]
  recent_exceptions: any[]
  recent_weighings: any[]
}

export interface MapData {
  stores: Store[]
  vehicles: Vehicle[]
  factories: DisposalFactory[]
  active_appointments: number
}

export interface UserCreate {
  username: string
  password: string
  real_name: string
  phone?: string
  email?: string
  role: UserRole
  is_active?: boolean
}

export interface UserUpdate {
  real_name?: string
  phone?: string
  email?: string
  role?: UserRole
  is_active?: boolean
}

export interface StoreCreate {
  store_code: string
  store_name: string
  address: string
  longitude: number
  latitude: number
  contact_person: string
  contact_phone: string
  business_license?: string
  daily_output_kg?: number
  user_id?: number
  is_active?: boolean
}

export interface StoreUpdate {
  store_name?: string
  address?: string
  longitude?: number
  latitude?: number
  contact_person?: string
  contact_phone?: string
  business_license?: string
  daily_output_kg?: number
  user_id?: number
  is_active?: boolean
}

export interface VehicleCreate {
  plate_number: string
  vehicle_type: string
  capacity_kg: number
  driver_id?: number
  status?: VehicleStatus
  device_id?: string
}

export interface VehicleUpdate {
  vehicle_type?: string
  capacity_kg?: number
  driver_id?: number
  status?: VehicleStatus
  device_id?: string
}

export interface VehicleLocationUpdate {
  longitude: number
  latitude: number
  speed_kmh?: number
  heading?: number
}

export interface DisposalFactoryCreate {
  factory_code: string
  factory_name: string
  address: string
  longitude: number
  latitude: number
  contact_person: string
  contact_phone: string
  qualification_cert?: string
  user_id?: number
  is_active?: boolean
}

export interface DisposalFactoryUpdate {
  factory_name?: string
  address?: string
  longitude?: number
  latitude?: number
  contact_person?: string
  contact_phone?: string
  qualification_cert?: string
  user_id?: number
  is_active?: boolean
}

export interface AppointmentCreate {
  store_id: number
  expected_weight_kg: number
  oil_type?: string
  appointment_time: string | Date
  remark?: string
}

export interface AppointmentUpdate {
  expected_weight_kg?: number
  oil_type?: string
  appointment_time?: string | Date
  remark?: string
}

export interface AppointmentAccept {
  vehicle_id: number
}

export interface WeighingCreate {
  appointment_id: number
  store_id: number
  vehicle_id: number
  driver_id: number
  declared_weight_kg: number
  actual_weight_kg: number
  tare_weight_kg: number
  photo_urls?: string[]
  remark?: string
}

export interface WeighingUpdate {
  declared_weight_kg?: number
  actual_weight_kg?: number
  tare_weight_kg?: number
  photo_urls?: string[]
  remark?: string
}

export interface WeighingSign {
  signature_data: string
  signed_by?: number
}

export interface RouteCreate {
  weighing_id: number
  vehicle_id: number
  disposal_factory_id: number
  planned_path: RoutePoint[]
}

export interface RouteUpdate {
  planned_path?: RoutePoint[]
  status?: RouteStatus
}

export interface DisposalProofCreate {
  weighing_id: number
  route_id: number
  disposal_factory_id: number
  vehicle_id: number
  received_weight_kg: number
  receive_time: string | Date
  received_by?: number
  photo_urls?: string[]
  remark?: string
}

export interface DisposalProofUpdate {
  received_weight_kg?: number
  receive_time?: string | Date
  photo_urls?: string[]
  remark?: string
}

export interface DisposalProofVerify {
  status: 'verified' | 'rejected'
  verify_note?: string
}

export interface ExceptionCreate {
  type: ExceptionType
  related_type?: string
  related_id?: number
  title: string
  description?: string
  severity?: number
}

export interface ExceptionUpdate {
  title?: string
  description?: string
  severity?: number
  status?: ExceptionStatus
}

export interface ExceptionHandle {
  status: ExceptionStatus
  handle_note: string
}

export interface SettlementUpdate {
  remark?: string
}

export interface SettlementFreeze {
  frozen_reason: string
}
