import React, { useState } from 'react';
import { Layout as AntLayout, Menu, Button, Dropdown, Avatar, message, Badge } from 'antd';
import {
  DashboardOutlined,
  UserOutlined,
  CalendarOutlined,
  FileTextOutlined,
  MedicineBoxOutlined,
  SettingOutlined,
  BarChartOutlined,
  LogoutOutlined,
  KeyOutlined,
  TeamOutlined,
  DatabaseOutlined,
  FileSearchOutlined,
  DollarOutlined,
  BellOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import ChangePasswordModal from './ChangePasswordModal';

const { Header, Sider, Content } = AntLayout;

const Layout = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [changePasswordVisible, setChangePasswordVisible] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    message.success('Đăng xuất thành công!');
  };

  const handleChangePassword = () => {
    setChangePasswordVisible(true);
  };

  const getMenuItems = () => {
    const baseItems = [
      {
        key: '/',
        icon: <DashboardOutlined />,
        label: 'Tổng quan',
      },
      {
        key: '/appointments',
        icon: <CalendarOutlined />,
        label: 'Danh sách khám bệnh',
      }, 
      {
        key: "/receipts", 
        icon: <MedicineBoxOutlined />, 
        label: "Quản lý nhập thuốc",
      }
    ];

    if (user?.role === 'receptionist' || user?.role === 'admin') {
      baseItems.push(
        {
          key: '/patients',
          icon: <UserOutlined />,
          label: 'Quản lý bệnh nhân',
        },
        {
          key: '/invoices',
          icon: <DollarOutlined />,
          label: 'Quản lý hóa đơn',
        }
      );
    }

    if (user?.role === 'doctor' || user?.role === 'admin') {
      const medicalChildren = [];
      
      if (user?.role === 'doctor') {
        medicalChildren.push({
          key: '/doctor-medical-history',
          label: 'Lịch sử khám bệnh',
        });
      } else if (user?.role === 'admin') {
        medicalChildren.push({
          key: '/medical-history',
          label: 'Lịch sử khám bệnh',
        });
      }

      if (user?.role === 'admin') {
        medicalChildren.push({
          key: '/medical-records',
          label: 'Quản lý hồ sơ bệnh án',
        });
      }

      baseItems.push({
        key: 'medical',
        icon: <FileTextOutlined />,
        label: 'Hồ sơ bệnh án',
        children: medicalChildren,
      });
    }

    if (user?.role === 'admin') {
      baseItems.push(
        {
          key: 'master-data',
          icon: <DatabaseOutlined />,
          label: 'Dữ liệu gốc',
          children: [
            {
              key: '/medicines',
              icon: <MedicineBoxOutlined />,
              label: 'Quản lý thuốc',
            },
            {
              key: '/diseases',
              icon: <FileSearchOutlined />,
              label: 'Quản lý loại bệnh',
            },
            {
              key: '/units',
              icon: <DatabaseOutlined />,
              label: 'Quản lý đơn vị',
            },
            {
              key: '/usage-methods',
              icon: <DatabaseOutlined />,
              label: 'Quản lý cách dùng',
            },
          ],
        },
        {
          key: 'management',
          icon: <TeamOutlined />,
          label: 'Quản lý hệ thống',
          children: [
            {
              key: '/users',
              icon: <UserOutlined />,
              label: 'Quản lý người dùng',
            },
            {
              key: '/settings',
              icon: <SettingOutlined />,
              label: 'Cài đặt hệ thống',
            },
          ],
        },
        {
          key: 'reports',
          icon: <BarChartOutlined />,
          label: 'Báo cáo thống kê',
          children: [
            {
              key: '/reports/revenue',
              icon: <DollarOutlined />,
              label: 'Báo cáo doanh thu',
            },
            {
              key: '/reports/medicine-usage',
              icon: <MedicineBoxOutlined />,
              label: 'Báo cáo sử dụng thuốc',
            },
            {
              key: '/reports/patient-stats',
              icon: <UserOutlined />,
              label: 'Thống kê bệnh nhân',
            },
          ],
        }
      );
    }

    return baseItems;
  };

  const userMenuItems = [
    {
      key: 'change-password',
      icon: <KeyOutlined />,
      label: 'Đổi mật khẩu',
      onClick: handleChangePassword,
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Đăng xuất',
      onClick: handleLogout,
      danger: true,
    },
  ];

  const getRoleLabel = (role) => {
    switch (role) {
      case 'admin':
        return 'Quản trị viên';
      case 'receptionist':
        return 'Lễ tân';
      case 'doctor':
        return 'Bác sĩ';
      default:
        return 'Người dùng';
    }
  };

  return (
    <AntLayout style={{ minHeight: '100vh' }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        width={260}
        style={{
          overflow: 'auto',
          height: '100vh',
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          background: 'linear-gradient(180deg, #001529 0%, #002140 100%)',
          boxShadow: '4px 0 24px rgba(0, 0, 0, 0.15)',
        }}
      >
        <div
          style={{
            height: 80,
            margin: 0,
            padding: '20px',
            background: 'linear-gradient(135deg, #1890ff 0%, #096dd9 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: 'bold',
            fontSize: collapsed ? 18 : 20,
            letterSpacing: '1px',
            borderBottom: '3px solid rgba(255, 255, 255, 0.1)',
            transition: 'all 0.3s ease',
          }}
        >
          {collapsed ? '' : 'Phòng Mạch Tư'}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={getMenuItems()}
          onClick={({ key }) => {
            if (key.startsWith('/')) {
              navigate(key);
            }
          }}
          style={{
            background: 'transparent',
            border: 'none',
            marginTop: 8,
          }}
        />
      </Sider>
      <AntLayout style={{ marginLeft: collapsed ? 80 : 260, transition: 'all 0.2s' }}>
        <Header
        
          style={{
            padding: '0 32px',
            background: 'linear-gradient(135deg, #ffffff 0%, #f5f7fa 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
            position: 'sticky',
            top: 0,
            zIndex: 999,
            borderBottom: '1px solid #e8e8e8',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              style={{
                fontSize: '18px',
                width: 40,
                height: 40,
                color: '#1890ff',
              }}
            />
            <h2 style={{ 
              margin: 0, 
              background: 'linear-gradient(135deg, #1890ff 0%, #096dd9 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              fontWeight: 700,
              fontSize: 20,
            }}>
              Hệ thống quản lý phòng mạch tư
            </h2>
          </div>
         

          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ color: '#666' }}>
              Xin chào, <strong>{user?.username}</strong> ({getRoleLabel(user?.role)})
            </span>
            <Dropdown
              menu={{ items: userMenuItems }}
              placement="bottomRight"
              arrow
            >
              <Button type="text" style={{ padding: 0 }}>
                <Avatar icon={<UserOutlined />} />
              </Button>
            </Dropdown>
          </div>


        </Header>
        <Content 
          style={{ 
            margin: 0, 
            minHeight: 280,
            background: '#f0f2f5',
          }}
        >
          {children}
        </Content>
      </AntLayout>
      <ChangePasswordModal
        visible={changePasswordVisible}
        onCancel={() => setChangePasswordVisible(false)}
      />
    </AntLayout>
  );
};

export default Layout;