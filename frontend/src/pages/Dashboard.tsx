import { useState, useEffect } from 'react'
import { Row, Col, Card, Statistic, Table, Tag, Progress, List, Typography } from 'antd'
import {
  ShopOutlined,
  CarOutlined,
  FileDoneOutlined,
  ExceptionOutlined,
  SafetyCertificateOutlined,
  CalendarOutlined,
  RiseOutlined
} from '@ant-design/icons'
import dayjs from 'dayjs'
import type { ColumnsType } from 'antd/es/table'
import { dashboardApi } from '@/api'
import type { DashboardResponse } from '@/types'

const { Title, Text } = Typography

const statusColorMap: Record<string, string> = {
  open: 'red',
  processing: 'orange',
  resolved: 'green',
  closed: 'default',
  pending: 'blue',
  signed: 'cyan',
  verified: 'green',
  exception: 'red'
}

const exceptionTypeMap: Record<string, string> = {
  weight_diff: '称重差异',
  route_deviation: '路线偏离',
  no_signature: '未签收',
  timeout: '运输超时'
}

function Dashboard() {
  const [data, setData] = useState<DashboardResponse | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = async () => {
    try {
      const result = await dashboardApi.get()
      setData(result)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const exceptionColumns: ColumnsType<any> = [
    { title: '异常编号', dataIndex: 'exception_no', key: 'exception_no', width: 160 },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      render: (v: string) => <Tag color="orange">{exceptionTypeMap[v] || v}</Tag>
    },
    { title: '标题', dataIndex: 'title', key: 'title' },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (v: string) => <Tag color={statusColorMap[v]}>{v}</Tag>
    },
    {
      title: '时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (v: string) => dayjs(v).format('MM-DD HH:mm')
    }
  ]

  const weighingColumns: ColumnsType<any> = [
    { title: '称重编号', dataIndex: 'weighing_no', key: 'weighing_no', width: 160 },
    { title: '门店ID', dataIndex: 'store_id', key: 'store_id', width: 80 },
    {
      title: '净重(kg)',
      dataIndex: 'net_weight_kg',
      key: 'net_weight_kg',
      render: (v: number) => v?.toFixed(2)
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (v: string) => <Tag color={statusColorMap[v]}>{v}</Tag>
    },
    {
      title: '时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (v: string) => dayjs(v).format('MM-DD HH:mm')
    }
  ]

  const maxWeight = Math.max(...(data?.weekly_trend.map(d => Number(d.weight_kg)) || [1]), 1)

  return (
    <div>
      <div className="page-header">
        <Title level={3} style={{ margin: 0 }}>数据看板</Title>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} md={6}>
          <Card>
            <Statistic
              title="门店总数"
              value={data?.stats.total_stores || 0}
              prefix={<ShopOutlined style={{ color: '#52c41a' }} />}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card>
            <Statistic
              title="在役车辆"
              value={data?.stats.active_vehicles || 0}
              prefix={<CarOutlined style={{ color: '#1890ff' }} />}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card>
            <Statistic
              title="今日预约"
              value={data?.stats.today_appointments || 0}
              prefix={<CalendarOutlined style={{ color: '#722ed1' }} />}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card>
            <Statistic
              title="今日称重"
              value={data?.stats.today_weighings || 0}
              prefix={<FileDoneOutlined style={{ color: '#13c2c2' }} />}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card>
            <Statistic
              title="待处理异常"
              value={data?.stats.pending_exceptions || 0}
              valueStyle={{ color: '#ff4d4f' }}
              prefix={<ExceptionOutlined style={{ color: '#ff4d4f' }} />}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card>
            <Statistic
              title="待核对证明"
              value={data?.stats.pending_verifications || 0}
              prefix={<SafetyCertificateOutlined style={{ color: '#fa8c16' }} />}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card>
            <Statistic
              title="今日回收(kg)"
              value={Number(data?.stats.total_weight_kg_today || 0).toFixed(2)}
              precision={2}
              prefix={<RiseOutlined style={{ color: '#52c41a' }} />}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card>
            <Statistic
              title="今日金额(元)"
              value={Number(data?.stats.total_amount_today || 0).toFixed(2)}
              precision={2}
              prefix="¥"
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={10}>
          <Card title="近7日回收趋势">
            <List
              dataSource={data?.weekly_trend || []}
              renderItem={(item) => (
                <List.Item style={{ padding: '8px 0' }}>
                  <div style={{ width: 100 }}>{item.date}</div>
                  <div style={{ flex: 1, margin: '0 12px' }}>
                    <Progress
                      percent={Math.round((Number(item.weight_kg) / maxWeight) * 100)}
                      showInfo={false}
                      size="small"
                      status={item.count > 0 ? 'active' : undefined}
                    />
                  </div>
                  <div style={{ width: 120, textAlign: 'right' }}>
                    <Text strong>{Number(item.weight_kg).toFixed(2)} kg</Text>
                    <Text type="secondary" style={{ marginLeft: 8 }}>{item.count}单</Text>
                  </div>
                </List.Item>
              )}
            />
          </Card>
        </Col>
        <Col xs={24} lg={14}>
          <Card title="最近异常">
            <Table
              loading={loading}
              size="small"
              dataSource={data?.recent_exceptions || []}
              columns={exceptionColumns}
              pagination={false}
              rowKey="id"
            />
          </Card>
        </Col>
      </Row>

      <Card title="最近称重记录">
        <Table
          loading={loading}
          size="small"
          dataSource={data?.recent_weighings || []}
          columns={weighingColumns}
          pagination={false}
          rowKey="id"
        />
      </Card>
    </div>
  )
}

export default Dashboard
