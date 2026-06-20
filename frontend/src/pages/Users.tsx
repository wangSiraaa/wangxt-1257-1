import { useState, useEffect } from 'react'
import {
  Table, Button, Tag, Modal, Form, Input, Select, Switch,
  Space, Card, App, Typography, Popconfirm, Avatar
} from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, UserOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import type { ColumnsType } from 'antd/es/table'
import { userApi } from '@/api'
import { useAuthStore } from '@/store/auth'
import type { User, UserRole } from '@/types'

const { Title } = Typography
const { Option } = Select

const roleMap: Record<UserRole, { color: string, text: string }> = {
  admin: { color: 'purple', text: '管理员' },
  store: { color: 'blue', text: '门店用户' },
  driver: { color: 'cyan', text: '司机' },
  inspector: { color: 'green', text: '监管人员' }
}

function Users() {
  const [data, setData] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editRecord, setEditRecord] = useState<User | null>(null)
  const [form] = Form.useForm()
  const { message } = App.useApp()
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'admin'

  const fetchData = async () => {
    setLoading(true)
    try {
      const list = await userApi.list({ limit: 200 })
      setData(list)
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
    form.setFieldsValue({ is_active: true, role: 'store' })
    setModalOpen(true)
  }

  const handleEdit = (record: User) => {
    setEditRecord(record)
    form.setFieldsValue({
      username: record.username,
      real_name: record.real_name,
      phone: record.phone,
      email: record.email,
      role: record.role,
      is_active: record.is_active
    })
    setModalOpen(true)
  }

  const handleDelete = async (id: number) => {
    if (id === user?.id) {
      message.warning('不能删除当前登录用户')
      return
    }
    try {
      await userApi.remove(id)
      message.success('删除成功')
      fetchData()
    } catch (e) { }
  }

  const handleSubmit = async (values: any) => {
    try {
      if (editRecord) {
        await userApi.update(editRecord.id, values)
        message.success('用户更新成功')
      } else {
        if (!values.password) {
          message.error('请设置初始密码')
          return
        }
        await userApi.create(values)
        message.success('用户创建成功')
      }
      setModalOpen(false)
      form.resetFields()
      setEditRecord(null)
      fetchData()
    } catch (e) { }
  }

  const columns: ColumnsType<User> = [
    {
      title: '用户',
      key: 'user',
      width: 180,
      render: (_, record) => (
        <Space>
          <Avatar icon={<UserOutlined />} src={record.avatar_url} />
          <div>
            <div style={{ fontWeight: 500 }}>{record.real_name}</div>
            <div style={{ fontSize: 12, color: '#999' }}>@{record.username}</div>
          </div>
        </Space>
      )
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      render: (v: UserRole) => (
        <Tag color={roleMap[v].color}>{roleMap[v].text}</Tag>
      )
    },
    { title: '手机号', dataIndex: 'phone', key: 'phone', render: (v?: string) => v || '-' },
    { title: '邮箱', dataIndex: 'email', key: 'email', render: (v?: string) => v || '-' },
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
          {isAdmin && record.id !== user?.id && (
            <Popconfirm title="确认删除该用户？" onConfirm={() => handleDelete(record.id)}>
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
        <Title level={3} style={{ margin: 0 }}>用户管理</Title>
        <div style={{ display: 'flex', gap: 8 }}>
          <Tag color="purple" style={{ padding: '4px 12px', fontSize: 14 }}>
            管理员: {data.filter(d => d.role === 'admin').length}
          </Tag>
          <Tag color="blue" style={{ padding: '4px 12px', fontSize: 14 }}>
            门店: {data.filter(d => d.role === 'store').length}
          </Tag>
          <Tag color="cyan" style={{ padding: '4px 12px', fontSize: 14 }}>
            司机: {data.filter(d => d.role === 'driver').length}
          </Tag>
          <Tag color="green" style={{ padding: '4px 12px', fontSize: 14 }}>
            监管: {data.filter(d => d.role === 'inspector').length}
          </Tag>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleCreate}
          disabled={!isAdmin}
        >
          新建用户
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
        title={editRecord ? '编辑用户' : '新建用户'}
        open={modalOpen}
        onCancel={() => { setModalOpen(false); setEditRecord(null); form.resetFields() }}
        onOk={() => form.submit()}
        width={500}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            label="用户名"
            name="username"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input placeholder="登录账号" disabled={!!editRecord} />
          </Form.Item>
          {!editRecord && (
            <Form.Item
              label="初始密码"
              name="password"
              rules={[{ required: true, message: '请设置初始密码' }]}
            >
              <Input.Password placeholder="至少6位" />
            </Form.Item>
          )}
          <Form.Item
            label="真实姓名"
            name="real_name"
            rules={[{ required: true, message: '请输入真实姓名' }]}
          >
            <Input placeholder="真实姓名" />
          </Form.Item>
          <Form.Item
            label="角色"
            name="role"
            rules={[{ required: true, message: '请选择角色' }]}
          >
            <Select>
              <Option value="admin">管理员</Option>
              <Option value="store">门店用户</Option>
              <Option value="driver">司机</Option>
              <Option value="inspector">监管人员</Option>
            </Select>
          </Form.Item>
          <div style={{ display: 'flex', gap: 16 }}>
            <Form.Item label="手机号" name="phone" style={{ flex: 1 }}>
              <Input placeholder="选填" />
            </Form.Item>
            <Form.Item label="邮箱" name="email" style={{ flex: 1 }}>
              <Input placeholder="选填" />
            </Form.Item>
          </div>
          <Form.Item label="启用状态" name="is_active" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default Users
