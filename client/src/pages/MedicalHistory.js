import React, { useState, useEffect } from 'react';
import { Card, Table, message, Spin, Typography, Button, Modal, Descriptions, Tag, Space } from 'antd';
import { ArrowLeftOutlined, EyeOutlined } from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import { patientsAPI } from '../services/api';
import moment from 'moment';

const { Title } = Typography;

const MedicalHistory = () => {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const [medicalHistory, setMedicalHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [patient, setPatient] = useState(null);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  useEffect(() => {
    fetchMedicalHistory();
  }, [patientId]);

  const fetchMedicalHistory = async () => {
    try {
      setLoading(true);
      const [historyRes, patientRes] = await Promise.all([
        patientsAPI.getMedicalHistory(patientId),
        patientsAPI.getPatient(patientId)
      ]);
      
      if (historyRes.data.success) {
        setMedicalHistory(historyRes.data.data);
      }
      if (patientRes.data.success) {
        setPatient(patientRes.data.data);
      }
    } catch (error) {
      console.error('Error fetching medical history:', error);
      message.error('Không thể tải lịch sử khám bệnh');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetail = (record) => {
    setSelectedRecord(record);
    setDetailModalVisible(true);
  };

  const columns = [
    {
      title: 'Ngày khám',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date) => moment(date).format('DD/MM/YYYY HH:mm'),
      sorter: (a, b) => new Date(a.created_at) - new Date(b.created_at),
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
      title: 'Bác sĩ',
      dataIndex: 'doctor_name',
      key: 'doctor_name',
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

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/appointments')}
        >
          Quay lại
        </Button>
      </div>

      <Card>
        <Title level={3}>
          Lịch sử khám bệnh - {patient?.full_name}
        </Title>
        
        <Table
          columns={columns}
          dataSource={medicalHistory}
          loading={loading}
          rowKey="id"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} của ${total} bản ghi`,
          }}
        />
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
                {patient?.full_name}
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

export default MedicalHistory;
