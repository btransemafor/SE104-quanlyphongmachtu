import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Input, Space, Modal, Form, message, Popconfirm } from 'antd';
import { PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { diseasesAPI } from '../services/api';

const DiseaseManagement = () => {
  const [diseases, setDiseases] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingDisease, setEditingDisease] = useState(null);
  const [form] = Form.useForm();
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    fetchDiseases();
  }, [searchText]);

  const fetchDiseases = async () => {
    try {
      setLoading(true);
      const response = await diseasesAPI.getDiseases({ search: searchText });
      if (response.data.success) {
        setDiseases(response.data.data);
      }
    } catch (error) {
      message.error('Không thể tải danh sách loại bệnh');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (values) => {
    try {
      let response;
      if (editingDisease) {
        response = await diseasesAPI.updateDisease(editingDisease.id, values);
      } else {
        response = await diseasesAPI.createDisease(values);
      }
      if (response.data.success) {
        message.success(editingDisease ? 'Cập nhật thành công!' : 'Thêm mới thành công!');
        setModalVisible(false);
        form.resetFields();
        fetchDiseases();
      }
    } catch (error) {
      message.error('Không thể lưu dữ liệu');
    }
  };

  const handleDelete = async (id) => {
    try {
      const response = await diseasesAPI.deleteDisease(id);
      if (response.data.success) {
        message.success('Xóa thành công!');
        fetchDiseases();
      }
    } catch (error) {
      message.error('Không thể xóa');
    }
  };

  const columns = [
    { title: 'Tên bệnh', dataIndex: 'name', key: 'name' },
    { title: 'Mô tả', dataIndex: 'description', key: 'description', ellipsis: true },
    {
      title: 'Thao tác',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => {
            setEditingDisease(record);
            form.setFieldsValue(record);
            setModalVisible(true);
          }}>Sửa</Button>
          <Popconfirm title="Xóa loại bệnh này?" onConfirm={() => handleDelete(record.id)}>
            <Button danger size="small" icon={<DeleteOutlined />}>Xóa</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <h1>Quản lý loại bệnh</h1>
      <Card>
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
          <Input.Search
            placeholder="Tìm kiếm loại bệnh"
            onSearch={setSearchText}
            style={{ width: 300 }}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={() => {
            setEditingDisease(null);
            form.resetFields();
            setModalVisible(true);
          }}>Thêm mới</Button>
        </div>
        <Table columns={columns} dataSource={diseases} loading={loading} rowKey="id" data-testid="table" />
      </Card>

      <Modal
        title={editingDisease ? 'Sửa loại bệnh' : 'Thêm loại bệnh mới'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit} data-testid="form">
          <Form.Item name="name" label="Tên bệnh" rules={[{ required: true, message: 'Vui lòng nhập tên bệnh!' }]} data-testid="form">
            <Input placeholder="Nhập tên bệnh" />
          </Form.Item>
          <Form.Item name="description" label="Mô tả" data-testid="form">
            <Input.TextArea placeholder="Nhập mô tả" rows={3} />
          </Form.Item>
          <Form.Item style={{ textAlign: 'right' }} data-testid="form">
            <Space>
              <Button onClick={() => setModalVisible(false)}>Hủy</Button>
              <Button type="primary" htmlType="submit">{editingDisease ? 'Cập nhật' : 'Thêm mới'}</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default DiseaseManagement;
