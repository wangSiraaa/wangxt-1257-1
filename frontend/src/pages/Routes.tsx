import { useState, useEffect } from 'react'
import {
  Table, Button, Tag, Modal, Form, Select, Space, Card, App, Typography,
  Drawer, Descriptions, List, Progress
} from 'antd'
import {
  PlusOutlined, PlayCircleOutlined, StopOutlined,
  EnvironmentOutlined, EyeOutlined
} from '@ant-design/icons'
import dayjs from 'dayjs'
import type { ColumnsType } from 'antd/es/table'
import { MapContainer, TileLayer, Polyline, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import { routeApi, weighingApi, vehicleApi, factoryApi } from '@/api'
import { useAuthStore } from '@/store/auth'
import type { Route, Weighing, Vehicle, DisposalFactory, RouteStatus, TrackPoint } from '@/types'

const { Title, Text, Paragraph } = Typography
const { Option } = Select

const statusMap: Record<RouteStatus, { color: string, text: string }> = {
  planning: { color: 'default', text: '规划中' },
  in_transit: { color: 'processing', text: '运输中' },
  completed: { color: 'green', text: '已完成' },
  deviated: { color: 'red', text: '已偏离' }
}

const customIcon = (color: string) =>
  L.divIcon({
    className: 'custom-marker',
    html: `<div style="background:${color};width:20px;height:20px;border-radius:50%;border:2px solid #fff;"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10]
  })

function RoutesPage() {
  const [data, setData] = useState<Route[]>([])
  const [weighings, setWeighings] = useState<Weighing[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [factories, setFactories] = useState<DisposalFactory[]>([])
  const [tracks, setTracks] = useState<TrackPoint[]>([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [currentRoute, setCurrentRoute] = useState<Route | null>(null)
  const [form] = Form.useForm()
  const { message, modal } = App.useApp()
  const { user } = useAuthStore()

  const fetchData = async () => {
    setLoading(true)
    try {
      const [list, wList, vList, fList] = await Promise.all([
        routeApi.list({ limit: 200 }),
        weighingApi.list({ limit: 200 }),
        vehicleApi.list(),
        factoryApi.list()
      ])
      setData(list)
      setWeighings(wList)
      setVehicles(vList)
      setFactories(fList)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleCreate = async (values: any) => {
    try {
      const selectedWeighing = weighings.find(w => w.id === values.weighing_id)
      const selectedVehicle = vehicles.find(v => v.id === values.vehicle_id)
      const selectedFactory = factories.find(f => f.id === values.disposal_factory_id)

      if (!selectedWeighing || !selectedVehicle || !selectedFactory) {
        return
      }

      const plannedPath = [
        { longitude: selectedVehicle.current_longitude || 116.4, latitude: selectedVehicle.current_latitude || 39.9 },
        { longitude: selectedFactory.longitude, latitude: selectedFactory.latitude }
      ]

      await routeApi.create({
        weighing_id: values.weighing_id,
        vehicle_id: values.vehicle_id,
        disposal_factory_id: values.disposal_factory_id,
        planned_path: plannedPath
      })
      message.success('运输路线创建成功')
      setModalOpen(false)
      form.resetFields()
      fetchData()
    } catch (e) { }
  }

  const handleStart = (record: Route) => {
    modal.confirm({
      title: '确认开始运输',
      content: `确认开始路线 ${record.route_no} 的运输？`,
      onOk: async () => {
        try {
          await routeApi.start(record.id)
          message.success('运输已开始')
          fetchData()
        } catch (e) { }
      }
    })
  }

  const handleEnd = (record: Route) => {
    modal.confirm({
      title: '确认结束运输',
      content: `确认结束路线 ${record.route_no} 的运输？`,
      onOk: async () => {
        try {
          await routeApi.end(record.id)
          message.success('运输已结束')
          fetchData()
        } catch (e) { }
      }
    })
  }

  const showDetail = async (record: Route) => {
    setCurrentRoute(record)
    try {
      const trackData = await routeApi.getTracks(record.id)
      setTracks(trackData)
    } catch {
      setTracks([])
    }
    setDetailOpen(true)
  }

  const columns: ColumnsType<Route> = [
    { title: '路线编号', dataIndex: 'route_no', key: 'route_no', width: 180 },
    {
      title: '称重单',
      dataIndex: 'weighing_id',
      key: 'weighing_id',
      render: (v: number) => weighings.find(w => w.id === v)?.weighing_no || v
    },
    {
      title: '车辆',
      dataIndex: 'vehicle_id',
      key: 'vehicle_id',
      render: (v: number) => vehicles.find(x => x.id === v)?.plate_number || v
    },
    {
      title: '处置厂',
      dataIndex: 'disposal_factory_id',
      key: 'disposal_factory_id',
      render: (v: number) => factories.find(f => f.id === v)?.factory_name || v
    },
    { title: '距离(km)', dataIndex: 'distance_km', key: 'distance_km', render: (v?: number) => v ? Number(v).toFixed(2) : '-' },
    {
      title: '偏离次数',
      dataIndex: 'deviation_count',
      key: 'deviation_count',
      render: (v: number) => v > 0 ? <Tag color="red">{v}次</Tag> : <span style={{ color: '#52c41a' }}>0次</span>
    },
    {
      title: '最大偏离',
      dataIndex: 'max_deviation_meters',
      key: 'max_deviation_meters',
      render: (v: number) => Number(v || 0).toFixed(0) + 'm'
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (v: RouteStatus) => <Tag color={statusMap[v].color}>{statusMap[v].text}</Tag>
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (v: string) => dayjs(v).format('MM-DD HH:mm')
    },
    {
      title: '操作',
      key: 'action',
      width: 220,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => showDetail(record)}>轨迹</Button>
          {(record.status === 'planning' || record.status === 'deviated') && (user?.role === 'admin' || user?.role === 'driver') && (
            <Button type="link" size="small" icon={<PlayCircleOutlined />} onClick={() => handleStart(record)}>
              开始
            </Button>
          )}
          {(record.status === 'in_transit' || record.status === 'deviated') && (user?.role === 'admin' || user?.role === 'driver') && (
            <Button type="link" size="small" icon={<StopOutlined />} onClick={() => handleEnd(record)}>
              结束
            </Button>
          )}
        </Space>
      )
    }
  ]

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={3} style={{ margin: 0 }}>运输路线</Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setModalOpen(true)}
          disabled={!(user?.role === 'admin' || user?.role === 'driver' || user?.role === 'inspector')}
        >
          规划路线
        </Button>
      </div>

      <Card>
        <Table
          loading={loading}
          dataSource={data}
          columns={columns}
          rowKey="id"
          pagination={{ pageSize: 20 }}
        />
      </Card>

      <Modal
        title="规划运输路线"
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        width={500}
      >
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Form.Item
            label="称重记录"
            name="weighing_id"
            rules={[{ required: true, message: '请选择称重记录' }]}
          >
            <Select placeholder="请选择已签收的称重记录" showSearch optionFilterProp="children">
              {weighings.filter(w => w.status === 'signed' || w.status === 'verified').map(w => (
                <Option key={w.id} value={w.id}>
                  {w.weighing_no} - 净重{Number(w.net_weight_kg).toFixed(2)}kg
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            label="运输车辆"
            name="vehicle_id"
            rules={[{ required: true, message: '请选择车辆' }]}
          >
            <Select placeholder="请选择运输车辆">
              {vehicles.map(v => (
                <Option key={v.id} value={v.id}>{v.plate_number}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            label="目的处置厂"
            name="disposal_factory_id"
            rules={[{ required: true, message: '请选择处置厂' }]}
          >
            <Select placeholder="请选择处置厂">
              {factories.map(f => (
                <Option key={f.id} value={f.id}>{f.factory_name}</Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      <Drawer
        title={`运输轨迹 - ${currentRoute?.route_no || ''}`}
        width={720}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
      >
        {currentRoute && (
          <>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="路线编号" span={2}>{currentRoute.route_no}</Descriptions.Item>
              <Descriptions.Item label="车辆">{vehicles.find(v => v.id === currentRoute.vehicle_id)?.plate_number}</Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={statusMap[currentRoute.status].color}>
                  {statusMap[currentRoute.status].text}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="偏离次数">
                <Text type={currentRoute.deviation_count > 0 ? 'danger' : 'success'} strong>
                  {currentRoute.deviation_count}次
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="最大偏离距离">{Number(currentRoute.max_deviation_meters || 0).toFixed(0)}米</Descriptions.Item>
              <Descriptions.Item label="开始时间">
                {currentRoute.actual_start_time ? dayjs(currentRoute.actual_start_time).format('YYYY-MM-DD HH:mm') : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="结束时间">
                {currentRoute.actual_end_time ? dayjs(currentRoute.actual_end_time).format('YYYY-MM-DD HH:mm') : '-'}
              </Descriptions.Item>
            </Descriptions>

            <div style={{ height: 300, marginBottom: 16, borderRadius: 8, overflow: 'hidden' }}>
              <MapContainer
                center={[39.9042, 116.4074]}
                zoom={11}
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer
                  attribution='&copy; OpenStreetMap'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {Array.isArray(currentRoute.planned_path) && currentRoute.planned_path.length >= 2 && (
                  <Polyline
                    positions={currentRoute.planned_path.map((p: any) =>
                      [Number(p.latitude || p[1] || 39.9), Number(p.longitude || p[0] || 116.4)]
                    )}
                    pathOptions={{ color: '#52c41a', weight: 4, opacity: 0.8, dashArray: '10, 10' }}
                  />
                )}
                {tracks.length >= 2 && (
                  <Polyline
                    positions={tracks.map(t => [Number(t.latitude), Number(t.longitude)])}
                    pathOptions={{ color: '#1677ff', weight: 3, opacity: 0.9 }}
                  />
                )}
                {tracks.map((t, i) => (
                  <Marker
                    key={i}
                    position={[Number(t.latitude), Number(t.longitude)]}
                    icon={customIcon(t.is_deviated ? '#ff4d4f' : '#1677ff')}
                  >
                    <Popup>
                      {dayjs(t.recorded_at).format('HH:mm:ss')}
                      {t.is_deviated && <div style={{ color: '#ff4d4f' }}>已偏离</div>}
                      {t.deviation_distance_meters && <div>偏离: {Number(t.deviation_distance_meters).toFixed(0)}m</div>}
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>

            <div>
              <Text strong>轨迹点详情 ({tracks.length}个)</Text>
              {tracks.length === 0 ? (
                <Paragraph type="secondary" style={{ marginTop: 8 }}>
                  暂无轨迹数据
                </Paragraph>
              ) : (
                <List
                  size="small"
                  dataSource={tracks.slice().reverse()}
                  style={{ maxHeight: 200, overflow: 'auto' }}
                  renderItem={(t, idx) => (
                    <List.Item>
                      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                        <span>
                          <Tag color={t.is_deviated ? 'red' : 'blue'} style={{ marginRight: 8 }}>
                            {tracks.length - idx}
                          </Tag>
                          [{Number(t.latitude).toFixed(5)}, {Number(t.longitude).toFixed(5)}]
                          {t.speed_kmh && <span style={{ marginLeft: 8, color: '#888' }}>{Number(t.speed_kmh).toFixed(0)}km/h</span>}
                        </span>
                        <span style={{ fontSize: 12, color: '#999' }}>
                          {dayjs(t.recorded_at).format('HH:mm:ss')}
                          {t.is_deviated && <Tag color="red" style={{ marginLeft: 8 }}>偏离 {Number(t.deviation_distance_meters || 0).toFixed(0)}m</Tag>}
                        </span>
                      </div>
                    </List.Item>
                  )}
                />
              )}
            </div>
          </>
        )}
      </Drawer>
    </div>
  )
}

export default RoutesPage
