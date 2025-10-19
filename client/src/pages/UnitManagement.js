import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Input, Space, Modal, Form, message, Popconfirm } from 'antd';
import { PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { unitsAPI } from '../services/api';

const UnitManagement = () => {
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingUnit, setEditingUnit] = useState(null);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchUnits();
  }, []);

  const fetchUnits = async () => {
    try {
      setLoading(true);
      const response = await unitsAPI.getUnits();
      if (response.data.success) {
        setUnits(response.data.data);
      }
    } catch (error) {
      message.error('Không thể tải danh sách đơn vị');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (values) => {
    try {
      let response;
      if (editingUnit) {
        response = await unitsAPI.updateUnit(editingUnit.id, values);
      } else {
        response = await unitsAPI.createUnit(values);
      }
      if (response.data.success) {
        message.success(editingUnit ? 'Cập nhật thành công!' : 'Thêm mới thành công!');
        setModalVisible(false);
        form.resetFields();
        fetchUnits();
      }
    } catch (error) {
      message.error('Không thể lưu dữ liệu');
    }
  };

  const handleDelete = async (id) => {
    try {
      const response = await unitsAPI.deleteUnit(id);
      if (response.data.success) {
        message.success('Xóa thành công!');
        fetchUnits();
      }
    } catch (error) {
      message.error('Không thể xóa');
    }
  };

  const columns = [
    { title: 'Tên đơn vị', dataIndex: 'name', key: 'name' },
    {
      title: 'Thao tác',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => {
            setEditingUnit(record);
            form.setFieldsValue(record);
            setModalVisible(true);
          }}>Sửa</Button>
          <Popconfirm title="Xóa đơn vị này?" onConfirm={() => handleDelete(record.id)}>
            <Button danger size="small" icon={<DeleteOutlined />}>Xóa</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <h1>Quản lý đơn vị tính</h1>
      <Card>
        <div style={{ marginBottom: 16, textAlign: 'right' }}>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => {
            setEditingUnit(null);
            form.resetFields();
            setModalVisible(true);
          }}>Thêm mới</Button>
        </div>
        <Table columns={columns} dataSource={units} loading={loading} rowKey="id" data-testid="table" />
      </Card>

      <Modal
        title={editingUnit ? 'Sửa đơn vị' : 'Thêm đơn vị mới'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit} data-testid="form">
          <Form.Item name="name" label="Tên đơn vị" rules={[{ required: true, message: 'Vui lòng nhập tên đơn vị!' }]} data-testid="form">
            <Input placeholder="Nhập tên đơn vị" />
          </Form.Item>
          <Form.Item style={{ textAlign: 'right' }} data-testid="form">
            <Space>
              <Button onClick={() => setModalVisible(false)}>Hủy</Button>
              <Button type="primary" htmlType="submit">{editingUnit ? 'Cập nhật' : 'Thêm mới'}</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default UnitManagement;
