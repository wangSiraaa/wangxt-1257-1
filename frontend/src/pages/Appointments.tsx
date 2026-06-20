import { useState, useEffect } from 'react'
import {
  Table, Button, Tag, Modal, Form, Input, Select, DatePicker, InputNumber,
  Space, Card, App, Typography, Popconfirm
} from 'antd'
import { PlusOutlined, CheckOutlined, CloseOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import type { ColumnsType } from 'antd/es/table'
import { appointmentApi, storeApi, vehicleApi } from '@/api'
import { useAuthStore } from '@/store/auth'
import type { Appointment, Store, Vehicle, AppointmentStatus } from '@/types'

const { Title, Text } = Typography
const { Option } = Select
const { TextArea } = Input

const statusMap: Record<AppointmentStatus, { color: string, text: string }> = {
  pending: { color: 'blue', text: '待接单' },
  accepted: { color: 'cyan', text: '已接单' },
  completed: { color: 'green', text: '已完成' },
  cancelled: { color: 'default', text: '已取消' }
}

function Appointments() {
  const [data, setData] = useState<Appointment[]>([])
  const [stores, setStores] = useState<Store[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [acceptModalOpen, setAcceptModalOpen] = useState(false)
  const [currentAppointment, setCurrentAppointment] = useState<Appointment | null>(null)
  const [form] = Form.useForm()
  const [acceptForm] = Form.useForm()
  const { message } = App.useApp()
  const { user } = useAuthStore()

  const fetchData = async () => {
    setLoading(true)
    try {
      const [appointments, storeList, vehicleList] = await Promise.all([
        appointmentApi.list({ limit: 200 }),
        storeApi.list(),
        vehicleApi.list()
      ])
      setData(appointments)
      setStores(storeList)
      setVehicles(vehicleList)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleCreate = async (values: any) => {
    try {
      await appointmentApi.create({
        ...values,
        appointment_time: values.appointment_time.toDate()
      })
      message.success('预约创建成功')
      setModalOpen(false)
      form.resetFields()
      fetchData()
    } catch (e) { }
  }

  const handleAccept = async (values: any) => {
    if (!currentAppointment) return
    try {
      await appointmentApi.accept(currentAppointment.id, values)
      message.success('接单成功')
      setAcceptModalOpen(false)
      acceptForm.resetFields()
      fetchData()
    } catch (e) { }
  }

  const handleCancel = async (id: number) => {
    try {
      await appointmentApi.cancel(id)
      message.success('已取消预约')
      fetchData()
    } catch (e) { }
  }

  const columns: ColumnsType<Appointment> = [
    { title: '预约编号', dataIndex: 'appointment_no', key: 'appointment_no', width: 180 },
    {
      title: '门店',
      dataIndex: 'store_id',
      key: 'store_id',
      render: (v: number) => stores.find(s => s.id === v)?.store_name || v
    },
    {
      title: '车辆',
      dataIndex: 'vehicle_id',
      key: 'vehicle_id',
      render: (v?: number) => v ? vehicles.find(x => x.id === v)?.plate_number || v : '-'
    },
    {
      title: '预计重量(kg)',
      dataIndex: 'expected_weight_kg',
      key: 'expected_weight_kg',
      render: (v: number) => Number(v).toFixed(2)
    },
    { title: '油品类型', dataIndex: 'oil_type', key: 'oil_type' },
    {
      title: '预约时间',
      dataIndex: 'appointment_time',
      key: 'appointment_time',
      render: (v: string) => dayjs(v).format('YYYY-MM-DD HH:mm')
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (v: AppointmentStatus) => (
        <Tag color={statusMap[v].color}>{statusMap[v].text}</Tag>
      )
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
      render: (_, record) => (
        <Space size="small">
          {record.status === 'pending' && (user?.role === 'admin' || user?.role === 'driver') && (
            <Button
              type="link"
              size="small"
              icon={<CheckOutlined />}
              onClick={() => {
                setCurrentAppointment(record)
                setAcceptModalOpen(true)
              }}
            >
              接单
            </Button>
          )}
          {record.status !== 'completed' && record.status !== 'cancelled' && (
            <Popconfirm title="确认取消该预约？" onConfirm={() => handleCancel(record.id)}>
              <Button type="link" size="small" danger icon={<CloseOutlined />}>取消</Button>
            </Popconfirm>
          )}
        </Space>
      )
    }
  ]

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={3} style={{ margin: 0 }}>回收预约</Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setModalOpen(true)}
          disabled={user?.role === 'driver'}
        >
          新建预约
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
        title="新建回收预约"
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        width={500}
      >
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Form.Item
            label="门店"
            name="store_id"
            rules={[{ required: true, message: '请选择门店' }]}
          >
            <Select placeholder="请选择门店">
              {stores.map(s => (
                <Option key={s.id} value={s.id}>{s.store_name}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            label="预计重量(kg)"
            name="expected_weight_kg"
            rules={[{ required: true, message: '请输入预计重量' }]}
          >
            <InputNumber min={0} precision={2} style={{ width: '100%' }} placeholder="请输入预计重量" />
          </Form.Item>
          <Form.Item
            label="油品类型"
            name="oil_type"
            initialValue="餐厨废油"
          >
            <Select>
              <Option value="餐厨废油">餐厨废油</Option>
              <Option value="地沟油">地沟油</Option>
              <Option value="煎炸油">煎炸废油</Option>
            </Select>
          </Form.Item>
          <Form.Item
            label="预约时间"
            name="appointment_time"
            rules={[{ required: true, message: '请选择预约时间' }]}
          >
            <DatePicker
              showTime
              style={{ width: '100%' }}
              placeholder="选择预约时间"
              disabledDate={d => d && d.isBefore(dayjs().startOf('day'))}
            />
          </Form.Item>
          <Form.Item label="备注" name="remark">
            <TextArea rows={3} placeholder="可填写特殊要求等" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="司机接单"
        open={acceptModalOpen}
        onCancel={() => setAcceptModalOpen(false)}
        onOk={() => acceptForm.submit()}
      >
        <Form form={acceptForm} layout="vertical" onFinish={handleAccept}>
          <Form.Item label="当前预约">
            <Text type="secondary">
              {currentAppointment?.appointment_no} - {stores.find(s => s.id === currentAppointment?.store_id)?.store_name}
            </Text>
          </Form.Item>
          <Form.Item
            label="选择车辆"
            name="vehicle_id"
            rules={[{ required: true, message: '请选择接单车辆' }]}
          >
            <Select placeholder="请选择车辆">
              {vehicles.filter(v => v.status === 'idle').map(v => (
                <Option key={v.id} value={v.id}>
                  {v.plate_number} ({v.vehicle_type} - 载重{v.capacity_kg}kg)
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default Appointments
