import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Input,
  Space,
  Tag,
  DatePicker,
  Select,
  message,
  Row,
  Col,
  Statistic
} from 'antd';
import {
  SearchOutlined,
  EyeOutlined,
  DollarOutlined,
  PrinterOutlined
} from '@ant-design/icons';
import { invoicesAPI } from '../services/api';
import { useNavigate } from 'react-router-dom';
import moment from 'moment';

const { Search } = Input;
const { RangePicker } = DatePicker;
const { Option } = Select;

const InvoiceManagement = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  });
  const [filters, setFilters] = useState({
    search: '',
    payment_status: '',
    dateRange: null
  });
  const [stats, setStats] = useState({
    total_invoices: 0,
    total_revenue: 0,
    pending_invoices: 0,
    paid_invoices: 0
  });
  const navigate = useNavigate();

  useEffect(() => {
    fetchInvoices();
  }, [pagination.current, pagination.pageSize, filters]);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.current,
        limit: pagination.pageSize,
        ...filters
      };

      if (filters.dateRange && filters.dateRange.length === 2) {
        params.start_date = filters.dateRange[0].format('YYYY-MM-DD');
        params.end_date = filters.dateRange[1].format('YYYY-MM-DD');
      }

      const response = await invoicesAPI.getInvoices(params);
      
      if (response.data.success) {
        setInvoices(response.data.data);
        setPagination(prev => ({
          ...prev,
          total: response.data.pagination.totalItems
        }));
        calculateStats(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching invoices:', error);
      message.error('Không thể tải danh sách hóa đơn');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (invoiceData) => {
    const totalInvoices = invoiceData.length;
    const totalRevenue = invoiceData.reduce((sum, invoice) => sum + parseFloat(invoice.total_amount), 0);
    const pendingInvoices = invoiceData.filter(invoice => invoice.payment_status === 'pending').length;
    const paidInvoices = invoiceData.filter(invoice => invoice.payment_status === 'paid').length;

    setStats({
      total_invoices: totalInvoices,
      total_revenue: totalRevenue,
      pending_invoices: pendingInvoices,
      paid_invoices: paidInvoices
    });
  };

  const handleSearch = (value) => {
    setFilters(prev => ({ ...prev, search: value }));
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'paid':
        return 'green';
      case 'pending':
        return 'orange';
      default:
        return 'default';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'paid':
        return 'Đã thanh toán';
      case 'pending':
        return 'Chờ thanh toán';
      default:
        return status;
    }
  };

  const columns = [
    {
      title: 'Số hóa đơn',
      dataIndex: 'id',
      key: 'id',
      width: 100,
      render: (id) => `#${id}`,
    },
    {
      title: 'Bệnh nhân',
      dataIndex: 'patient_name',
      key: 'patient_name',
      sorter: (a, b) => a.patient_name.localeCompare(b.patient_name),
    },
    {
      title: 'Số điện thoại',
      dataIndex: 'phone_number',
      key: 'phone_number',
      width: 120,
    },
    {
      title: 'Tiền khám',
      dataIndex: 'consultation_fee',
      key: 'consultation_fee',
      width: 120,
      render: (amount) => formatCurrency(amount),
    },
    {
      title: 'Tiền thuốc',
      dataIndex: 'medicine_fee',
      key: 'medicine_fee',
      width: 120,
      render: (amount) => formatCurrency(amount),
    },
    {
      title: 'Tổng cộng',
      dataIndex: 'total_amount',
      key: 'total_amount',
      width: 120,
      render: (amount) => formatCurrency(amount),
      sorter: (a, b) => a.total_amount - b.total_amount,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'payment_status',
      key: 'payment_status',
      width: 120,
      render: (status) => (
        <Tag color={getStatusColor(status)}>
          {getStatusText(status)}
        </Tag>
      ),
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 120,
      render: (date) => moment(date).format('DD/MM/YYYY'),
      sorter: (a, b) => new Date(a.created_at) - new Date(b.created_at),
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 120,
      render: (_, record) => (
        <Space>
          <Button
            size="small"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/invoices/${record.id}`)}
          >
            Xem
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <h1 style={{ marginBottom: 24 }}>Quản lý hóa đơn</h1>
      
      { }
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Tổng hóa đơn"
              value={stats.total_invoices}
              prefix={<DollarOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Tổng doanh thu"
              value={stats.total_revenue}
              formatter={(value) => formatCurrency(value)}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Chờ thanh toán"
              value={stats.pending_invoices}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Đã thanh toán"
              value={stats.paid_invoices}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
      </Row>

      <Card>
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
            <Search
              placeholder="Tìm kiếm theo tên bệnh nhân"
              allowClear
              onSearch={handleSearch}
              style={{ width: 300 }}
              prefix={<SearchOutlined />}
            />
            <Select
              placeholder="Trạng thái"
              allowClear
              style={{ width: 150 }}
              onChange={(value) => handleFilterChange('payment_status', value)}
            >
              <Option value="pending">Chờ thanh toán</Option>
              <Option value="paid">Đã thanh toán</Option>
            </Select>
            <RangePicker
              placeholder={['Từ ngày', 'Đến ngày']}
              onChange={(dates) => handleFilterChange('dateRange', dates)}
            />
          </div>
        </div>

        <Table
          columns={columns}
          dataSource={invoices}
          loading={loading}
          rowKey="id"
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} của ${total} hóa đơn`,
            onChange: (page, pageSize) => {
              setPagination(prev => ({
                ...prev,
                current: page,
                pageSize: pageSize || prev.pageSize
              }));
            }
          }}
          scroll={{ x: 1000 }}
        />
      </Card>
    </div>
  );
};

export default InvoiceManagement;
