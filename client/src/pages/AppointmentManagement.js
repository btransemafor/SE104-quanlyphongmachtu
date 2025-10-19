import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  DatePicker,
  Space,
  Tag,
  message,
  Modal,
  Form,
  Select,
  Input,
  Popconfirm,
  Row,
  Col,
  Statistic,
  Tooltip
} from 'antd';
import {
  SearchOutlined,
  PlusOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  UserAddOutlined,
  UserOutlined,
  FileTextOutlined,
  DollarOutlined
} from '@ant-design/icons';
import { appointmentsAPI, patientsAPI, invoicesAPI } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import moment from 'moment';

const { Search } = Input;
const { Option } = Select;

const AppointmentManagement = () => {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(moment());
  const [searchText, setSearchText] = useState('');
  const [addPatientModalVisible, setAddPatientModalVisible] = useState(false);
  const [patients, setPatients] = useState([]);
  const [patientSearchLoading, setPatientSearchLoading] = useState(false);
  const [form] = Form.useForm();
  const navigate = useNavigate();

  useEffect(() => {
    fetchAppointments();
  }, [selectedDate]);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const response = await appointmentsAPI.getDailyAppointments({
        date: selectedDate.format('YYYY-MM-DD')
      });
      
      if (response.data.success) {
        setAppointments(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching appointments:', error);
      message.error('Không thể tải danh sách khám bệnh');
    } finally {
      setLoading(false);
    }
  };

  const handleAddPatient = () => {
    setAddPatientModalVisible(true);
    form.resetFields();
  };

  const handleSearchPatients = async (value) => {
    if (!value || value.length < 2) {
      setPatients([]);
      return;
    }

    try {
      setPatientSearchLoading(true);
      const response = await patientsAPI.getPatients({
        search: value,
        limit: 10
      });
      
      if (response.data.success) {
        setPatients(response.data.data);
      }
    } catch (error) {
      console.error('Error searching patients:', error);
    } finally {
      setPatientSearchLoading(false);
    }
  };

  const handleAddToAppointment = async (values) => {
    try {
      const response = await appointmentsAPI.addAppointment({
        patient_id: values.patient_id,
        appointment_date: selectedDate.format('YYYY-MM-DD')
      });
      
      if (response.data.success) {
        message.success('Đã thêm bệnh nhân vào danh sách khám');
        setAddPatientModalVisible(false);
        form.resetFields();
        setPatients([]);
        fetchAppointments();
      } else {
        message.error(response.data.message);
      }
    } catch (error) {
      console.error('Error adding to appointment:', error);
      message.error(error.response?.data?.message || 'Không thể thêm vào danh sách khám');
    }
  };

  const handleUpdateStatus = async (appointmentId, newStatus) => {
    try {
      const response = await appointmentsAPI.updateAppointmentStatus(appointmentId, newStatus);
      
      if (response.data.success) {
        message.success('Cập nhật trạng thái thành công');
        fetchAppointments();
      } else {
        message.error(response.data.message);
      }
    } catch (error) {
      console.error('Error updating status:', error);
      message.error('Không thể cập nhật trạng thái');
    }
  };

  const handleRemoveAppointment = async (appointmentId) => {
    try {
      const response = await appointmentsAPI.removeAppointment(appointmentId);
      
      if (response.data.success) {
        message.success('Đã xóa khỏi danh sách khám');
        fetchAppointments();
      } else {
        message.error(response.data.message);
      }
    } catch (error) {
      console.error('Error removing appointment:', error);
      message.error('Không thể xóa khỏi danh sách khám');
    }
  };

  const handleCreateInvoice = async (appointment) => {
    
    if (user?.role !== 'receptionist' && user?.role !== 'admin') {
      message.error('Chỉ lễ tân mới có thể tạo hóa đơn');
      return;
    }

    try {
      if (!appointment.medical_record_id) {
        message.error('Bệnh nhân chưa có phiếu khám bệnh');
        return;
      }

      const response = await invoicesAPI.createInvoice({
        patient_id: appointment.patient_id,
        medical_record_id: appointment.medical_record_id,
        daily_appointment_id: appointment.id
      });
      
      if (response.data.success) {
        message.success('Đã tạo hóa đơn thành công');
        navigate(`/invoices/${response.data.data.id}`);
      } else {
        message.error(response.data.message);
      }
    } catch (error) {
      console.error('Error creating invoice:', error);
      message.error('Không thể tạo hóa đơn');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'waiting':
        return 'orange';
      case 'examined':
        return 'blue';
      case 'completed':
        return 'green';
      default:
        return 'default';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'waiting':
        return 'Chờ khám';
      case 'examined':
        return 'Đã khám';
      case 'completed':
        return 'Hoàn thành';
      default:
        return status;
    }
  };

  const columns = [
    {
      title: 'STT',
      key: 'index',
      width: 60,
      render: (_, __, index) => index + 1,
    },
    {
      title: 'Họ tên',
      dataIndex: 'full_name',
      key: 'full_name',
      sorter: (a, b) => a.full_name.localeCompare(b.full_name),
    },
    {
      title: 'Giới tính',
      dataIndex: 'gender',
      key: 'gender',
      width: 80,
      render: (gender) => (
        <Tag color={gender === 'Nam' ? 'blue' : 'pink'}>
          {gender}
        </Tag>
      ),
    },
    {
      title: 'Năm sinh',
      dataIndex: 'birth_year',
      key: 'birth_year',
      width: 80,
      render: (year) => year || '-',
    },
    {
      title: 'Số điện thoại',
      dataIndex: 'phone_number',
      key: 'phone_number',
      width: 120,
    },
    {
      title: 'Triệu chứng',
      dataIndex: 'symptoms',
      key: 'symptoms',
      ellipsis: true,
      render: (symptoms) => symptoms ? (
        <Tooltip title={symptoms}>
          {symptoms}
        </Tooltip>
      ) : '-',
    },
    {
      title: 'Chẩn đoán',
      dataIndex: 'disease_name',
      key: 'disease_name',
      ellipsis: true,
      render: (disease) => disease || '-',
    },
    {
      title: 'Bác sĩ',
      dataIndex: 'doctor_name',
      key: 'doctor_name',
      width: 120,
      render: (doctor) => doctor || '-',
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status) => (
        <Tag color={getStatusColor(status)}>
          {getStatusText(status)}
        </Tag>
      ),
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 200,
      render: (_, record) => (
        <Space>
          {record.status === 'waiting' && (
            <Button
              type="primary"
              size="small"
              icon={<FileTextOutlined />}
              onClick={() => navigate(`/medical-record/${record.id}`)}
            >
              Khám bệnh
            </Button>
          )}
          {record.status === 'examined' && (user?.role === 'receptionist' || user?.role === 'admin') && (
            <Button
              type="primary"
              size="small"
              icon={<DollarOutlined />}
              onClick={() => handleCreateInvoice(record)}
            >
              Lập hóa đơn
            </Button>
          )}
          {record.status === 'examined' && user?.role === 'doctor' && (
            <Tooltip title="Bệnh nhân đã khám xong. Lễ tân sẽ tạo hóa đơn thanh toán.">
              <Tag color="blue">Đã khám - Chờ lễ tân</Tag>
            </Tooltip>
          )}
          {record.status === 'waiting' && (
            <Popconfirm
              title="Bạn có chắc muốn xóa khỏi danh sách khám?"
              onConfirm={() => handleRemoveAppointment(record.id)}
              okText="Xóa"
              cancelText="Hủy"
            >
              <Button
                danger
                size="small"
                icon={<DeleteOutlined />}
              >
                Xóa
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  const filteredAppointments = appointments.filter(appointment =>
    appointment.full_name.toLowerCase().includes(searchText.toLowerCase()) ||
    appointment.phone_number.includes(searchText)
  );

  const stats = {
    total: appointments.length,
    waiting: appointments.filter(a => a.status === 'waiting').length,
    examined: appointments.filter(a => a.status === 'examined').length,
    completed: appointments.filter(a => a.status === 'completed').length,
  };

  return (
    <div>
      <h1 style={{ marginBottom: 24 }}>Danh sách khám bệnh trong ngày</h1>
      
      { }
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Tổng số"
              value={stats.total}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#1890ff' }}
              data-testid="total-appointments"
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Chờ khám"
              value={stats.waiting}
              valueStyle={{ color: '#faad14' }}
              data-testid="waiting-appointments"
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Đã khám"
              value={stats.examined}
              valueStyle={{ color: '#52c41a' }}
              data-testid="examined-appointments"
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Hoàn thành"
              value={stats.completed}
              valueStyle={{ color: '#722ed1' }}
              data-testid="completed-appointments"
            />
          </Card>
        </Col>
      </Row>

      <Card>
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
            <DatePicker
              value={selectedDate}
              onChange={(date) => setSelectedDate(date)}
              format="DD/MM/YYYY"
              placeholder="Chọn ngày"
            />
            <Search
              placeholder="Tìm kiếm theo tên hoặc số điện thoại"
              allowClear
              onSearch={setSearchText}
              style={{ width: 300 }}
              prefix={<SearchOutlined />}
              data-testid="search-input"
            />
          </div>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAddPatient}
            data-testid="add-patient-button"
          >
            Thêm bệnh nhân
          </Button>
        </div>

        <Table
          columns={columns}
          dataSource={filteredAppointments}
          loading={loading}
          rowKey="id"
          data-testid="appointment-list"
          pagination={false}
          scroll={{ x: 1200 }}
        />
      </Card>

      { }
      <Modal
        title="Thêm bệnh nhân vào danh sách khám"
        open={addPatientModalVisible}
        onCancel={() => {
          setAddPatientModalVisible(false);
          form.resetFields();
          setPatients([]);
        }}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleAddToAppointment}
          autoComplete="off"
         data-testid="form">
          <Form.Item
            name="patient_id"
            label="Chọn bệnh nhân"
            rules={[
              { required: true, message: 'Vui lòng chọn bệnh nhân!' }
            ]}
           data-testid="form">
            <Select
              showSearch
              placeholder="Tìm kiếm bệnh nhân theo tên hoặc số điện thoại"
              onSearch={handleSearchPatients}
              loading={patientSearchLoading}
              filterOption={false}
              notFoundContent={patientSearchLoading ? 'Đang tìm kiếm...' : 'Không tìm thấy bệnh nhân'}
            >
              {patients.map(patient => (
                <Option key={patient.id} value={patient.id}>
                  {patient.full_name} - {patient.phone_number}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }} data-testid="form">
            <Space>
              <Button onClick={() => {
                setAddPatientModalVisible(false);
                form.resetFields();
                setPatients([]);
              }}>
                Hủy
              </Button>
              <Button type="primary" htmlType="submit">
                Thêm vào danh sách
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default AppointmentManagement;
