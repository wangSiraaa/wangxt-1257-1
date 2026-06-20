import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import MainLayout from '@/layouts/MainLayout'
import Login from '@/pages/Login'
import Dashboard from '@/pages/Dashboard'
import Appointments from '@/pages/Appointments'
import Weighings from '@/pages/Weighings'
import RoutesPage from '@/pages/Routes'
import DisposalProofs from '@/pages/DisposalProofs'
import Exceptions from '@/pages/Exceptions'
import MapMonitor from '@/pages/MapMonitor'
import Settlements from '@/pages/Settlements'
import Stores from '@/pages/Stores'
import Vehicles from '@/pages/Vehicles'
import Users from '@/pages/Users'
import DisposalFactories from '@/pages/DisposalFactories'

function App() {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated)

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    )
  }

  return (
    <Routes>
      <Route path="/" element={<MainLayout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="map" element={<MapMonitor />} />
        <Route path="appointments" element={<Appointments />} />
        <Route path="weighings" element={<Weighings />} />
        <Route path="routes" element={<RoutesPage />} />
        <Route path="disposal-proofs" element={<DisposalProofs />} />
        <Route path="exceptions" element={<Exceptions />} />
        <Route path="settlements" element={<Settlements />} />
        <Route path="stores" element={<Stores />} />
        <Route path="vehicles" element={<Vehicles />} />
        <Route path="disposal-factories" element={<DisposalFactories />} />
        <Route path="users" element={<Users />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

export default App
