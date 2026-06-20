import { useState, useEffect } from 'react'
import {
  Table, Button, Tag, Modal, Form, Input, Select,
  Space, Card, App, Typography, Popconfirm, InputNumber
} from 'antd'
import {
  PlusOutlined, CheckOutlined, CloseOutlined,
  LockOutlined, UnlockOutlined, DollarOutlined
} from '@ant-design/icons'
import dayjs from 'dayjs'
import type { ColumnsType } from 'antd/es/table'
import { settlementApi, storeApi, weighingApi } from '@/api'
import { useAuthStore } from '@/store/auth'
import type { Settlement, Store, Weighing, SettlementStatus } from '@/types'

const { Title } = Typography
const { Option } = Select
const { TextArea } = Input

const statusMap: Record<SettlementStatus, { color: string, text: string }> = {
  pending: { color: 'blue', text: '待结算' },
  frozen: { color: 'orange', text: '已冻结' },
  paid: { color: 'green', text: '已支付' },
  cancelled: { color: 'default', text: '已取消' }
}

function Settlements() {
  const [data, setData] = useState<Settlement[]>([])
  const [stores, setStores] = useState<Store[]>([])
  const [weighings, setWeighings] = useState<Weighing[]>([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editRecord, setEditRecord] = useState<Settlement | null>(null)
  const [form] = Form.useForm()
  const { message } = App.useApp()
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'admin'

  const fetchData = async () => {
    setLoading(true)
    try {
      const [list, storeList, weighingList] = await Promise.all([
        settlementApi.list({ limit: 200 }),
        storeApi.list(),
        weighingApi.list()
      ])
      setData(list)
      setStores(storeList)
      setWeighings(weighingList)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleSubmit = async (values: any) => {
    try {
      if (editRecord) {
        await settlementApi.update(editRecord.id, values)
        message.success('结算单更新成功')
      } else {
        message.info('结算单由称重记录自动生成，请通过称重流程创建')
      }
      setModalOpen(false)
      form.resetFields()
      setEditRecord(null)
      fetchData()
    } catch (e) { }
  }

  const handleFreeze = async (record: Settlement) => {
    try {
      await settlementApi.freeze(record.id, { frozen_reason: '管理员手动冻结' })
      message.success('已冻结结算')
      fetchData()
    } catch (e) { }
  }

  const handleUnfreeze = async (record: Settlement) => {
    try {
      await settlementApi.unfreeze(record.id)
      message.success('已解冻结算')
      fetchData()
    } catch (e) { }
  }

  const handlePay = async (record: Settlement) => {
    try {
      await settlementApi.pay(record.id)
      message.success('已标记支付完成')
      fetchData()
    } catch (e) { }
  }

  const columns: ColumnsType<Settlement> = [
    { title: '结算编号', dataIndex: 'settlement_no', key: 'settlement_no', width: 180 },
    {
      title: '门店',
      dataIndex: 'store_id',
      key: 'store_id',
      render: (v: number) => stores.find(s => s.id === v)?.store_name || v
    },
    {
      title: '关联称重',
      dataIndex: 'weighing_id',
      key: 'weighing_id',
      render: (v: number) => weighings.find(w => w.id === v)?.weighing_no || v
    },
    {
      title: '结算重量(kg)',
      dataIndex: 'weight_kg',
      key: 'weight_kg',
      render: (v: number) => Number(v).toFixed(2)
    },
    {
      title: '单价(元/kg)',
      dataIndex: 'unit_price',
      key: 'unit_price',
      render: (v: number) => Number(v).toFixed(2)
    },
    {
      title: '结算金额(元)',
      dataIndex: 'total_amount',
      key: 'total_amount',
      render: (v: number) => <b style={{ color: '#1677ff' }}>¥{Number(v).toFixed(2)}</b>
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (v: SettlementStatus, record) => (
        <Space>
          <Tag color={statusMap[v].color}>{statusMap[v].text}</Tag>
          {record.is_frozen && v !== 'frozen' && <Tag color="orange">已冻结</Tag>}
        </Space>
      )
    },
    {
      title: '冻结原因',
      dataIndex: 'frozen_reason',
      key: 'frozen_reason',
      render: (v?: string) => v || '-'
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
      width: 280,
      render: (_, record) => (
        <Space size="small">
          {isAdmin && record.status === 'pending' && !record.is_frozen && (
            <Popconfirm title="确认冻结该结算？" onConfirm={() => handleFreeze(record)}>
              <Button type="link" size="small" icon={<LockOutlined />}>
                冻结
              </Button>
            </Popconfirm>
          )}
          {isAdmin && (record.is_frozen || record.status === 'frozen') && (
            <Popconfirm title="确认解冻该结算？" onConfirm={() => handleUnfreeze(record)}>
              <Button type="link" size="small" icon={<UnlockOutlined />}>
                解冻
              </Button>
            </Popconfirm>
          )}
          {isAdmin && record.status === 'pending' && !record.is_frozen && (
            <Popconfirm title="确认已完成支付？" onConfirm={() => handlePay(record)}>
              <Button type="link" size="small" icon={<DollarOutlined />}>
                标记支付
              </Button>
            </Popconfirm>
          )}
        </Space>
      )
    }
  ]

  const stats = {
    pending: data.filter(d => d.status === 'pending').length,
    frozen: data.filter(d => d.is_frozen || d.status === 'frozen').length,
    paid: data.filter(d => d.status === 'paid').length,
    totalAmount: data.filter(d => d.status !== 'cancelled').reduce((s, d) => s + Number(d.total_amount), 0)
  }

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={3} style={{ margin: 0 }}>结算管理</Title>
        <div style={{ display: 'flex', gap: 8 }}>
          <Tag color="blue" style={{ padding: '4px 12px', fontSize: 14 }}>
            待结算: {stats.pending}
          </Tag>
          <Tag color="orange" style={{ padding: '4px 12px', fontSize: 14 }}>
            已冻结: {stats.frozen}
          </Tag>
          <Tag color="green" style={{ padding: '4px 12px', fontSize: 14 }}>
            已支付: {stats.paid}
          </Tag>
          <Tag color="purple" style={{ padding: '4px 12px', fontSize: 14 }}>
            总金额: ¥{stats.totalAmount.toFixed(2)}
          </Tag>
        </div>
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
        title={editRecord ? '编辑结算单' : '新建结算单'}
        open={modalOpen}
        onCancel={() => { setModalOpen(false); setEditRecord(null); form.resetFields() }}
        onOk={() => form.submit()}
        width={500}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item label="备注" name="remark">
            <TextArea rows={3} placeholder="结算备注" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default Settlements
