import { useState, useEffect, useRef } from 'react'
import {
  Table, Button, Tag, Modal, Form, Input, Select, InputNumber,
  Space, Card, App, Typography, Upload, Descriptions, Drawer, Row, Col
} from 'antd'
import { PlusOutlined, EditOutlined, EyeOutlined, SafetyCertificateOutlined } from '@ant-design/icons'
import { InboxOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import type { ColumnsType } from 'antd/es/table'
import { UploadFile } from 'antd/es/upload/interface'
import { weighingApi, storeApi, vehicleApi, appointmentApi } from '@/api'
import { useAuthStore } from '@/store/auth'
import SignaturePad, { SignaturePadRef } from '@/components/SignaturePad'
import type { Weighing, Store, Vehicle, Appointment, WeighingStatus } from '@/types'

const { Title } = Typography
const { Option } = Select
const { TextArea } = Input
const { Dragger } = Upload

const statusMap: Record<WeighingStatus, { color: string, text: string }> = {
  draft: { color: 'default', text: '草稿' },
  signed: { color: 'cyan', text: '已签收' },
  verified: { color: 'green', text: '已审核' },
  exception: { color: 'red', text: '异常' }
}

function Weighings() {
  const [data, setData] = useState<Weighing[]>([])
  const [stores, setStores] = useState<Store[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [signModalOpen, setSignModalOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [currentWeighing, setCurrentWeighing] = useState<Weighing | null>(null)
  const [fileList, setFileList] = useState<UploadFile[]>([])
  const [form] = Form.useForm()
  const signPadRef = useRef<SignaturePadRef>(null)
  const { message, modal } = App.useApp()
  const { user } = useAuthStore()

  const fetchData = async () => {
    setLoading(true)
    try {
      const [list, storeList, vehicleList, apptList] = await Promise.all([
        weighingApi.list({ limit: 200 }),
        storeApi.list(),
        vehicleApi.list(),
        appointmentApi.list({ limit: 200 })
      ])
      setData(list)
      setStores(storeList)
      setVehicles(vehicleList)
      setAppointments(apptList)
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
      await weighingApi.create({
        ...values,
        photo_urls: photos,
        driver_id: user?.role === 'driver' ? user.id : values.driver_id
      })
      message.success('称重记录创建成功')
      setModalOpen(false)
      setFileList([])
      form.resetFields()
      fetchData()
    } catch (e) { }
  }

  const handleSign = async () => {
    if (!currentWeighing) return
    if (signPadRef.current?.isEmpty()) {
      message.warning('请先签名')
      return
    }
    const signatureData = signPadRef.current?.toDataURL() || ''
    try {
      await weighingApi.sign(currentWeighing.id, { signature_data: signatureData })
      message.success('签名签收成功')
      setSignModalOpen(false)
      fetchData()
    } catch (e) { }
  }

  const handleVerify = (record: Weighing) => {
    modal.confirm({
      title: '确认审核',
      content: `确认审核称重记录 ${record.weighing_no}？`,
      onOk: async () => {
        try {
          await weighingApi.verify(record.id)
          message.success('审核通过')
          fetchData()
        } catch (e) { }
      }
    })
  }

  const columns: ColumnsType<Weighing> = [
    { title: '称重编号', dataIndex: 'weighing_no', key: 'weighing_no', width: 180 },
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
      render: (v: number) => vehicles.find(x => x.id === v)?.plate_number || v
    },
    { title: '申报(kg)', dataIndex: 'declared_weight_kg', key: 'declared_weight_kg', render: (v: number) => Number(v).toFixed(2) },
    { title: '实称(kg)', dataIndex: 'actual_weight_kg', key: 'actual_weight_kg', render: (v: number) => Number(v).toFixed(2) },
    { title: '皮重(kg)', dataIndex: 'tare_weight_kg', key: 'tare_weight_kg', render: (v: number) => Number(v).toFixed(2) },
    {
      title: '净重(kg)',
      dataIndex: 'net_weight_kg',
      key: 'net_weight_kg',
      render: (v: number) => <span style={{ fontWeight: 600 }}>{Number(v).toFixed(2)}</span>
    },
    {
      title: '差异率',
      dataIndex: 'weight_diff_percent',
      key: 'weight_diff_percent',
      render: (v?: number) => v === undefined ? '-' : (
        <span style={{ color: v > 5 ? '#ff4d4f' : v > 3 ? '#faad14' : '#52c41a', fontWeight: 600 }}>
          {Number(v).toFixed(2)}%
        </span>
      )
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (v: WeighingStatus) => <Tag color={statusMap[v].color}>{statusMap[v].text}</Tag>
    },
    {
      title: '时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (v: string) => dayjs(v).format('MM-DD HH:mm')
    },
    {
      title: '操作',
      key: 'action',
      width: 240,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => {
            setCurrentWeighing(record)
            setDetailOpen(true)
          }}>
            详情
          </Button>
          {record.status === 'draft' && (
            <Button
              type="link"
              size="small"
              icon={<SafetyCertificateOutlined />}
              onClick={() => {
                setCurrentWeighing(record)
                setSignModalOpen(true)
              }}
            >
              签收
            </Button>
          )}
          {record.status === 'signed' && (user?.role === 'admin' || user?.role === 'inspector') && (
            <Button type="link" size="small" onClick={() => handleVerify(record)}>
              审核
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
        <Title level={3} style={{ margin: 0 }}>称重记录</Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setModalOpen(true)}
          disabled={!(user?.role === 'admin' || user?.role === 'driver')}
        >
          新增称重
        </Button>
      </div>

      <Card>
        <Table
          loading={loading}
          dataSource={data}
          columns={columns}
          rowKey="id"
          pagination={{ pageSize: 20 }}
          scroll={{ x: 1400 }}
        />
      </Card>

      <Modal
        title="新增称重记录"
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="关联预约"
                name="appointment_id"
                rules={[{ required: true, message: '请选择预约单' }]}
              >
                <Select placeholder="请选择预约单" showSearch optionFilterProp="children">
                  {appointments.filter(a => a.status === 'accepted' || a.status === 'completed').map(a => (
                    <Option key={a.id} value={a.id}>
                      {a.appointment_no} - {stores.find(s => s.id === a.store_id)?.store_name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
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
            </Col>
            <Col span={12}>
              <Form.Item
                label="车辆"
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
              <Form.Item label="司机" name="driver_id">
                <Select placeholder="请选择司机">
                  {vehicles.map(v => (
                    <Option key={v.driver_id} value={v.driver_id}>
                      {v.plate_number} 司机
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="申报重量(kg)"
                name="declared_weight_kg"
                rules={[{ required: true, message: '请输入申报重量' }]}
              >
                <InputNumber min={0} precision={2} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="实际重量(kg)"
                name="actual_weight_kg"
                rules={[{ required: true, message: '请输入实际重量' }]}
              >
                <InputNumber min={0} precision={2} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="皮重(kg)" name="tare_weight_kg" initialValue={0}>
                <InputNumber min={0} precision={2} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label="现场照片">
            <Dragger {...uploadProps} multiple listType="picture">
              <p className="ant-upload-drag-icon"><InboxOutlined /></p>
              <p className="ant-upload-text">点击或拖拽照片到此处上传</p>
            </Dragger>
          </Form.Item>
          <Form.Item label="备注" name="remark">
            <TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={`电子签收 - ${currentWeighing?.weighing_no || ''}`}
        open={signModalOpen}
        onCancel={() => setSignModalOpen(false)}
        onOk={handleSign}
        okText="确认签收"
        width={480}
      >
        <p style={{ marginBottom: 8 }}>请在下方签名区域手写签名：</p>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
          <SignaturePad ref={signPadRef} width={420} height={200} />
        </div>
        <div style={{ textAlign: 'center' }}>
          <Button onClick={() => signPadRef.current?.clear()}>清除</Button>
        </div>
      </Modal>

      <Drawer
        title={`称重详情 - ${currentWeighing?.weighing_no || ''}`}
        width={560}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
      >
        {currentWeighing && (
          <Descriptions column={2} bordered size="small">
            <Descriptions.Item label="称重编号" span={2}>{currentWeighing.weighing_no}</Descriptions.Item>
            <Descriptions.Item label="门店">{stores.find(s => s.id === currentWeighing.store_id)?.store_name}</Descriptions.Item>
            <Descriptions.Item label="车辆">{vehicles.find(v => v.id === currentWeighing.vehicle_id)?.plate_number}</Descriptions.Item>
            <Descriptions.Item label="申报重量">{Number(currentWeighing.declared_weight_kg).toFixed(2)} kg</Descriptions.Item>
            <Descriptions.Item label="实际重量">{Number(currentWeighing.actual_weight_kg).toFixed(2)} kg</Descriptions.Item>
            <Descriptions.Item label="皮重">{Number(currentWeighing.tare_weight_kg).toFixed(2)} kg</Descriptions.Item>
            <Descriptions.Item label="净重" style={{ color: '#1677ff', fontWeight: 600 }}>
              {Number(currentWeighing.net_weight_kg).toFixed(2)} kg
            </Descriptions.Item>
            <Descriptions.Item label="差异率">
              <span style={{ color: (currentWeighing.weight_diff_percent ?? 0) > 5 ? '#ff4d4f' : '#52c41a', fontWeight: 600 }}>
                {Number(currentWeighing.weight_diff_percent ?? 0).toFixed(2)}%
              </span>
            </Descriptions.Item>
            <Descriptions.Item label="状态">
              <Tag color={statusMap[currentWeighing.status].color}>
                {statusMap[currentWeighing.status].text}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="签收时间">
              {currentWeighing.signed_at ? dayjs(currentWeighing.signed_at).format('YYYY-MM-DD HH:mm') : '未签收'}
            </Descriptions.Item>
            <Descriptions.Item label="创建时间" span={2}>
              {dayjs(currentWeighing.created_at).format('YYYY-MM-DD HH:mm:ss')}
            </Descriptions.Item>
            {currentWeighing.signature_data && (
              <Descriptions.Item label="电子签名" span={2}>
                <img src={currentWeighing.signature_data} alt="signature" style={{ maxWidth: '100%', border: '1px solid #f0f0f0', borderRadius: 4 }} />
              </Descriptions.Item>
            )}
            {currentWeighing.photo_urls && currentWeighing.photo_urls.length > 0 && (
              <Descriptions.Item label="现场照片" span={2}>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {currentWeighing.photo_urls.map((p, i) => (
                    <div key={i} style={{ width: 80, height: 80, border: '1px solid #f0f0f0', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#999' }}>
                      📷 照片{i + 1}
                    </div>
                  ))}
                </div>
              </Descriptions.Item>
            )}
          </Descriptions>
        )}
      </Drawer>
    </div>
  )
}

export default Weighings
