import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Input, Space, Modal, Form, Select, message, Popconfirm } from 'antd';
import { PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined, KeyOutlined } from '@ant-design/icons';
import { usersAPI } from '../services/api';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form] = Form.useForm();
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    fetchUsers();
  }, [searchText]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await usersAPI.getUsers({ search: searchText });
      if (response.data.success) {
        setUsers(response.data.data);
      }
    } catch (error) {
      message.error('Không thể tải danh sách người dùng');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (values) => {
    try {
      let response;
      if (editingUser) {
        response = await usersAPI.updateUser(editingUser.id, values);
      } else {
        response = await usersAPI.createUser(values);
      }
      if (response.data.success) {
        message.success(editingUser ? 'Cập nhật thành công!' : 'Thêm mới thành công!');
        setModalVisible(false);
        form.resetFields();
        fetchUsers();
      }
    } catch (error) {
      message.error('Không thể lưu dữ liệu');
    }
  };

  const handleDelete = async (id) => {
    try {
      const response = await usersAPI.deleteUser(id);
      if (response.data.success) {
        message.success('Xóa thành công!');
        fetchUsers();
      }
    } catch (error) {
      message.error('Không thể xóa');
    }
  };

  const handleResetPassword = async (id) => {
    try {
      const response = await usersAPI.resetPassword(id, { new_password: 'password123' });
      if (response.data.success) {
        message.success('Đặt lại mật khẩu thành công! Mật khẩu mới: password123');
      }
    } catch (error) {
      message.error('Không thể đặt lại mật khẩu');
    }
  };

  const columns = [
    { title: 'Tên đăng nhập', dataIndex: 'username', key: 'username' },
    { 
      title: 'Vai trò', 
      dataIndex: 'role', 
      key: 'role',
      render: (role) => {
        const roleMap = {
          admin: 'Quản trị viên',
          receptionist: 'Lễ tân',
          doctor: 'Bác sĩ'
        };
        return roleMap[role] || role;
      }
    },
    { 
      title: 'Trạng thái', 
      dataIndex: 'is_active', 
      key: 'is_active',
      render: (isActive) => isActive ? 'Hoạt động' : 'Ngừng hoạt động'
    },
    {
      title: 'Thao tác',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => {
            setEditingUser(record);
            form.setFieldsValue(record);
            setModalVisible(true);
          }}>Sửa</Button>
          <Button size="small" icon={<KeyOutlined />} onClick={() => handleResetPassword(record.id)}>Đặt lại mật khẩu</Button>
          <Popconfirm title="Xóa người dùng này?" onConfirm={() => handleDelete(record.id)}>
            <Button danger size="small" icon={<DeleteOutlined />}>Xóa</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <h1>Quản lý người dùng</h1>
      <Card>
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
          <Input.Search
            placeholder="Tìm kiếm người dùng"
            onSearch={setSearchText}
            style={{ width: 300 }}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={() => {
            setEditingUser(null);
            form.resetFields();
            setModalVisible(true);
          }}>Thêm mới</Button>
        </div>
        <Table columns={columns} dataSource={users} loading={loading} rowKey="id" data-testid="table" />
      </Card>

      <Modal
        title={editingUser ? 'Sửa người dùng' : 'Thêm người dùng mới'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit} data-testid="form">
          <Form.Item name="username" label="Tên đăng nhập" rules={[{ required: true, message: 'Vui lòng nhập tên đăng nhập!' }]} data-testid="form">
            <Input placeholder="Nhập tên đăng nhập" />
          </Form.Item>
          {!editingUser && (
            <Form.Item name="password" label="Mật khẩu" rules={[{ required: true, message: 'Vui lòng nhập mật khẩu!' }]} data-testid="form">
              <Input.Password placeholder="Nhập mật khẩu" />
            </Form.Item>
          )}
          <Form.Item name="role" label="Vai trò" rules={[{ required: true, message: 'Vui lòng chọn vai trò!' }]} data-testid="form">
            <Select placeholder="Chọn vai trò">
              <Select.Option value="admin">Quản trị viên</Select.Option>
              <Select.Option value="receptionist">Lễ tân</Select.Option>
              <Select.Option value="doctor">Bác sĩ</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="is_active" label="Trạng thái" valuePropName="checked" data-testid="form">
            <Select placeholder="Chọn trạng thái">
              <Select.Option value={true}>Hoạt động</Select.Option>
              <Select.Option value={false}>Ngừng hoạt động</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item style={{ textAlign: 'right' }} data-testid="form">
            <Space>
              <Button onClick={() => setModalVisible(false)}>Hủy</Button>
              <Button type="primary" htmlType="submit">{editingUser ? 'Cập nhật' : 'Thêm mới'}</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default UserManagement;
