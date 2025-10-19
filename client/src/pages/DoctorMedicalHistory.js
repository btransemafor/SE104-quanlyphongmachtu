import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Input, Select, Space, Tag, message, Modal, Descriptions, Row, Col, Statistic, Typography, DatePicker } from 'antd';
import { SearchOutlined, EyeOutlined, UserOutlined, CalendarOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { patientsAPI } from '../services/api';
import moment from 'moment';

const { Search } = Input;
const { Option } = Select;
const { Title } = Typography;
const { RangePicker } = DatePicker;

const DoctorMedicalHistory = () => {
  const [loading, setLoading] = useState(false);
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [medicalHistory, setMedicalHistory] = useState([]);
  const [filteredHistory, setFilteredHistory] = useState([]);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    dateRange: null,
    status: ''
  });
  const [stats, setStats] = useState({
    totalRecords: 0,
    completedRecords: 0,
    pendingRecords: 0,
  });

  useEffect(() => {
    fetchPatients();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [medicalHistory, filters]);

  const fetchPatients = async () => {
    try {
      const response = await patientsAPI.getPatients({ limit: 1000 });
      if (response.data.success) {
        setPatients(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching patients:', error);
      message.error('Không thể tải danh sách bệnh nhân');
    }
  };

  const fetchMedicalHistory = async (patientId) => {
    if (!patientId) return;
    
    try {
      setLoading(true);
      const response = await patientsAPI.getMedicalHistory(patientId);
      if (response.data.success) {
        setMedicalHistory(response.data.data);
        const patient = patients.find(p => p.id === parseInt(patientId));
        setSelectedPatient(patient);
      }
    } catch (error) {
      console.error('Error fetching medical history:', error);
      message.error('Không thể tải lịch sử khám bệnh');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...medicalHistory];

    
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(record =>
        record.symptoms?.toLowerCase().includes(searchLower) ||
        record.diagnosis?.toLowerCase().includes(searchLower) ||
        record.disease_name?.toLowerCase().includes(searchLower)
      );
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

    setFilteredHistory(filtered);
    calculateStats(filtered);
  };

  const calculateStats = (records) => {
    const total = records.length;
    const completed = records.filter(r => r.status === 'completed').length;
    const pending = records.filter(r => r.status === 'pending').length;
    setStats({
      totalRecords: total,
      completedRecords: completed,
      pendingRecords: pending,
    });
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters((prev) => ({
      ...prev,
      search: '',
      dateRange: null,
      status: '',
    }));
  };

  const handleViewDetail = (record) => {
    setSelectedRecord(record);
    setDetailModalVisible(true);
  };

  const handlePatientSelect = (patientId) => {
    if (patientId) {
      fetchMedicalHistory(patientId);
    } else {
      setSelectedPatient(null);
      setMedicalHistory([]);
      setFilteredHistory([]);
      setStats({ totalRecords: 0, completedRecords: 0, pendingRecords: 0 });
    }
  };

  const columns = [
    {
      title: 'Ngày khám',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (text) => moment(text).format('DD/MM/YYYY HH:mm'),
      sorter: (a, b) => moment(a.created_at).unix() - moment(b.created_at).unix(),
    },
    {
      title: 'Triệu chứng',
      dataIndex: 'symptoms',
      key: 'symptoms',
      ellipsis: true,
    },
    {
      title: 'Chẩn đoán',
      dataIndex: 'diagnosis',
      key: 'diagnosis',
      ellipsis: true,
      render: (text) => text || 'Chưa có chẩn đoán',
    },
    {
      title: 'Loại bệnh',
      dataIndex: 'disease_name',
      key: 'disease_name',
      render: (text) => text || '-',
    },
    {
      title: 'Đơn thuốc',
      dataIndex: 'prescriptions',
      key: 'prescriptions',
      render: (prescriptions) => {
        if (!prescriptions || prescriptions.length === 0) {
          return <span style={{ color: '#999' }}>Không có</span>;
        }
        return (
          <div>
            <Tag color="blue">{prescriptions.length} loại thuốc</Tag>
            <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
              {prescriptions.slice(0, 2).map((p, index) => (
                <div key={index}>
                  {p.medicine_name} ({p.quantity} {p.unit})
                </div>
              ))}
              {prescriptions.length > 2 && (
                <div>... và {prescriptions.length - 2} loại khác</div>
              )}
            </div>
          </div>
        );
      },
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
      render: (_, record) => (
        <Space size="middle">
          <Button icon={<EyeOutlined />} onClick={() => handleViewDetail(record)}>
            Xem chi tiết
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Title level={2}>Lịch sử khám bệnh</Title>
      <p style={{ color: '#666', marginBottom: 24 }}>
        Chọn bệnh nhân để xem lịch sử khám bệnh chi tiết
      </p>

      { }
      <Card style={{ marginBottom: 24 }}>
        <Title level={4}>Chọn bệnh nhân</Title>
        <Space wrap>
          <Select
            placeholder="Chọn bệnh nhân để xem lịch sử khám bệnh"
            value={selectedPatient?.id}
            onChange={handlePatientSelect}
            style={{ width: 300 }}
            showSearch
            allowClear
            filterOption={(input, option) =>
              option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
            }
          >
            {patients.map(patient => (
              <Option key={patient.id} value={patient.id}>
                {patient.full_name} ({patient.phone_number})
              </Option>
            ))}
          </Select>
          {selectedPatient && (
            <Button
              icon={<UserOutlined />}
              onClick={() => message.info(`Đang xem lịch sử của ${selectedPatient.full_name}`)}
            >
              {selectedPatient.full_name}
            </Button>
          )}
        </Space>
      </Card>

      { }
      {selectedPatient && (
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={6}>
            <Card>
              <Statistic
                title={`Hồ sơ của ${selectedPatient.full_name}`}
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
                title="Lần khám gần nhất"
                value={filteredHistory.length > 0 ? moment(filteredHistory[0].created_at).format('DD/MM/YYYY') : 'Chưa có'}
                prefix={<CalendarOutlined />}
                valueStyle={{ color: '#722ed1' }}
              />
            </Card>
          </Col>
        </Row>
      )}

      { }
      {selectedPatient && (
        <Card style={{ marginBottom: 16 }}>
          <Title level={5}>Bộ lọc lịch sử khám bệnh</Title>
          <Space wrap>
            <Search
              placeholder="Tìm kiếm theo triệu chứng, chẩn đoán..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              style={{ width: 300 }}
              allowClear
            />
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
      )}

      <Card>
        {!selectedPatient ? (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <UserOutlined style={{ fontSize: '48px', color: '#d9d9d9', marginBottom: '16px' }} />
            <Title level={4} style={{ color: '#999' }}>Chưa chọn bệnh nhân</Title>
            <p style={{ color: '#999' }}>Vui lòng chọn bệnh nhân từ danh sách ở trên để xem lịch sử khám bệnh</p>
          </div>
        ) : filteredHistory.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <CalendarOutlined style={{ fontSize: '48px', color: '#d9d9d9', marginBottom: '16px' }} />
            <Title level={4} style={{ color: '#999' }}>Không có lịch sử khám bệnh</Title>
            <p style={{ color: '#999' }}>Bệnh nhân {selectedPatient.full_name} chưa có lịch sử khám bệnh nào</p>
          </div>
        ) : (
          <Table
            columns={columns}
            dataSource={filteredHistory}
            rowKey="id"
            loading={loading}
            pagination={{
              total: filteredHistory.length,
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) =>
                `${range[0]}-${range[1]} của ${total} hồ sơ`,
            }}
            scroll={{ x: 1200 }}
          />
        )}
      </Card>

      <Modal
        title="Chi tiết hồ sơ bệnh án"
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={null}
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
                {selectedPatient?.full_name}
              </Descriptions.Item>
              <Descriptions.Item label="Bác sĩ" span={1}>
                {selectedRecord.doctor_name}
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

export default DoctorMedicalHistory;
