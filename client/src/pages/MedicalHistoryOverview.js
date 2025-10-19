import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Input, Select, DatePicker, Space, Tag, message, Modal, Descriptions, Spin, Row, Col, Statistic } from 'antd';
import { SearchOutlined, EyeOutlined, UserOutlined, CalendarOutlined } from '@ant-design/icons';
import { medicalRecordsAPI, patientsAPI } from '../services/api';
import moment from 'moment';

const { Search } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;

const MedicalHistoryOverview = () => {
  const [loading, setLoading] = useState(false);
  const [medicalRecords, setMedicalRecords] = useState([]);
  const [patients, setPatients] = useState([]);
  const [filteredRecords, setFilteredRecords] = useState([]);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    patientId: '',
    dateRange: null,
    status: ''
  });

  useEffect(() => {
    fetchMedicalRecords();
    fetchPatients();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [medicalRecords, filters]);

  const fetchMedicalRecords = async () => {
    try {
      setLoading(true);
      const response = await medicalRecordsAPI.getAll();
      if (response.data.success) {
        setMedicalRecords(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching medical records:', error);
      message.error('Không thể tải danh sách lịch sử khám bệnh');
    } finally {
      setLoading(false);
    }
  };

  const fetchPatients = async () => {
    try {
      const response = await patientsAPI.getPatients();
      if (response.data.success) {
        setPatients(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching patients:', error);
    }
  };

  const applyFilters = () => {
    let filtered = [...medicalRecords];

    
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(record => 
        record.patient_name?.toLowerCase().includes(searchLower) ||
        record.symptoms?.toLowerCase().includes(searchLower) ||
        record.diagnosis?.toLowerCase().includes(searchLower)
      );
    }

    
    if (filters.patientId) {
      filtered = filtered.filter(record => record.patient_id === parseInt(filters.patientId));
    }

    
    if (filters.dateRange && filters.dateRange.length === 2) {
      const [startDate, endDate] = filters.dateRange;
      filtered = filtered.filter(record => {
        const recordDate = moment(record.created_at);
        return recordDate.isBetween(startDate, endDate, 'day', '[]');
      });
    }

    
    if (filters.status) {
      filtered = filtered.filter(record => record.status === filters.status);
    }

    setFilteredRecords(filtered);
  };

  const handleViewDetail = (record) => {
    setSelectedRecord(record);
    setDetailModalVisible(true);
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      patientId: '',
      dateRange: null,
      status: ''
    });
  };

  
  const getStatistics = () => {
    const totalRecords = filteredRecords.length;
    const completedRecords = filteredRecords.filter(r => r.status === 'completed').length;
    const pendingRecords = filteredRecords.filter(r => r.status === 'pending').length;
    const uniquePatients = new Set(filteredRecords.map(r => r.patient_id)).size;

    return {
      totalRecords,
      completedRecords,
      pendingRecords,
      uniquePatients
    };
  };

  const stats = getStatistics();

  const columns = [
    {
      title: 'Mã hồ sơ',
      dataIndex: 'id',
      key: 'id',
      width: 80,
    },
    {
      title: 'Bệnh nhân',
      dataIndex: 'patient_name',
      key: 'patient_name',
      render: (text, record) => (
        <div>
          <div style={{ fontWeight: 'bold' }}>{text}</div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            ID: {record.patient_id}
          </div>
        </div>
      ),
    },
    {
      title: 'Triệu chứng',
      dataIndex: 'symptoms',
      key: 'symptoms',
      ellipsis: true,
      render: (text) => text ? (text.length > 50 ? `${text.substring(0, 50)}...` : text) : '-',
    },
    {
      title: 'Chẩn đoán',
      dataIndex: 'diagnosis',
      key: 'diagnosis',
      ellipsis: true,
      render: (text) => text ? (text.length > 30 ? `${text.substring(0, 30)}...` : text) : '-',
    },
    {
      title: 'Ngày khám',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date) => moment(date).format('DD/MM/YYYY HH:mm'),
      sorter: (a, b) => moment(a.created_at).unix() - moment(b.created_at).unix(),
    },
    {
      title: 'Bác sĩ',
      dataIndex: 'doctor_name',
      key: 'doctor_name',
      render: (text) => text || '-',
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const statusConfig = {
          'completed': { color: 'green', text: 'Hoàn thành' },
          'pending': { color: 'orange', text: 'Chờ xử lý' },
          'cancelled': { color: 'red', text: 'Đã hủy' }
        };
        const config = statusConfig[status] || { color: 'default', text: status };
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 100,
      render: (_, record) => (
        <Space>
          <Button
            type="primary"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleViewDetail(record)}
          >
            Xem
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <h1>Lịch sử khám bệnh</h1>
      
      { }
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Tổng hồ sơ"
              value={stats.totalRecords}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Đã hoàn thành"
              value={stats.completedRecords}
              prefix={<CalendarOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Chờ xử lý"
              value={stats.pendingRecords}
              prefix={<CalendarOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Bệnh nhân"
              value={stats.uniquePatients}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
      </Row>
      
      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <Search
            placeholder="Tìm kiếm theo tên bệnh nhân, triệu chứng, chẩn đoán..."
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            style={{ width: 300 }}
            allowClear
          />
          <Select
            placeholder="Chọn bệnh nhân"
            value={filters.patientId}
            onChange={(value) => handleFilterChange('patientId', value)}
            style={{ width: 200 }}
            allowClear
          >
            {patients.map(patient => (
              <Option key={patient.id} value={patient.id}>
                {patient.name}
              </Option>
            ))}
          </Select>
          <RangePicker
            placeholder={['Từ ngày', 'Đến ngày']}
            value={filters.dateRange}
            onChange={(dates) => handleFilterChange('dateRange', dates)}
            format="DD/MM/YYYY"
          />
          <Select
            placeholder="Trạng thái"
            value={filters.status}
            onChange={(value) => handleFilterChange('status', value)}
            style={{ width: 120 }}
            allowClear
          >
            <Option value="completed">Hoàn thành</Option>
            <Option value="pending">Chờ xử lý</Option>
            <Option value="cancelled">Đã hủy</Option>
          </Select>
          <Button onClick={clearFilters}>
            Xóa bộ lọc
          </Button>
        </Space>
      </Card>

      <Card>
        <Table
          columns={columns}
          dataSource={filteredRecords}
          rowKey="id"
          loading={loading}
          pagination={{
            total: filteredRecords.length,
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => 
              `${range[0]}-${range[1]} của ${total} hồ sơ`,
          }}
          scroll={{ x: 1200 }}
        />
      </Card>

      <Modal
        title="Chi tiết hồ sơ bệnh án"
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setDetailModalVisible(false)}>
            Đóng
          </Button>
        ]}
        width={800}
      >
        {selectedRecord && (
          <div>
            <Descriptions bordered column={2}>
              <Descriptions.Item label="Mã hồ sơ" span={1}>
                <strong style={{ fontSize: '16px', color: '#1890ff' }}>#{selectedRecord.id}</strong>
              </Descriptions.Item>
              <Descriptions.Item label="Ngày khám" span={1}>
                <strong>{moment(selectedRecord.created_at).format('DD/MM/YYYY HH:mm')}</strong>
              </Descriptions.Item>
              <Descriptions.Item label="Bệnh nhân" span={1}>
                {selectedRecord.patient_name} (ID: {selectedRecord.patient_id})
              </Descriptions.Item>
              <Descriptions.Item label="Bác sĩ" span={1}>
                {selectedRecord.doctor_name || 'Chưa xác định'}
              </Descriptions.Item>
              <Descriptions.Item label="Loại bệnh" span={1}>
                {selectedRecord.disease_name || 'Chưa xác định'}
              </Descriptions.Item>
              <Descriptions.Item label="Trạng thái" span={1}>
                <Tag color={
                  selectedRecord.status === 'completed' ? 'green' : 
                  selectedRecord.status === 'pending' ? 'orange' : 'red'
                }>
                  {selectedRecord.status === 'completed' ? 'Hoàn thành' :
                   selectedRecord.status === 'pending' ? 'Chờ xử lý' : 'Đã hủy'}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Triệu chứng" span={2}>
                <div style={{ 
                  whiteSpace: 'pre-wrap', 
                  maxHeight: '120px', 
                  overflowY: 'auto',
                  padding: '8px',
                  backgroundColor: '#f5f5f5',
                  borderRadius: '4px',
                  border: '1px solid #d9d9d9'
                }}>
                  {selectedRecord.symptoms || 'Không có'}
                </div>
              </Descriptions.Item>
              <Descriptions.Item label="Chẩn đoán" span={2}>
                <div style={{ 
                  whiteSpace: 'pre-wrap', 
                  maxHeight: '120px', 
                  overflowY: 'auto',
                  padding: '8px',
                  backgroundColor: selectedRecord.diagnosis ? '#f6ffed' : '#fff7e6',
                  borderRadius: '4px',
                  border: `1px solid ${selectedRecord.diagnosis ? '#b7eb8f' : '#ffd591'}`
                }}>
                  {selectedRecord.diagnosis || 'Chưa chẩn đoán'}
                </div>
              </Descriptions.Item>
            </Descriptions>

            {selectedRecord.prescriptions && selectedRecord.prescriptions.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <h4>Đơn thuốc:</h4>
                <Table
                  dataSource={selectedRecord.prescriptions}
                  columns={[
                    { title: 'Thuốc', dataIndex: 'medicine_name', key: 'medicine_name' },
                    { title: 'Số lượng', dataIndex: 'quantity', key: 'quantity' },
                    { title: 'Đơn vị', dataIndex: 'unit', key: 'unit' },
                    { title: 'Cách dùng', dataIndex: 'usage_method', key: 'usage_method' },
                  ]}
                  pagination={false}
                  size="small"
                />
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default MedicalHistoryOverview;
