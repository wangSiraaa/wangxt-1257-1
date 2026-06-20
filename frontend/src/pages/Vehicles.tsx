import { useState, useEffect } from 'react'
import {
  Table, Button, Tag, Modal, Form, Input, Select, Switch,
  Space, Card, App, Typography, Popconfirm, InputNumber
} from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, CarOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import type { ColumnsType } from 'antd/es/table'
import { vehicleApi, userApi } from '@/api'
import { useAuthStore } from '@/store/auth'
import type { Vehicle, User, VehicleStatus } from '@/types'

const { Title } = Typography
const { Option } = Select

const statusMap: Record<VehicleStatus, { color: string, text: string }> = {
  idle: { color: 'green', text: '空闲' },
  in_service: { color: 'blue', text: '作业中' },
  maintenance: { color: 'orange', text: '维护中' },
  disabled: { color: 'default', text: '停用' }
}

function Vehicles() {
  const [data, setData] = useState<Vehicle[]>([])
  const [drivers, setDrivers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editRecord, setEditRecord] = useState<Vehicle | null>(null)
  const [form] = Form.useForm()
  const { message } = App.useApp()
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'admin'

  const fetchData = async () => {
    setLoading(true)
    try {
      const [list, driverList] = await Promise.all([
        vehicleApi.list(),
        userApi.list({ role: 'driver' })
      ])
      setData(list)
      setDrivers(driverList)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleCreate = () => {
    setEditRecord(null)
    form.resetFields()
    form.setFieldsValue({ status: 'idle' })
    setModalOpen(true)
  }

  const handleEdit = (record: Vehicle) => {
    setEditRecord(record)
    form.setFieldsValue(record)
    setModalOpen(true)
  }

  const handleDelete = async (id: number) => {
    try {
      await vehicleApi.remove(id)
      message.success('删除成功')
      fetchData()
    } catch (e) { }
  }

  const handleSubmit = async (values: any) => {
    try {
      if (editRecord) {
        await vehicleApi.update(editRecord.id, values)
        message.success('车辆更新成功')
      } else {
        await vehicleApi.create(values)
        message.success('车辆创建成功')
      }
      setModalOpen(false)
      form.resetFields()
      setEditRecord(null)
      fetchData()
    } catch (e) { }
  }

  const columns: ColumnsType<Vehicle> = [
    { title: '车牌号', dataIndex: 'plate_number', key: 'plate_number', width: 120,
      render: (v: string) => (
        <Space>
          <CarOutlined style={{ color: '#1677ff' }} />
          <b>{v}</b>
        </Space>
      )
    },
    { title: '车辆类型', dataIndex: 'vehicle_type', key: 'vehicle_type' },
    {
      title: '载重(kg)',
      dataIndex: 'capacity_kg',
      key: 'capacity_kg',
      render: (v: number) => Number(v).toFixed(0)
    },
    {
      title: '司机',
      dataIndex: 'driver_id',
      key: 'driver_id',
      render: (v?: number) => v ? drivers.find(d => d.id === v)?.real_name || v : '-'
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (v: VehicleStatus) => (
        <Tag color={statusMap[v].color}>{statusMap[v].text}</Tag>
      )
    },
    { title: '设备ID', dataIndex: 'device_id', key: 'device_id', render: (v?: string) => v || '-' },
    {
      title: '当前位置',
      key: 'location',
      render: (_, record) => record.current_longitude && record.current_latitude ? (
        <span style={{ fontSize: 12 }}>
          {Number(record.current_longitude).toFixed(3)}, {Number(record.current_latitude).toFixed(3)}
        </span>
      ) : <Tag>暂无定位</Tag>
    },
    {
      title: '最后更新',
      dataIndex: 'last_update_time',
      key: 'last_update_time',
      render: (v?: string) => v ? dayjs(v).format('MM-DD HH:mm') : '-'
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
      width: 150,
      render: (_, record) => (
        <Space size="small">
          {isAdmin && (
            <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
              编辑
            </Button>
          )}
          {isAdmin && record.status !== 'in_service' && (
            <Popconfirm title="确认删除该车辆？" onConfirm={() => handleDelete(record.id)}>
              <Button type="link" size="small" danger icon={<DeleteOutlined />}>删除</Button>
            </Popconfirm>
          )}
        </Space>
      )
    }
  ]

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={3} style={{ margin: 0 }}>车辆管理</Title>
        <div style={{ display: 'flex', gap: 8 }}>
          <Tag color="green" style={{ padding: '4px 12px', fontSize: 14 }}>
            空闲: {data.filter(d => d.status === 'idle').length}
          </Tag>
          <Tag color="blue" style={{ padding: '4px 12px', fontSize: 14 }}>
            作业中: {data.filter(d => d.status === 'in_service').length}
          </Tag>
          <Tag color="orange" style={{ padding: '4px 12px', fontSize: 14 }}>
            维护中: {data.filter(d => d.status === 'maintenance').length}
          </Tag>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleCreate}
          disabled={!isAdmin}
        >
          新建车辆
        </Button>
      </div>

      <Card style={{ marginTop: 16 }}>
        <Table
          loading={loading}
          dataSource={data}
          columns={columns}
          rowKey="id"
          pagination={{ pageSize: 20 }}
        />
      </Card>

      <Modal
        title={editRecord ? '编辑车辆' : '新建车辆'}
        open={modalOpen}
        onCancel={() => { setModalOpen(false); setEditRecord(null); form.resetFields() }}
        onOk={() => form.submit()}
        width={500}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            label="车牌号"
            name="plate_number"
            rules={[{ required: true, message: '请输入车牌号' }]}
          >
            <Input placeholder="如：京A12345" disabled={!!editRecord} />
          </Form.Item>
          <Form.Item
            label="车辆类型"
            name="vehicle_type"
            rules={[{ required: true, message: '请输入车辆类型' }]}
          >
            <Select placeholder="选择车辆类型">
              <Option value="小型回收车">小型回收车</Option>
              <Option value="中型回收车">中型回收车</Option>
              <Option value="大型回收车">大型回收车</Option>
              <Option value="密封罐车">密封罐车</Option>
            </Select>
          </Form.Item>
          <Form.Item
            label="载重(kg)"
            name="capacity_kg"
            rules={[{ required: true, message: '请输入载重' }]}
          >
            <InputNumber min={0} precision={0} style={{ width: '100%' }} placeholder="最大载重量(kg)" />
          </Form.Item>
          <Form.Item
            label="司机"
            name="driver_id"
          >
            <Select placeholder="选择司机" allowClear>
              {drivers.map(d => (
                <Option key={d.id} value={d.id}>{d.real_name} ({d.phone})</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            label="设备ID"
            name="device_id"
          >
            <Input placeholder="GPS追踪设备ID（选填）" />
          </Form.Item>
          <Form.Item label="状态" name="status">
            <Select>
              <Option value="idle">空闲</Option>
              <Option value="maintenance">维护中</Option>
              <Option value="disabled">停用</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default Vehicles
