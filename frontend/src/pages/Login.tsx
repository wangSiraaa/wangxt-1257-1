import { useState } from 'react'
import { Form, Input, Button, Card, App } from 'antd'
import { UserOutlined, LockOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { authApi } from '@/api'
import { useAuthStore } from '@/store/auth'

function Login() {
  const [loading, setLoading] = useState(false)
  const [form] = Form.useForm()
  const navigate = useNavigate()
  const login = useAuthStore(state => state.login)
  const { message } = App.useApp()

  const onFinish = async (values: { username: string, password: string }) => {
    setLoading(true)
    try {
      const result = await authApi.login(values.username, values.password)
      login(result.access_token, result.user)
      message.success('登录成功')
      navigate('/dashboard')
    } catch (e) {
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #1677ff 0%, #69b1ff 100%)'
    }}>
      <Card style={{ width: 400, boxShadow: '0 4px 12px rgba(0,0,0,0.15)'}}
        <div style={{ textAlign: 'center', marginBottom: 32 }}
          <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 8 }}>餐厨废油回收监管系统</h1>
          <p style={{ color: '#888' }}>请登录您的账号</p>
        </div>
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          size="large"
        >
          <Form.Item
            name="username"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="用户名"
              autoComplete="username"
            />
          </Form.Item>
          <Form.Item
            name="password"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="密码"
              autoComplete="current-password"
            />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0 }}>
            <Button type="primary" htmlType="submit" loading={loading} block>
              登录
            </Button>
          </Form.Item>
        </Form>
        <div style={{ marginTop: 16, textAlign: 'center', color: '#999', fontSize: 12 }}>
          <div>测试账号: admin / store01 / driver01 / inspector01</div>
          <div>密码均为: admin123 / store123 / driver123 / inspector123</div>
        </div>
      </Card>
    </div>
  )
}

export default Login
