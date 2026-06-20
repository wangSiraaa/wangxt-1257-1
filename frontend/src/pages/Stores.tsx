import { useState, useEffect } from 'react'
import {
  Table, Button, Tag, Modal, Form, Input, Switch,
  Space, Card, App, Typography, Popconfirm, InputNumber
} from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, EnvironmentOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import type { ColumnsType } from 'antd/es/table'
import { storeApi, userApi } from '@/api'
import { useAuthStore } from '@/store/auth'
import type { Store, User } from '@/types'

const { Title } = Typography
const { TextArea } = Input

function Stores() {
  const [data, setData] = useState<Store[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editRecord, setEditRecord] = useState<Store | null>(null)
  const [form] = Form.useForm()
  const { message } = App.useApp()
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'admin'

  const fetchData = async () => {
    setLoading(true)
    try {
      const [list, userList] = await Promise.all([
        storeApi.list(),
        userApi.list({ role: 'store' })
      ])
      setData(list)
      setUsers(userList)
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
    form.setFieldsValue({ is_active: true })
    setModalOpen(true)
  }

  const handleEdit = (record: Store) => {
    setEditRecord(record)
    form.setFieldsValue(record)
    setModalOpen(true)
  }

  const handleDelete = async (id: number) => {
    try {
      await storeApi.remove(id)
      message.success('删除成功')
      fetchData()
    } catch (e) { }
  }

  const handleSubmit = async (values: any) => {
    try {
      if (editRecord) {
        await storeApi.update(editRecord.id, values)
        message.success('门店更新成功')
      } else {
        await storeApi.create(values)
        message.success('门店创建成功')
      }
      setModalOpen(false)
      form.resetFields()
      setEditRecord(null)
      fetchData()
    } catch (e) { }
  }

  const columns: ColumnsType<Store> = [
    { title: '门店编码', dataIndex: 'store_code', key: 'store_code', width: 120 },
    { title: '门店名称', dataIndex: 'store_name', key: 'store_name' },
    { title: '地址', dataIndex: 'address', key: 'address', ellipsis: true },
    {
      title: '坐标',
      key: 'location',
      render: (_, record) => (
        <Space>
          <EnvironmentOutlined style={{ color: '#1677ff' }} />
          <span style={{ fontSize: 12 }}>
            {Number(record.longitude).toFixed(4)}, {Number(record.latitude).toFixed(4)}
          </span>
        </Space>
      )
    },
    { title: '联系人', dataIndex: 'contact_person', key: 'contact_person' },
    { title: '联系电话', dataIndex: 'contact_phone', key: 'contact_phone' },
    {
      title: '日均产量(kg)',
      dataIndex: 'daily_output_kg',
      key: 'daily_output_kg',
      render: (v: number) => Number(v).toFixed(1)
    },
    {
      title: '关联用户',
      dataIndex: 'user_id',
      key: 'user_id',
      render: (v?: number) => v ? users.find(u => u.id === v)?.real_name || v : '-'
    },
    {
      title: '状态',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (v: boolean) => (
        <Tag color={v ? 'green' : 'default'}>{v ? '启用' : '停用'}</Tag>
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
      width: 150,
      render: (_, record) => (
        <Space size="small">
          {isAdmin && (
            <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
              编辑
            </Button>
          )}
          {isAdmin && (
            <Popconfirm title="确认删除该门店？" onConfirm={() => handleDelete(record.id)}>
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
        <Title level={3} style={{ margin: 0 }}>门店管理</Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleCreate}
          disabled={!isAdmin}
        >
          新建门店
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
        title={editRecord ? '编辑门店' : '新建门店'}
        open={modalOpen}
        onCancel={() => { setModalOpen(false); setEditRecord(null); form.resetFields() }}
        onOk={() => form.submit()}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            label="门店编码"
            name="store_code"
            rules={[{ required: true, message: '请输入门店编码' }]}
          >
            <Input placeholder="如：MD001" disabled={!!editRecord} />
          </Form.Item>
          <Form.Item
            label="门店名称"
            name="store_name"
            rules={[{ required: true, message: '请输入门店名称' }]}
          >
            <Input placeholder="请输入门店名称" />
          </Form.Item>
          <div style={{ display: 'flex', gap: 16 }}>
            <Form.Item
              label="经度"
              name="longitude"
              rules={[{ required: true, message: '请输入经度' }]}
              style={{ flex: 1 }}
            >
              <InputNumber precision={6} style={{ width: '100%' }} placeholder="如：116.4074" />
            </Form.Item>
            <Form.Item
              label="纬度"
              name="latitude"
              rules={[{ required: true, message: '请输入纬度' }]}
              style={{ flex: 1 }}
            >
              <InputNumber precision={6} style={{ width: '100%' }} placeholder="如：39.9042" />
            </Form.Item>
          </div>
          <Form.Item
            label="详细地址"
            name="address"
            rules={[{ required: true, message: '请输入详细地址' }]}
          >
            <TextArea rows={2} placeholder="请输入详细地址" />
          </Form.Item>
          <div style={{ display: 'flex', gap: 16 }}>
            <Form.Item
              label="联系人"
              name="contact_person"
              rules={[{ required: true, message: '请输入联系人' }]}
              style={{ flex: 1 }}
            >
              <Input placeholder="联系人姓名" />
            </Form.Item>
            <Form.Item
              label="联系电话"
              name="contact_phone"
              rules={[{ required: true, message: '请输入联系电话' }]}
              style={{ flex: 1 }}
            >
              <Input placeholder="手机号码" />
            </Form.Item>
          </div>
          <Form.Item
            label="日均产量(kg)"
            name="daily_output_kg"
            initialValue={50}
          >
            <InputNumber min={0} precision={1} style={{ width: '100%' }} placeholder="预估日均废油产量" />
          </Form.Item>
          <Form.Item
            label="营业执照号"
            name="business_license"
          >
            <Input placeholder="选填" />
          </Form.Item>
          <Form.Item label="启用状态" name="is_active" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default Stores
