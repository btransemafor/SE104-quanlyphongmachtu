import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Input, Space, Modal, Form, message, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { usageMethodsAPI } from '../services/api';

const UsageMethodManagement = () => {
  const [usageMethods, setUsageMethods] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingMethod, setEditingMethod] = useState(null);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchUsageMethods();
  }, []);

  const fetchUsageMethods = async () => {
    try {
      setLoading(true);
      const response = await usageMethodsAPI.getUsageMethods();
      if (response.data.success) {
        setUsageMethods(response.data.data);
      }
    } catch (error) {
      message.error('Không thể tải danh sách cách dùng');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (values) => {
    try {
      let response;
      if (editingMethod) {
        response = await usageMethodsAPI.updateUsageMethod(editingMethod.id, values);
      } else {
        response = await usageMethodsAPI.createUsageMethod(values);
      }
      if (response.data.success) {
        message.success(editingMethod ? 'Cập nhật thành công!' : 'Thêm mới thành công!');
        setModalVisible(false);
        form.resetFields();
        fetchUsageMethods();
      }
    } catch (error) {
      message.error('Không thể lưu dữ liệu');
    }
  };

  const handleDelete = async (id) => {
    try {
      const response = await usageMethodsAPI.deleteUsageMethod(id);
      if (response.data.success) {
        message.success('Xóa thành công!');
        fetchUsageMethods();
      }
    } catch (error) {
      message.error('Không thể xóa');
    }
  };

  const columns = [
    { title: 'Cách dùng', dataIndex: 'name', key: 'name' },
    {
      title: 'Thao tác',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => {
            setEditingMethod(record);
            form.setFieldsValue(record);
            setModalVisible(true);
          }}>Sửa</Button>
          <Popconfirm title="Xóa cách dùng này?" onConfirm={() => handleDelete(record.id)}>
            <Button danger size="small" icon={<DeleteOutlined />}>Xóa</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <h1>Quản lý cách dùng thuốc</h1>
      <Card>
        <div style={{ marginBottom: 16, textAlign: 'right' }}>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => {
            setEditingMethod(null);
            form.resetFields();
            setModalVisible(true);
          }}>Thêm mới</Button>
        </div>
        <Table columns={columns} dataSource={usageMethods} loading={loading} rowKey="id" data-testid="table" />
      </Card>

      <Modal
        title={editingMethod ? 'Sửa cách dùng' : 'Thêm cách dùng mới'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit} data-testid="form">
          <Form.Item name="name" label="Cách dùng" rules={[{ required: true, message: 'Vui lòng nhập cách dùng!' }]} data-testid="form">
            <Input placeholder="Nhập cách dùng thuốc" />
          </Form.Item>
          <Form.Item style={{ textAlign: 'right' }} data-testid="form">
            <Space>
              <Button onClick={() => setModalVisible(false)}>Hủy</Button>
              <Button type="primary" htmlType="submit">{editingMethod ? 'Cập nhật' : 'Thêm mới'}</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default UsageMethodManagement;
