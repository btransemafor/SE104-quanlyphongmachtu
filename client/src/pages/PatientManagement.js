import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Input,
  Space,
  Modal,
  Form,
  Select,
  DatePicker,
  message,
  Popconfirm,
  Tag,
  Row,
  Col,
  Statistic
} from 'antd';
import { UserOutlined } from '@ant-design/icons';
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  EyeOutlined,
  UserAddOutlined
} from '@ant-design/icons';
import { patientsAPI, appointmentsAPI } from '../services/api';
import moment from 'moment';

const { Search } = Input;
const { Option } = Select;

const PatientManagement = () => {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  });
  const [searchText, setSearchText] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingPatient, setEditingPatient] = useState(null);
  const [form] = Form.useForm();
  const [todayStats, setTodayStats] = useState({
    total_appointments: 0,
    waiting_count: 0,
    examined_count: 0,
    completed_count: 0
  });

  useEffect(() => {
    fetchPatients();
    fetchTodayStats();
  }, [pagination.current, pagination.pageSize, searchText]);

  const fetchPatients = async () => {
    try {
      setLoading(true);
      const response = await patientsAPI.getPatients({
        page: pagination.current,
        limit: pagination.pageSize,
        search: searchText
      });
      
      if (response.data.success) {
        setPatients(response.data.data);
        setPagination(prev => ({
          ...prev,
          total: response.data.pagination.totalItems
        }));
      }
    } catch (error) {
      console.error('Error fetching patients:', error);
      message.error('Không thể tải danh sách bệnh nhân');
    } finally {
      setLoading(false);
    }
  };

  const fetchTodayStats = async () => {
    try {
      const response = await appointmentsAPI.getDailyAppointments({
        date: moment().format('YYYY-MM-DD')
      });
      
      if (response.data.success) {
        const appointments = response.data.data;
        const stats = {
          total_appointments: appointments.length,
          waiting_count: appointments.filter(apt => apt.status === 'waiting').length,
          examined_count: appointments.filter(apt => apt.status === 'examined').length,
          completed_count: appointments.filter(apt => apt.status === 'completed').length
        };
        setTodayStats(stats);
      }
    } catch (error) {
      console.error('Error fetching today stats:', error);
    }
  };

  const handleSearch = (value) => {
    setSearchText(value);
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const handleAddPatient = () => {
    setEditingPatient(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEditPatient = (patient) => {
    setEditingPatient(patient);
    form.setFieldsValue({
      ...patient,
      birth_year: patient.birth_year ? moment().year(patient.birth_year) : null
    });
    setModalVisible(true);
  };

  const handleAddToAppointment = async (patient) => {
    try {
      const response = await appointmentsAPI.addAppointment({
        patient_id: patient.id,
        appointment_date: moment().format('YYYY-MM-DD')
      });
      
      if (response.data.success) {
        message.success('Đã thêm bệnh nhân vào danh sách khám hôm nay');
        fetchTodayStats();
      } else {
        message.error(response.data.message);
      }
    } catch (error) {
      console.error('Error adding to appointment:', error);
      message.error(error.response?.data?.message || 'Không thể thêm vào danh sách khám');
    }
  };

  const handleSubmit = async (values) => {
    try {
      const patientData = {
        ...values,
        birth_year: values.birth_year ? values.birth_year.year() : null
      };

      let response;
      if (editingPatient) {
        response = await patientsAPI.updatePatient(editingPatient.id, patientData);
      } else {
        response = await patientsAPI.createPatient(patientData);
      }

      if (response.data.success) {
        message.success(editingPatient ? 'Cập nhật bệnh nhân thành công!' : 'Thêm bệnh nhân thành công!');
        setModalVisible(false);
        form.resetFields();
        fetchPatients();
      } else {
        message.error(response.data.message);
      }
    } catch (error) {
      console.error('Error saving patient:', error);
      message.error(error.response?.data?.message || 'Có lỗi xảy ra khi lưu bệnh nhân');
    }
  };

  const columns = [
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
      width: 100,
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
      width: 100,
      render: (year) => year || '-',
    },
    {
      title: 'Số điện thoại',
      dataIndex: 'phone_number',
      key: 'phone_number',
      width: 150,
    },
    {
      title: 'Địa chỉ',
      dataIndex: 'address',
      key: 'address',
      ellipsis: true,
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 120,
      render: (date) => moment(date).format('DD/MM/YYYY'),
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 200,
      render: (_, record) => (
        <Space>
          <Button
            type="primary"
            size="small"
            icon={<UserAddOutlined />}
            onClick={() => handleAddToAppointment(record)}
          >
            Thêm khám
          </Button>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEditPatient(record)}
          >
            Sửa
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <h1 style={{ marginBottom: 24 }}>Quản lý bệnh nhân</h1>
      
      { }
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Tổng khám hôm nay"
              value={todayStats.total_appointments}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Chờ khám"
              value={todayStats.waiting_count}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Đã khám"
              value={todayStats.examined_count}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Hoàn thành"
              value={todayStats.completed_count}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
      </Row>

      <Card>
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Search
            placeholder="Tìm kiếm theo tên hoặc số điện thoại"
            allowClear
            onSearch={handleSearch}
            style={{ width: 300 }}
            prefix={<SearchOutlined />}
          />
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAddPatient}
          >
            Thêm bệnh nhân mới
          </Button>
        </div>

        <Table
          columns={columns}
          dataSource={patients}
          loading={loading}
          rowKey="id"
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} của ${total} bệnh nhân`,
            onChange: (page, pageSize) => {
              setPagination(prev => ({
                ...prev,
                current: page,
                pageSize: pageSize || prev.pageSize
              }));
            }
          }}
        />
      </Card>

      <Modal
        title={editingPatient ? 'Sửa thông tin bệnh nhân' : 'Thêm bệnh nhân mới'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          autoComplete="off"
         data-testid="form">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="full_name"
                label="Họ tên"
                rules={[
                  { required: true, message: 'Vui lòng nhập họ tên!' }
                ]}
               data-testid="form">
                <Input placeholder="Nhập họ tên" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="gender"
                label="Giới tính"
                rules={[
                  { required: true, message: 'Vui lòng chọn giới tính!' }
                ]}
               data-testid="form">
                <Select placeholder="Chọn giới tính">
                  <Option value="Nam">Nam</Option>
                  <Option value="Nữ">Nữ</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="birth_year"
                label="Năm sinh"
                rules={[
                  { required: true, message: 'Vui lòng chọn năm sinh!' }
                ]}
               data-testid="form">
                <DatePicker
                  picker="year"
                  placeholder="Chọn năm sinh"
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="phone_number"
                label="Số điện thoại"
                rules={[
                  { required: true, message: 'Vui lòng nhập số điện thoại!' },
                  { pattern: /^[0-9]{10,11}$/, message: 'Số điện thoại không hợp lệ!' }
                ]}
               data-testid="form">
                <Input placeholder="Nhập số điện thoại" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="address"
            label="Địa chỉ"
           data-testid="form">
            <Input.TextArea placeholder="Nhập địa chỉ" rows={3} />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }} data-testid="form">
            <Space>
              <Button onClick={() => {
                setModalVisible(false);
                form.resetFields();
              }}>
                Hủy
              </Button>
              <Button type="primary" htmlType="submit">
                {editingPatient ? 'Cập nhật' : 'Thêm mới'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default PatientManagement;
