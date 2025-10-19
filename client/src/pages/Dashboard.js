import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, DatePicker, Select, Spin, message } from 'antd';
import { 
  UserOutlined, 
  CalendarOutlined, 
  CheckCircleOutlined, 
  DollarOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  MedicineBoxOutlined
} from '@ant-design/icons';
import { reportsAPI, appointmentsAPI, invoicesAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import moment from 'moment';

const { RangePicker } = DatePicker;
const { Option } = Select;

const Dashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState({
    today: {
      appointments: {
        total_appointments: 0,
        waiting_count: 0,
        examined_count: 0,
        completed_count: 0
      },
      revenue: {
        invoices_count: 0,
        total_revenue: 0
      }
    },
    monthly: {
      revenue: {
        invoices_count: 0,
        total_revenue: 0
      }
    }
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      
      const appointmentsResponse = await appointmentsAPI.getDailyAppointments({
        date: moment().format('YYYY-MM-DD')
      });
      
      let appointmentsData = {
        total_appointments: 0,
        waiting_count: 0,
        examined_count: 0,
        completed_count: 0
      };
      
      if (appointmentsResponse.data.success) {
        const appointments = appointmentsResponse.data.data;
        appointmentsData = {
          total_appointments: appointments.length,
          waiting_count: appointments.filter(apt => apt.status === 'waiting').length,
          examined_count: appointments.filter(apt => apt.status === 'examined').length,
          completed_count: appointments.filter(apt => apt.status === 'completed').length
        };
      }
      
      
      let revenueData = {
        today: { invoices_count: 0, total_revenue: 0 },
        monthly: { invoices_count: 0, total_revenue: 0 }
      };
      
      if (user?.role === 'receptionist' || user?.role === 'admin') {
        try {
          const revenueResponse = await reportsAPI.getDashboardStats();
          if (revenueResponse.data.success) {
            revenueData = {
              today: revenueResponse.data.data.today.revenue,
              monthly: revenueResponse.data.data.monthly.revenue
            };
          }
        } catch (error) {
          console.log('Revenue data not available:', error.message);
        }
      }
      
      setDashboardData({
        today: {
          appointments: appointmentsData,
          revenue: revenueData.today
        },
        monthly: {
          revenue: revenueData.monthly
        }
      });
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      message.error('Không thể tải dữ liệu tổng quan');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };

  const getRoleTitle = (role) => {
    switch (role) {
      case 'receptionist':
        return 'Lễ tân';
      case 'doctor':
        return 'Bác sĩ';
      case 'admin':
        return 'Quản trị viên';
      default:
        return 'Người dùng';
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div>
      <h1 style={{ marginBottom: 24 }}>Tổng quan hệ thống</h1>
      
      <Row gutter={[16, 16]}>
        { }
        <Col xs={24} sm={12} lg={6}>
          <Card className="dashboard-card">
            <div className="dashboard-stat">
              <Statistic
                title="Tổng số khám hôm nay"
                value={dashboardData.today.appointments.total_appointments}
                prefix={<CalendarOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card className="dashboard-card">
            <div className="dashboard-stat">
              <Statistic
                title="Chờ khám"
                value={dashboardData.today.appointments.waiting_count}
                prefix={<ClockCircleOutlined />}
                valueStyle={{ color: '#faad14' }}
              />
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card className="dashboard-card">
            <div className="dashboard-stat">
              <Statistic
                title="Đã khám"
                value={dashboardData.today.appointments.examined_count}
                prefix={<UserOutlined />}
                valueStyle={{ color: '#52c41a' }}
              />
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card className="dashboard-card">
            <div className="dashboard-stat">
              <Statistic
                title="Hoàn thành"
                value={dashboardData.today.appointments.completed_count}
                prefix={<CheckCircleOutlined />}
                valueStyle={{ color: '#722ed1' }}
              />
            </div>
          </Card>
        </Col>

        { }
        {(user?.role === 'receptionist' || user?.role === 'admin') && (
          <>
            <Col xs={24} sm={12} lg={12}>
              <Card className="dashboard-card">
                <div className="dashboard-stat">
                  <Statistic
                    title="Doanh thu hôm nay"
                    value={dashboardData.today.revenue.total_revenue}
                    formatter={(value) => formatCurrency(value)}
                    prefix={<DollarOutlined />}
                    valueStyle={{ color: '#52c41a' }}
                  />
                  <div style={{ marginTop: 8, fontSize: 14, color: '#666' }}>
                    {dashboardData.today.revenue.invoices_count} hóa đơn
                  </div>
                </div>
              </Card>
            </Col>

            <Col xs={24} sm={12} lg={12}>
              <Card className="dashboard-card">
                <div className="dashboard-stat">
                  <Statistic
                    title="Doanh thu tháng này"
                    value={dashboardData.monthly.revenue.total_revenue}
                    formatter={(value) => formatCurrency(value)}
                    prefix={<DollarOutlined />}
                    valueStyle={{ color: '#1890ff' }}
                  />
                  <div style={{ marginTop: 8, fontSize: 14, color: '#666' }}>
                    {dashboardData.monthly.revenue.invoices_count} hóa đơn
                  </div>
                </div>
              </Card>
            </Col>
          </>
        )}

        { }
        {user?.role === 'doctor' && (
          <>
            <Col xs={24} sm={12} lg={12}>
              <Card className="dashboard-card">
                <div className="dashboard-stat">
                  <Statistic
                    title="Bệnh nhân chờ khám"
                    value={dashboardData.today.appointments.waiting_count}
                    prefix={<ClockCircleOutlined />}
                    valueStyle={{ color: '#faad14' }}
                  />
                  <div style={{ marginTop: 8, fontSize: 14, color: '#666' }}>
                    Cần khám ngay
                  </div>
                </div>
              </Card>
            </Col>

            <Col xs={24} sm={12} lg={12}>
              <Card className="dashboard-card">
                <div className="dashboard-stat">
                  <Statistic
                    title="Đã khám hôm nay"
                    value={dashboardData.today.appointments.examined_count}
                    prefix={<FileTextOutlined />}
                    valueStyle={{ color: '#52c41a' }}
                  />
                  <div style={{ marginTop: 8, fontSize: 14, color: '#666' }}>
                    Chờ lễ tân tạo hóa đơn
                  </div>
                </div>
              </Card>
            </Col>
          </>
        )}
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col span={24}>
          <Card title={`Hướng dẫn sử dụng - ${getRoleTitle(user?.role)}`} className="dashboard-card">
            <Row gutter={[16, 16]}>
              {user?.role === 'receptionist' && (
                <Col xs={24} md={12}>
                  <Card size="small" title="Công việc chính">
                    <ul>
                      <li>Quản lý bệnh nhân</li>
                      <li>Thêm bệnh nhân vào danh sách khám</li>
                      <li>Lập hóa đơn thanh toán</li>
                      <li>In hóa đơn cho bệnh nhân</li>
                      <li>Theo dõi trạng thái khám bệnh</li>
                    </ul>
                  </Card>
                </Col>
              )}
              
              {user?.role === 'doctor' && (
                <Col xs={24} md={12}>
                  <Card size="small" title="Công việc chính">
                    <ul>
                      <li>Xem danh sách bệnh nhân chờ khám</li>
                      <li>Lập phiếu khám bệnh</li>
                      <li>Kê đơn thuốc</li>
                      <li>Tra cứu lịch sử khám</li>
                      <li>Cập nhật trạng thái khám bệnh</li>
                    </ul>
                  </Card>
                </Col>
              )}
              
              {user?.role === 'admin' && (
                <Col xs={24} md={12}>
                  <Card size="small" title="Công việc chính">
                    <ul>
                      <li>Quản lý người dùng</li>
                      <li>Quản lý dữ liệu gốc</li>
                      <li>Cài đặt hệ thống</li>
                      <li>Xem báo cáo thống kê</li>
                      <li>Giám sát hoạt động</li>
                    </ul>
                  </Card>
                </Col>
              )}
              
              <Col xs={24} md={12}>
                <Card size="small" title="Thông tin hệ thống">
                  <ul>
                    <li>Hệ thống quản lý phòng mạch tư</li>
                    <li>Hỗ trợ 3 vai trò: Lễ tân, Bác sĩ, Admin</li>
                    <li>Quản lý bệnh nhân và lịch khám</li>
                    <li>Tự động tính toán hóa đơn</li>
                    <li>Báo cáo thống kê chi tiết</li>
                  </ul>
                </Card>
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;
