import React, { useState, useEffect } from 'react';
import { Card, DatePicker, Button, Table, Row, Col, Statistic, message, Spin } from 'antd';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { reportsAPI } from '../services/api';
import moment from 'moment';

const { RangePicker } = DatePicker;

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

const PatientStatsReport = () => {
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState({
    patient_statistics: {},
    age_group_statistics: []
  });
  const [dateRange, setDateRange] = useState([
    moment().startOf('month'),
    moment().endOf('month')
  ]);

  useEffect(() => {
    fetchReport();
  }, [dateRange]);

  const fetchReport = async () => {
    if (!dateRange || dateRange.length !== 2) return;

    try {
      setLoading(true);
      const response = await reportsAPI.getPatientStatsReport({
        start_date: dateRange[0].format('YYYY-MM-DD'),
        end_date: dateRange[1].format('YYYY-MM-DD')
      });
      
      if (response.data.success) {
        setReportData(response.data.data);
        message.success('Tải báo cáo thống kê bệnh nhân thành công');
      } else {
        message.error(response.data.message || 'Không thể tải báo cáo thống kê bệnh nhân');
      }
    } catch (error) {
      console.error('Error fetching patient stats report:', error);
      if (error.response) {
        message.error(`Lỗi API: ${error.response.data?.message || error.response.statusText}`);
      } else if (error.request) {
        message.error('Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng.');
      } else {
        message.error('Không thể tải báo cáo thống kê bệnh nhân');
      }
    } finally {
      setLoading(false);
    }
  };

  const ageGroupData = (reportData.age_group_statistics || []).map((item, index) => ({
    name: item.age_group || 'Unknown',
    value: parseInt(item.patient_count) || 0,
    color: COLORS[index % COLORS.length]
  }));

  
  console.log('Age group data for chart:', ageGroupData);
  console.log('Age group statistics for table:', reportData.age_group_statistics);

  const genderData = [
    {
      name: 'Nam',
      value: parseInt(reportData.patient_statistics?.male_patients) || 0,
      color: '#1890ff'
    },
    {
      name: 'Nữ',
      value: parseInt(reportData.patient_statistics?.female_patients) || 0,
      color: '#ff69b4'
    }
  ];

  const appointmentStatusData = [
    {
      name: 'Chờ khám',
      value: parseInt(reportData.patient_statistics?.waiting_appointments) || 0,
      color: '#faad14'
    },
    {
      name: 'Đã khám',
      value: parseInt(reportData.patient_statistics?.examined_appointments) || 0,
      color: '#52c41a'
    },
    {
      name: 'Hoàn thành',
      value: parseInt(reportData.patient_statistics?.completed_appointments) || 0,
      color: '#722ed1'
    }
  ];

  const ageGroupColumns = [
    {
      title: 'Nhóm tuổi',
      dataIndex: 'age_group',
      key: 'age_group',
    },
    {
      title: 'Số bệnh nhân',
      dataIndex: 'patient_count',
      key: 'patient_count',
      sorter: (a, b) => a.patient_count - b.patient_count,
    },
    {
      title: 'Tỷ lệ (%)',
      key: 'percentage',
      render: (_, record) => {
        const total = parseInt(reportData.patient_statistics?.total_patients) || 1;
        const count = parseInt(record.patient_count) || 0;
        return ((count / total) * 100).toFixed(1) + '%';
      },
    },
  ];

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div>
      <h1>Thống kê bệnh nhân</h1>
      
      <Card style={{ marginBottom: 24 }}>
        <div style={{ marginBottom: 16, display: 'flex', gap: 16, alignItems: 'center' }}>
          <RangePicker
            value={dateRange}
            onChange={setDateRange}
             format="DD/MM/YYYY" />
          <Button type="primary" onClick={fetchReport}>
            Tải báo cáo
          </Button>
        </div>

        <Row gutter={[16, 16]}>
          <Col xs={24} sm={6}>
            <Card>
              <Statistic
                title="Tổng bệnh nhân"
                value={parseInt(reportData.patient_statistics?.total_patients) || 0}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={6}>
            <Card>
              <Statistic
                title="Tổng lượt khám"
                value={parseInt(reportData.patient_statistics?.total_appointments) || 0}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={6}>
            <Card>
              <Statistic
                title="Nam"
                value={parseInt(reportData.patient_statistics?.male_patients) || 0}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={6}>
            <Card>
              <Statistic
                title="Nữ"
                value={parseInt(reportData.patient_statistics?.female_patients) || 0}
                valueStyle={{ color: '#ff69b4' }}
              />
            </Card>
          </Col>
        </Row>
      </Card>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={8}>
          <Card>
            <h3>Phân bố theo giới tính</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={genderData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {genderData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card>
            <h3>Phân bố theo nhóm tuổi</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={ageGroupData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#52c41a" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card>
            <h3>Trạng thái khám bệnh</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={appointmentStatusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {appointmentStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      <Card>
        <h3>Chi tiết phân bố theo nhóm tuổi</h3>
        <Table
          columns={ageGroupColumns}
          dataSource={reportData.age_group_statistics}
          pagination={false}
          rowKey="age_group"
        data-testid="table" />
      </Card>
    </div>
  );
};

export default PatientStatsReport;
