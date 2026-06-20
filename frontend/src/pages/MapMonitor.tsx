import { useState, useEffect, useRef } from 'react'
import { Card, Button, Tag, Badge, Space, List, Drawer, Typography, App } from 'antd'
import { PlayCircleOutlined, PauseCircleOutlined, ReloadOutlined } from '@ant-design/icons'
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet'
import L from 'leaflet'
import type { LatLngTuple } from 'leaflet'
import dayjs from 'dayjs'
import { dashboardApi, routeApi, vehicleApi } from '@/api'
import type { MapData, Vehicle, TrackPoint, Route } from '@/types'

const { Title, Text, Paragraph } = Typography

const customIcon = (color: string) =>
  L.divIcon({
    className: 'custom-marker',
    html: `<div style="background:${color};width:24px;height:24px;border-radius:50%;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;"><span style="color:#fff;font-size:12px;font-weight:bold;"></span></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  })

const vehicleStatusColor: Record<string, string> = {
  idle: '#52c41a',
  in_service: '#1890ff',
  maintenance: '#faad14',
  disabled: '#bfbfbf'
}

function simulateMovement(
  start: LatLngTuple,
  end: LatLngTuple,
  progress: number
): LatLngTuple {
  return [
    start[0] + (end[0] - start[0]) * progress,
    start[1] + (end[1] - start[1]) * progress
  ]
}

function MapMonitor() {
  const [mapData, setMapData] = useState<MapData | null>(null)
  const [simulating, setSimulating] = useState(false)
  const [simVehicles, setSimVehicles] = useState<Map<number, LatLngTuple>>(new Map())
  const [activeVehicle, setActiveVehicle] = useState<Vehicle | null>(null)
  const [tracks, setTracks] = useState<TrackPoint[]>([])
  const [trackDrawerOpen, setTrackDrawerOpen] = useState(false)
  const intervalRef = useRef<number | null>(null)
  const { message } = App.useApp()

  const fetchData = async () => {
    try {
      const data = await dashboardApi.getMapData()
      setMapData(data)
      const initial = new Map<number, LatLngTuple>()
      data.vehicles.forEach(v => {
        if (v.current_latitude && v.current_longitude) {
          initial.set(v.id, [Number(v.current_latitude), Number(v.current_longitude)])
        }
      })
      setSimVehicles(initial)
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    fetchData()
    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current)
      }
    }
  }, [])

  const startSimulation = () => {
    if (!mapData) return
    setSimulating(true)
    message.info('已启动实时轨迹模拟')
    let progress = 0

    intervalRef.current = window.setInterval(async () => {
      progress += 0.02
      if (progress > 1) progress = 0

      setSimVehicles(prev => {
        const next = new Map(prev)
        mapData.vehicles.forEach((v, idx) => {
          if (v.status === 'in_service' || v.status === 'idle') {
            const stores = mapData.stores
            const factories = mapData.factories
            if (stores.length > 0 && factories.length > 0) {
              const store = stores[idx % stores.length]
              const factory = factories[idx % factories.length]
              const start: LatLngTuple = [Number(store.latitude), Number(store.longitude)]
              const end: LatLngTuple = [Number(factory.latitude), Number(factory.longitude)]
              const newPos = simulateMovement(start, end, progress + idx * 0.1)
              next.set(v.id, newPos)

              vehicleApi.updateLocation(v.id, {
                longitude: newPos[1],
                latitude: newPos[0]
              }).catch(() => {})
            }
          }
        })
        return next
      })
    }, 2000)
  }

  const stopSimulation = () => {
    setSimulating(false)
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    message.info('已停止轨迹模拟')
  }

  const showVehicleTracks = async (vehicle: Vehicle) => {
    setActiveVehicle(vehicle)
    try {
      const routes = await routeApi.list({ vehicle_id: vehicle.id, limit: 5 })
      if (routes.length > 0) {
        const trackData = await routeApi.getTracks(routes[0].id)
        setTracks(trackData)
      } else {
        setTracks([])
      }
      setTrackDrawerOpen(true)
    } catch (e) {
      console.error(e)
    }
  }

  const center: LatLngTuple = [39.9042, 116.4074]

  const pathCoords: LatLngTuple[] = tracks.length > 0
    ? tracks.map(t => [Number(t.latitude), Number(t.longitude)])
    : []

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={3} style={{ margin: 0 }}>地图监控</Title>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetchData}>刷新</Button>
          {!simulating ? (
            <Button type="primary" icon={<PlayCircleOutlined />} onClick={startSimulation}>
              启动实时模拟
            </Button>
          ) : (
            <Button danger icon={<PauseCircleOutlined />} onClick={stopSimulation}>
              停止模拟
            </Button>
          )}
        </Space>
      </div>

      <div style={{ display: 'flex', gap: 16, height: 'calc(100vh - 64px - 48px - 120px)' }}>
        <div style={{ flex: 1 }}>
          <Card style={{ height: '100%', padding: 0 }} bodyStyle={{ padding: 0, height: '100%' }}>
            <MapContainer center={center} zoom={11} style={{ height: '100%', width: '100%' }}>
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {mapData?.stores.map(store => (
                <Marker
                  key={`store-${store.id}`}
                  position={[Number(store.latitude), Number(store.longitude)]}
                  icon={customIcon('#1890ff')}
                >
                  <Popup>
                    <div style={{ minWidth: 180 }}>
                      <Text strong style={{ fontSize: 14 }}>{store.store_name}</Text>
                      <Paragraph style={{ margin: '4px 0', fontSize: 12 }}>
                        门店编码: {store.store_code}<br />
                        地址: {store.address}<br />
                        联系人: {store.contact_person} {store.contact_phone}
                      </Paragraph>
                    </div>
                  </Popup>
                </Marker>
              ))}
              {mapData?.factories.map(f => (
                <Marker
                  key={`factory-${f.id}`}
                  position={[Number(f.latitude), Number(f.longitude)]}
                  icon={customIcon('#722ed1')}
                >
                  <Popup>
                    <div style={{ minWidth: 180 }}>
                      <Text strong style={{ fontSize: 14, color: '#722ed1' }}>处置厂: {f.factory_name}</Text>
                      <Paragraph style={{ margin: '4px 0', fontSize: 12 }}>
                        编码: {f.factory_code}<br />
                        地址: {f.address}<br />
                        联系人: {f.contact_person} {f.contact_phone}
                      </Paragraph>
                    </div>
                  </Popup>
                </Marker>
              ))}
              {mapData?.vehicles.map(v => {
                const pos = simVehicles.get(v.id)
                if (!pos) return null
                return (
                  <Marker
                    key={`vehicle-${v.id}`}
                    position={pos}
                    icon={customIcon(vehicleStatusColor[v.status] || '#1890ff')}
                    eventHandlers={{ click: () => showVehicleTracks(v) }}
                  >
                    <Popup>
                      <div style={{ minWidth: 180 }}>
                        <Text strong style={{ fontSize: 14 }}>{v.plate_number}</Text>
                        <Paragraph style={{ margin: '4px 0', fontSize: 12 }}>
                          状态: {v.status}<br />
                          类型: {v.vehicle_type}<br />
                          载重: {Number(v.capacity_kg).toFixed(0)}kg<br />
                          <span style={{ color: '#1890ff', cursor: 'pointer' }} onClick={() => showVehicleTracks(v)}>
                            点击查看轨迹
                          </span>
                        </Paragraph>
                      </div>
                    </Popup>
                  </Marker>
                )
              })}
              {pathCoords.length >= 2 && (
                <Polyline
                  positions={pathCoords}
                  pathOptions={{ color: '#1677ff', weight: 4, opacity: 0.8 }}
                />
              )}
            </MapContainer>
          </Card>
        </div>

        <div style={{ width: 320 }}>
          <Card title="车辆状态" style={{ height: '100%', overflow: 'auto' }} bodyStyle={{ padding: 12 }}>
            <List
              size="small"
              dataSource={mapData?.vehicles || []}
              renderItem={v => {
                const pos = simVehicles.get(v.id)
                return (
                  <List.Item
                    onClick={() => showVehicleTracks(v)}
                    style={{ cursor: 'pointer', padding: '12px 8px', borderBottom: '1px solid #f0f0f0' }}
                  >
                    <div style={{ width: '100%' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <Text strong>{v.plate_number}</Text>
                        <Badge
                          status={v.status === 'in_service' ? 'processing' : v.status === 'idle' ? 'success' : 'warning'}
                          text={v.status}
                        />
                      </div>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {v.vehicle_type} · 载重{Number(v.capacity_kg).toFixed(0)}kg
                      </Text>
                      {pos && (
                        <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>
                          位置: {pos[0].toFixed(4)}, {pos[1].toFixed(4)}
                          {v.last_update_time && ` · ${dayjs(v.last_update_time).format('HH:mm:ss')}`}
                        </div>
                      )}
                    </div>
                  </List.Item>
                )
              }}
            />
          </Card>
        </div>
      </div>

      <Drawer
        title={`车辆轨迹 - ${activeVehicle?.plate_number || ''}`}
        placement="right"
        width={400}
        open={trackDrawerOpen}
        onClose={() => setTrackDrawerOpen(false)}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <div>
            <Text strong>车辆信息</Text>
            <Paragraph style={{ marginTop: 8 }}>
              车牌号: {activeVehicle?.plate_number}<br />
              状态: <Tag color={vehicleStatusColor[activeVehicle?.status || 'idle']}>{activeVehicle?.status}</Tag><br />
              类型: {activeVehicle?.vehicle_type}<br />
              载重: {Number(activeVehicle?.capacity_kg || 0).toFixed(0)}kg
            </Paragraph>
          </div>
          <div>
            <Text strong>轨迹点 ({tracks.length}个)</Text>
            {tracks.length === 0 ? (
              <Paragraph type="secondary" style={{ marginTop: 8 }}>
                暂无轨迹数据，启动实时模拟后可生成。
              </Paragraph>
            ) : (
              <List
                size="small"
                dataSource={tracks.slice(-20).reverse()}
                renderItem={(t, idx) => (
                  <List.Item>
                    <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between' }}>
                      <span>
                        {Number(t.latitude).toFixed(5)}, {Number(t.longitude).toFixed(5)}
                      </span>
                      <span style={{ fontSize: 12 }}>
                        {t.is_deviated && <Tag color="red">偏离</Tag>}
                        {dayjs(t.recorded_at).format('HH:mm:ss')}
                      </span>
                    </div>
                  </List.Item>
                )}
              />
            )}
          </div>
        </Space>
      </Drawer>
    </div>
  )
}

export default MapMonitor
