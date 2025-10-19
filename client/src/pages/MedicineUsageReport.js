import React, { useState, useEffect } from 'react';
import { Card, DatePicker, Button, Table, Row, Col, Statistic, message, Spin } from 'antd';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { reportsAPI } from '../services/api';
import moment from 'moment';

const { RangePicker } = DatePicker;

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

const MedicineUsageReport = () => {
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState({
    medicine_usage: [],
    summary: {}
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
      const response = await reportsAPI.getMedicineUsageReport({
        month: dateRange[0].month() + 1,
        year: dateRange[0].year()
      });
      
      if (response.data.success) {
        setReportData(response.data.data);
      }
    } catch (error) {
      message.error('Không thể tải báo cáo sử dụng thuốc');
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

  const chartData = reportData.medicine_usage.slice(0, 10).map((item, index) => {
    const quantity = typeof item.total_quantity_used === 'string' ? parseFloat(item.total_quantity_used) : item.total_quantity_used;
    return {
      name: item.medicine_name || 'Unknown',
      value: (quantity === null || quantity === undefined || isNaN(quantity)) ? 0 : quantity,
      color: COLORS[index % COLORS.length]
    };
  });

  const columns = [
    {
      title: 'Tên thuốc',
      dataIndex: 'medicine_name',
      key: 'medicine_name',
    },
    {
      title: 'Đơn vị',
      dataIndex: 'unit',
      key: 'unit',
    },
    {
      title: 'Tổng số lượng',
      dataIndex: 'total_quantity_used',
      key: 'total_quantity_used',
      render: (value) => {
        if (value === null || value === undefined || value === '') {
          return '0';
        }
        const numValue = typeof value === 'string' ? parseFloat(value) : value;
        return isNaN(numValue) ? '0' : numValue.toString();
      },
      sorter: (a, b) => {
        const aVal = typeof a.total_quantity_used === 'string' ? parseFloat(a.total_quantity_used) : a.total_quantity_used;
        const bVal = typeof b.total_quantity_used === 'string' ? parseFloat(b.total_quantity_used) : b.total_quantity_used;
        return (aVal || 0) - (bVal || 0);
      },
    },
    {
      title: 'Số lần kê đơn',
      dataIndex: 'prescription_count',
      key: 'prescription_count',
      render: (value) => {
        if (value === null || value === undefined || value === '') {
          return '0';
        }
        const numValue = typeof value === 'string' ? parseInt(value) : value;
        return isNaN(numValue) ? '0' : numValue.toString();
      },
      sorter: (a, b) => {
        const aVal = typeof a.prescription_count === 'string' ? parseInt(a.prescription_count) : a.prescription_count;
        const bVal = typeof b.prescription_count === 'string' ? parseInt(b.prescription_count) : b.prescription_count;
        return (aVal || 0) - (bVal || 0);
      },
    },
    {
      title: 'TB/đơn thuốc',
      dataIndex: 'average_quantity_per_prescription',
      key: 'average_quantity_per_prescription',
      render: (value) => {
        if (value === null || value === undefined || value === '') {
          return '-';
        }
        const numValue = typeof value === 'string' ? parseFloat(value) : value;
        return isNaN(numValue) ? '-' : numValue.toFixed(1);
      },
    },
    {
      title: 'Tổng giá trị',
      dataIndex: 'total_value',
      key: 'total_value',
      render: (amount) => {
        if (amount === null || amount === undefined || amount === '') {
          return formatCurrency(0);
        }
        const numValue = typeof amount === 'string' ? parseFloat(amount) : amount;
        return formatCurrency(isNaN(numValue) ? 0 : numValue);
      },
      sorter: (a, b) => {
        const aVal = typeof a.total_value === 'string' ? parseFloat(a.total_value) : a.total_value;
        const bVal = typeof b.total_value === 'string' ? parseFloat(b.total_value) : b.total_value;
        return (aVal || 0) - (bVal || 0);
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
      <h1>Báo cáo sử dụng thuốc</h1>
      
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
                title="Số loại thuốc"
                value={parseInt(reportData.summary.unique_medicines_used) || 0}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={6}>
            <Card>
              <Statistic
                title="Tổng thuốc đã dùng"
                value={parseFloat(reportData.summary.total_medicines_dispensed) || 0}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={6}>
            <Card>
              <Statistic
                title="Tổng giá trị thuốc"
                value={parseFloat(reportData.summary.total_medicine_value) || 0}
                formatter={(value) => formatCurrency(value)}
                valueStyle={{ color: '#722ed1' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={6}>
            <Card>
              <Statistic
                title="Tổng đơn thuốc"
                value={parseInt(reportData.summary.total_prescriptions) || 0}
                valueStyle={{ color: '#faad14' }}
              />
            </Card>
          </Col>
        </Row>
      </Card>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={12}>
          <Card>
            <h3>Top 10 thuốc sử dụng nhiều nhất</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card>
            <h3>Biểu đồ số lượng thuốc</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#1890ff" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      <Card>
        <h3>Chi tiết sử dụng thuốc</h3>
        <Table
          columns={columns}
          dataSource={reportData.medicine_usage}
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} của ${total} thuốc`,
          }}
          rowKey="medicine_name"
          scroll={{ x: 800 }}
        />
      </Card>
    </div>
  );
};

export default MedicineUsageReport;
