import { useState } from 'react'
import { Outlet, Link, useNavigate } from 'react-router-dom'
import { Layout, Menu, Dropdown, Avatar, Button, App } from 'antd'
import {
  DashboardOutlined,
  ShopOutlined,
  CarOutlined,
  EnvironmentOutlined,
  ExceptionOutlined,
  BarChartOutlined,
  GlobalOutlined,
  PlusSquareOutlined,
  TeamOutlined,
  BankOutlined,
  FileDoneOutlined,
  SettingOutlined,
  UserOutlined,
  LogoutOutlined,
  SafetyCertificateOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined
} from '@ant-design/icons'
import { useAuthStore } from '@/store/auth'
import type { UserRole } from '@/types'

const { Header, Sider, Content } = Layout

const roleMenuMap: Record<UserRole, string> = {
  admin: '系统管理员',
  store: '餐饮门店',
  driver: '回收司机',
  inspector: '监管人员'
}

function MainLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const { modal } = App.useApp()

  const handleLogout = () => {
    modal.confirm({
      title: '确认退出登录',
      content: '确定要退出登录吗？',
      onOk: () => {
        logout()
        navigate('/login')
      }
    })
  }

  const userMenu = {
    items: [
      {
        key: 'logout',
        icon: <LogoutOutlined />,
        label: '退出登录',
        onClick: handleLogout
      }
    ]
  }

  const menuItems = [
    {
      key: '/dashboard',
      icon: <BarChartOutlined />,
      label: <Link to="/dashboard">数据看板</Link>
    },
    {
      key: '/map',
      icon: <EnvironmentOutlined />,
      label: <Link to="/map">地图监控</Link>
    },
    {
      key: '/appointments',
      icon: <PlusSquareOutlined />,
      label: <Link to="/appointments">回收预约</Link>
    },
    {
      key: '/weighings',
      icon: <FileDoneOutlined />,
      label: <Link to="/weighings">称重记录</Link>
    },
    {
      key: '/routes',
      icon: <GlobalOutlined />,
      label: <Link to="/routes">运输路线</Link>
    },
    {
      key: '/disposal-proofs',
      icon: <SafetyCertificateOutlined />,
      label: <Link to="/disposal-proofs">去向证明</Link>
    },
    {
      key: '/exceptions',
      icon: <ExceptionOutlined />,
      label: <Link to="/exceptions">异常清单</Link>
    },
    {
      key: '/settlements',
      icon: <BankOutlined />,
      label: <Link to="/settlements">结算管理</Link>
    },
    {
      key: '/stores',
      icon: <ShopOutlined />,
      label: <Link to="/stores">门店管理</Link>
    },
    {
      key: '/vehicles',
      icon: <CarOutlined />,
      label: <Link to="/vehicles">车辆管理</Link>
    },
    {
      key: '/disposal-factories',
      icon: <SettingOutlined />,
      label: <Link to="/disposal-factories">处置厂管理</Link>
    },
    {
      key: '/users',
      icon: <TeamOutlined />,
      label: <Link to="/users">用户管理</Link>
    }
  ]

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        width={220}
        style={{ background: '#001529' }}
      >
        <div style={{ height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: collapsed ? 18 : 20, fontWeight: 'bold', background: 'rgba(255,255,255,0.05)' }}>
          {collapsed ? '废油' : '废油回收监管'}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          defaultSelectedKeys={['/dashboard']}
          items={menuItems}
        />
      </Sider>
      <Layout>
        <Header style={{ background: '#fff', padding: '0 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 4px rgba(0,21,41,.08)' }}>
          <div>
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              style={{ fontSize: '16px', width: 64, height: 64 }}
            />
          </div>
          <div>
            <Dropdown menu={userMenu}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <Avatar icon={<UserOutlined />} src={user?.avatar_url} />
                <span>
                  {user?.real_name}
                  <span style={{ marginLeft: 8, color: '#888', fontSize: 12 }}>
                    ({roleMenuMap[user?.role || 'admin']})
                  </span>
                </span>
              </div>
            </Dropdown>
          </div>
        </Header>
        <Content style={{ margin: 0, background: '#f0f2f5' }}>
          <div className="page-container">
            <Outlet />
          </div>
        </Content>
      </Layout>
  </Layout>
  )
}

export default MainLayout
