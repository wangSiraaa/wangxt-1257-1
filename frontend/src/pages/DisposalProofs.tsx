import { useState, useEffect } from 'react'
import {
  Table, Button, Tag, Modal, Form, Select, InputNumber, DatePicker,
  Space, Card, App, Typography, Drawer, Descriptions, Row, Col, Upload, Radio
} from 'antd'
import { PlusOutlined, CheckOutlined, CloseOutlined, EyeOutlined, InboxOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import type { ColumnsType } from 'antd/es/table'
import type { UploadFile } from 'antd/es/upload/interface'
import { disposalApi, weighingApi, vehicleApi, factoryApi, routeApi } from '@/api'
import { useAuthStore } from '@/store/auth'
import type { DisposalProof, Weighing, Vehicle, DisposalFactory, Route, DisposalStatus } from '@/types'

const { Title } = Typography
const { Option } = Select
const { Dragger } = Upload
const { TextArea } = Form

const statusMap: Record<DisposalStatus, { color: string, text: string }> = {
  pending: { color: 'orange', text: '待核对' },
  verified: { color: 'green', text: '已核对' },
  rejected: { color: 'red', text: '已驳回' }
}

function DisposalProofs() {
  const [data, setData] = useState<DisposalProof[]>([])
  const [weighings, setWeighings] = useState<Weighing[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [factories, setFactories] = useState<DisposalFactory[]>([])
  const [routes, setRoutes] = useState<Route[]>([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [verifyModalOpen, setVerifyModalOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [currentRecord, setCurrentRecord] = useState<DisposalProof | null>(null)
  const [fileList, setFileList] = useState<UploadFile[]>([])
  const [form] = Form.useForm()
  const [verifyForm] = Form.useForm()
  const { message } = App.useApp()
  const { user } = useAuthStore()

  const fetchData = async () => {
    setLoading(true)
    try {
      const [list, wList, vList, fList, rList] = await Promise.all([
        disposalApi.list({ limit: 200 }),
        weighingApi.list({ limit: 200 }),
        vehicleApi.list(),
        factoryApi.list(),
        routeApi.list({ limit: 200 })
      ])
      setData(list)
      setWeighings(wList)
      setVehicles(vList)
      setFactories(fList)
      setRoutes(rList)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleCreate = async (values: any) => {
    try {
      const photos = fileList.map(f => f.name || f.url || `photo_${Date.now()}.jpg`)
      await disposalApi.create({
        ...values,
        receive_time: values.receive_time.toDate(),
        photo_urls: photos
      })
      message.success('去向证明创建成功')
      setModalOpen(false)
      setFileList([])
      form.resetFields()
      fetchData()
    } catch (e) { }
  }

  const handleVerify = async (values: any) => {
    if (!currentRecord) return
    try {
      await disposalApi.verify(currentRecord.id, values)
      message.success(values.status === 'verified' ? '已通过核对' : '已驳回')
      setVerifyModalOpen(false)
      verifyForm.resetFields()
      fetchData()
    } catch (e) { }
  }

  const columns: ColumnsType<DisposalProof> = [
    { title: '证明编号', dataIndex: 'proof_no', key: 'proof_no', width: 180 },
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
    {
      title: '入库重量(kg)',
      dataIndex: 'received_weight_kg',
      key: 'received_weight_kg',
      render: (v: number) => <span style={{ fontWeight: 600 }}>{Number(v).toFixed(2)}</span>
    },
    {
      title: '重量差异',
      dataIndex: 'weight_diff_percent',
      key: 'weight_diff_percent',
      render: (v?: number) => v === undefined ? '-' : (
        <span style={{ color: v > 5 ? '#ff4d4f' : v > 3 ? '#faad14' : '#52c41a', fontWeight: 600 }}>
          {v > 0 ? '+' : ''}{Number(v).toFixed(2)}%
        </span>
      )
    },
    {
      title: '入库时间',
      dataIndex: 'receive_time',
      key: 'receive_time',
      render: (v: string) => dayjs(v).format('MM-DD HH:mm')
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (v: DisposalStatus) => <Tag color={statusMap[v].color}>{statusMap[v].text}</Tag>
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => {
            setCurrentRecord(record)
            setDetailOpen(true)
          }}>详情</Button>
          {record.status === 'pending' && (user?.role === 'admin' || user?.role === 'inspector') && (
            <Button
              type="link"
              size="small"
              onClick={() => {
                setCurrentRecord(record)
                setVerifyModalOpen(true)
              }}
            >
              核对
            </Button>
          )}
        </Space>
      )
    }
  ]

  const uploadProps = {
    fileList,
    onChange: ({ fileList: newList }: { fileList: UploadFile[] }) => setFileList(newList),
    beforeUpload: () => false
  }

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={3} style={{ margin: 0 }}>去向证明</Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setModalOpen(true)}
          disabled={!(user?.role === 'admin' || user?.role === 'driver' || user?.role === 'inspector')}
        >
          登记入库
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
        title="登记处置厂入库"
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        width={560}
      >
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="称重记录"
                name="weighing_id"
                rules={[{ required: true, message: '请选择称重记录' }]}
              >
                <Select placeholder="请选择已签收称重" showSearch optionFilterProp="children">
                  {weighings.filter(w => w.signature_data && (w.status === 'signed' || w.status === 'verified')).map(w => (
                    <Option key={w.id} value={w.id}>
                      {w.weighing_no} - 净重{Number(w.net_weight_kg).toFixed(2)}kg
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="运输路线"
                name="route_id"
                rules={[{ required: true, message: '请选择运输路线' }]}
              >
                <Select placeholder="请选择运输路线">
                  {routes.map(r => (
                    <Option key={r.id} value={r.id}>{r.route_no}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="处置厂"
                name="disposal_factory_id"
                rules={[{ required: true, message: '请选择处置厂' }]}
              >
                <Select placeholder="请选择处置厂">
                  {factories.map(f => (
                    <Option key={f.id} value={f.id}>{f.factory_name}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="运输车辆"
                name="vehicle_id"
                rules={[{ required: true, message: '请选择车辆' }]}
              >
                <Select placeholder="请选择车辆">
                  {vehicles.map(v => (
                    <Option key={v.id} value={v.id}>{v.plate_number}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="入库重量(kg)"
                name="received_weight_kg"
                rules={[{ required: true, message: '请输入入库重量' }]}
              >
                <InputNumber min={0} precision={2} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="入库时间"
                name="receive_time"
                rules={[{ required: true, message: '请选择入库时间' }]}
                initialValue={dayjs()}
              >
                <DatePicker showTime style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label="入库凭证照片">
            <Dragger {...uploadProps} multiple listType="picture">
              <p className="ant-upload-drag-icon"><InboxOutlined /></p>
              <p className="ant-upload-text">上传入库凭证照片</p>
            </Dragger>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="核对去向证明"
        open={verifyModalOpen}
        onCancel={() => setVerifyModalOpen(false)}
        onOk={() => verifyForm.submit()}
      >
        <Form form={verifyForm} layout="vertical" onFinish={handleVerify}>
          <Form.Item label="当前证明">
            <span>{currentRecord?.proof_no}</span>
          </Form.Item>
          <Form.Item
            label="核对结果"
            name="status"
            rules={[{ required: true, message: '请选择核对结果' }]}
          >
            <Radio.Group>
              <Radio.Button value="verified"><CheckOutlined /> 通过</Radio.Button>
              <Radio.Button value="rejected"><CloseOutlined /> 驳回</Radio.Button>
            </Radio.Group>
          </Form.Item>
          <Form.Item label="核对备注" name="verified_note">
            <TextArea rows={3} placeholder="请输入备注说明" />
          </Form.Item>
        </Form>
      </Modal>

      <Drawer
        title={`去向证明详情 - ${currentRecord?.proof_no || ''}`}
        width={560}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
      >
        {currentRecord && (
          <Descriptions column={2} bordered size="small">
            <Descriptions.Item label="证明编号" span={2}>{currentRecord.proof_no}</Descriptions.Item>
            <Descriptions.Item label="称重单">{weighings.find(w => w.id === currentRecord.weighing_id)?.weighing_no}</Descriptions.Item>
            <Descriptions.Item label="车辆">{vehicles.find(v => v.id === currentRecord.vehicle_id)?.plate_number}</Descriptions.Item>
            <Descriptions.Item label="处置厂" span={2}>
              {factories.find(f => f.id === currentRecord.disposal_factory_id)?.factory_name}
            </Descriptions.Item>
            <Descriptions.Item label="入库重量" style={{ fontWeight: 600, color: '#1677ff' }}>
              {Number(currentRecord.received_weight_kg).toFixed(2)} kg
            </Descriptions.Item>
            <Descriptions.Item label="差异率">
              <span style={{ color: (currentRecord.weight_diff_percent ?? 0) > 5 ? '#ff4d4f' : '#52c41a' }}>
                {Number(currentRecord.weight_diff_percent ?? 0).toFixed(2)}%
              </span>
            </Descriptions.Item>
            <Descriptions.Item label="入库时间" span={2}>
              {dayjs(currentRecord.receive_time).format('YYYY-MM-DD HH:mm:ss')}
            </Descriptions.Item>
            <Descriptions.Item label="状态">
              <Tag color={statusMap[currentRecord.status].color}>{statusMap[currentRecord.status].text}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="核对人">
              {currentRecord.verified_by ? `用户#${currentRecord.verified_by}` : '-'}
            </Descriptions.Item>
            {currentRecord.verified_at && (
              <Descriptions.Item label="核对时间" span={2}>
                {dayjs(currentRecord.verified_at).format('YYYY-MM-DD HH:mm:ss')}
              </Descriptions.Item>
            )}
            {currentRecord.remark && (
              <Descriptions.Item label="备注" span={2}>{currentRecord.remark}</Descriptions.Item>
            )}
          </Descriptions>
        )}
      </Drawer>
    </div>
  )
}

export default DisposalProofs
