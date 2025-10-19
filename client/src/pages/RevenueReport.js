import React, { useState, useEffect } from 'react';
import { Card, DatePicker, Button, Table, Row, Col, Statistic, message, Spin } from 'antd';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { reportsAPI } from '../services/api';
import moment from 'moment';

const { RangePicker } = DatePicker;

const RevenueReport = () => {
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState({
    daily_revenue: [],
    monthly_summary: {}
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
      const response = await reportsAPI.getRevenueReport({
        month: dateRange[0].month() + 1,
        year: dateRange[0].year()
      });
      
      if (response.data.success) {
        setReportData(response.data.data);
      }
    } catch (error) {
      message.error('Không thể tải báo cáo doanh thu');
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

  const chartData = reportData.daily_revenue.map((item, index) => ({
    date: moment(item.date).format('DD/MM'),
    revenue: item.total_revenue,
    patients: item.patient_count
  }));

  const columns = [
    {
      title: 'Ngày',
      dataIndex: 'date',
      key: 'date',
      render: (date) => moment(date).format('DD/MM/YYYY'),
    },
    {
      title: 'Số bệnh nhân',
      dataIndex: 'patient_count',
      key: 'patient_count',
    },
    {
      title: 'Tiền khám',
      dataIndex: 'total_consultation_fee',
      key: 'total_consultation_fee',
      render: (amount) => formatCurrency(amount),
    },
    {
      title: 'Tiền thuốc',
      dataIndex: 'total_medicine_fee',
      key: 'total_medicine_fee',
      render: (amount) => formatCurrency(amount),
    },
    {
      title: 'Tổng doanh thu',
      dataIndex: 'total_revenue',
      key: 'total_revenue',
      render: (amount) => formatCurrency(amount),
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
      <h1>Báo cáo doanh thu</h1>
      
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
                value={reportData.monthly_summary.total_patients || 0}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={6}>
            <Card>
              <Statistic
                title="Tổng doanh thu"
                value={reportData.monthly_summary.total_revenue || 0}
                formatter={(value) => formatCurrency(value)}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={6}>
            <Card>
              <Statistic
                title="Doanh thu TB/bệnh nhân"
                value={reportData.monthly_summary.average_revenue_per_patient || 0}
                formatter={(value) => formatCurrency(value)}
                valueStyle={{ color: '#722ed1' }}
              />
            </Card>
          </Col>
        </Row>
      </Card>

      <Card style={{ marginBottom: 24 }}>
        <h3>Biểu đồ doanh thu theo ngày</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip formatter={(value, name) => [
              name === 'revenue' ? formatCurrency(value) : value,
              name === 'revenue' ? 'Doanh thu' : 'Số bệnh nhân'
            ]} />
            <Bar dataKey="revenue" fill="#1890ff" />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card>
        <h3>Chi tiết doanh thu theo ngày</h3>
        <Table
          columns={columns}
          dataSource={reportData.daily_revenue}
          pagination={false}
          rowKey="date"
          summary={(pageData) => {
            const totalRevenue = pageData.reduce((sum, item) => sum + item.total_revenue, 0);
            const totalPatients = pageData.reduce((sum, item) => sum + item.patient_count, 0);
            return (
              <Table.Summary.Row>
                <Table.Summary.Cell index={0}>
                  <strong>Tổng cộng</strong>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={1}>
                  <strong>{totalPatients}</strong>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={2}>
                  <strong>{formatCurrency(pageData.reduce((sum, item) => sum + item.total_consultation_fee, 0))}</strong>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={3}>
                  <strong>{formatCurrency(pageData.reduce((sum, item) => sum + item.total_medicine_fee, 0))}</strong>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={4}>
                  <strong>{formatCurrency(totalRevenue)}</strong>
                </Table.Summary.Cell>
              </Table.Summary.Row>
            );
          }}
        />
      </Card>
    </div>
  );
};

export default RevenueReport;
