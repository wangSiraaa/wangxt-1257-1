import { useState, useEffect } from 'react'
import {
  Table, Button, Tag, Modal, Form, Select, Input,
  Space, Card, App, Typography, Drawer, Descriptions, Badge, Row, Col
} from 'antd'
import {
  ExclamationCircleOutlined, CheckCircleOutlined,
  SyncOutlined, CloseCircleOutlined, EyeOutlined
} from '@ant-design/icons'
import dayjs from 'dayjs'
import type { ColumnsType } from 'antd/es/table'
import { exceptionApi } from '@/api'
import { useAuthStore } from '@/store/auth'
import type { ExceptionItem, ExceptionStatus, ExceptionType } from '@/types'

const { Title, Text, Paragraph } = Typography
const { Option } = Select
const { TextArea } = Input

const typeMap: Record<ExceptionType, { color: string, text: string, icon: any }> = {
  weight_diff: { color: 'orange', text: '称重差异', icon: <ExclamationCircleOutlined /> },
  route_deviation: { color: 'red', text: '路线偏离', icon: <SyncOutlined spin /> },
  no_signature: { color: 'purple', text: '未签收', icon: <CloseCircleOutlined /> },
  timeout: { color: 'gold', text: '运输超时', icon: <ExclamationCircleOutlined /> }
}

const statusMap: Record<ExceptionStatus, { color: string, text: string }> = {
  open: { color: 'red', text: '待处理' },
  processing: { color: 'orange', text: '处理中' },
  resolved: { color: 'green', text: '已解决' },
  closed: { color: 'default', text: '已关闭' }
}

const severityMap = ['低', '中', '高', '严重']

function Exceptions() {
  const [data, setData] = useState<ExceptionItem[]>([])
  const [loading, setLoading] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [handleModalOpen, setHandleModalOpen] = useState(false)
  const [currentRecord, setCurrentRecord] = useState<ExceptionItem | null>(null)
  const [form] = Form.useForm()
  const { message } = App.useApp()
  const { user } = useAuthStore()

  const fetchData = async () => {
    setLoading(true)
    try {
      const list = await exceptionApi.list({ limit: 200 })
      setData(list)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleProcess = async (values: any) => {
    if (!currentRecord) return
    try {
      await exceptionApi.handle(currentRecord.id, values)
      message.success('处理成功')
      setHandleModalOpen(false)
      form.resetFields()
      fetchData()
    } catch (e) { }
  }

  const pendingCount = data.filter(e => e.status === 'open' || e.status === 'processing').length

  const columns: ColumnsType<ExceptionItem> = [
    {
      title: '严重程度',
      dataIndex: 'severity',
      key: 'severity',
      width: 80,
      render: (v: number) => {
        const color = ['#52c41a', '#faad14', '#fa8c16', '#ff4d4f'][v] || '#52c41a'
        return <Badge color={color} text={severityMap[v] || '低'} />
      }
    },
    {
      title: '异常类型',
      dataIndex: 'type',
      key: 'type',
      width: 120,
      render: (v: ExceptionType) => {
        const info = typeMap[v]
        return <Tag color={info.color} icon={info.icon}>{info.text}</Tag>
      }
    },
    { title: '异常编号', dataIndex: 'exception_no', key: 'exception_no', width: 180 },
    { title: '标题', dataIndex: 'title', key: 'title', ellipsis: true },
    {
      title: '关联对象',
      dataIndex: 'related_type',
      key: 'related_type',
      width: 120,
      render: (v?: string, record) => v ? `${v}#${record.related_id}` : '-'
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (v: ExceptionStatus) => <Tag color={statusMap[v].color}>{statusMap[v].text}</Tag>
    },
    {
      title: '处理人',
      dataIndex: 'handled_by',
      key: 'handled_by',
      width: 100,
      render: (v?: number) => v ? `用户#${v}` : '-'
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 120,
      render: (v: string) => dayjs(v).format('MM-DD HH:mm')
    },
    {
      title: '操作',
      key: 'action',
      width: 160,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => {
            setCurrentRecord(record)
            setDetailOpen(true)
          }}>详情</Button>
          {(record.status === 'open' || record.status === 'processing') &&
            (user?.role === 'admin' || user?.role === 'inspector') && (
            <Button
              type="link"
              size="small"
              icon={<CheckCircleOutlined />}
              onClick={() => {
                setCurrentRecord(record)
                setHandleModalOpen(true)
              }}
            >
              处理
            </Button>
          )}
        </Space>
      )
    }
  ]

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>异常清单</Title>
          <Text type="secondary" style={{ fontSize: 12 }}>
            当前有 <span style={{ color: '#ff4d4f', fontWeight: 600 }}>{pendingCount}</span> 条待处理异常
          </Text>
        </div>
        <Button icon={<SyncOutlined />} onClick={fetchData}>刷新</Button>
      </div>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        {Object.keys(typeMap).map(key => {
          const t = key as ExceptionType
          const count = data.filter(e => e.type === t && (e.status === 'open' || e.status === 'processing')).length
          return (
            <Col xs={12} md={6} key={t}>
              <Card size="small" style={{ borderLeft: `4px solid ${typeMap[t].color}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ color: '#888', fontSize: 12 }}>{typeMap[t].text}</div>
                    <div style={{ fontSize: 24, fontWeight: 600, color: typeMap[t].color }}>{count}</div>
                  </div>
                  {typeMap[t].icon}
                </div>
              </Card>
            </Col>
          )
        })}
      </Row>

      <Card>
        <Table
          loading={loading}
          dataSource={data}
          columns={columns}
          rowKey="id"
          pagination={{ pageSize: 20 }}
        />
      </Card>

      <Drawer
        title={`异常详情 - ${currentRecord?.exception_no || ''}`}
        width={520}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
      >
        {currentRecord && (
          <>
            <Descriptions column={2} bordered size="small">
              <Descriptions.Item label="异常编号" span={2}>{currentRecord.exception_no}</Descriptions.Item>
              <Descriptions.Item label="类型">
                <Tag color={typeMap[currentRecord.type].color} icon={typeMap[currentRecord.type].icon}>
                  {typeMap[currentRecord.type].text}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="严重程度">
                <Badge color={['#52c41a', '#faad14', '#fa8c16', '#ff4d4f'][currentRecord.severity]}
                  text={severityMap[currentRecord.severity] || '低'} />
              </Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={statusMap[currentRecord.status].color}>{statusMap[currentRecord.status].text}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="关联对象">
                {currentRecord.related_type ? `${currentRecord.related_type}#${currentRecord.related_id}` : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="创建时间" span={2}>
                {dayjs(currentRecord.created_at).format('YYYY-MM-DD HH:mm:ss')}
              </Descriptions.Item>
            </Descriptions>

            <div style={{ marginTop: 16 }}>
              <Text strong>异常描述</Text>
              <Paragraph type="secondary" style={{ marginTop: 4 }}>
                {currentRecord.description || '暂无描述'}
              </Paragraph>
            </div>

            {currentRecord.handle_note && (
              <div style={{ marginTop: 16 }}>
                <Text strong>处理说明</Text>
                <Paragraph style={{ marginTop: 4, padding: 12, background: '#f6ffed', borderRadius: 4 }}>
                  {currentRecord.handle_note}
                  <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>
                    处理人: 用户#{currentRecord.handled_by} · {currentRecord.handled_at && dayjs(currentRecord.handled_at).format('YYYY-MM-DD HH:mm')}
                  </div>
                </Paragraph>
              </div>
            )}
          </>
        )}
      </Drawer>

      <Modal
        title="处理异常"
        open={handleModalOpen}
        onCancel={() => setHandleModalOpen(false)}
        onOk={() => form.submit()}
      >
        <Form form={form} layout="vertical" onFinish={handleProcess}>
          <Form.Item label="当前异常">
            <Text type="secondary">
              {currentRecord?.exception_no} - {currentRecord?.title}
            </Text>
          </Form.Item>
          <Form.Item
            label="处理结果"
            name="new_status"
            initialValue="resolved"
            rules={[{ required: true, message: '请选择处理结果' }]}
          >
            <Select>
              <Option value="resolved">已解决</Option>
              <Option value="processing">处理中</Option>
              <Option value="closed">关闭</Option>
            </Select>
          </Form.Item>
          <Form.Item
            label="处理说明"
            name="handle_note"
            rules={[{ required: true, message: '请填写处理说明' }]}
          >
            <TextArea rows={4} placeholder="请详细描述处理过程和结果" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default Exceptions
