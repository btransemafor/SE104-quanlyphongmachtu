import React, { useState, useEffect } from 'react';
import { Card, Form, InputNumber, Button, message, Row, Col, Typography } from 'antd';
import { SaveOutlined } from '@ant-design/icons';
import { settingsAPI } from '../services/api';

const { Title } = Typography;

const Settings = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState({});

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await settingsAPI.getSettings();
      if (response.data.success) {
        const settingsData = response.data.data;
        setSettings(settingsData);
        form.setFieldsValue({
          max_patients_per_day: parseInt(settingsData.max_patients_per_day?.value || 50),
          consultation_fee: parseFloat(settingsData.consultation_fee?.value || 100000)
        });
      }
    } catch (error) {
      message.error('Không thể tải cài đặt hệ thống');
    }
  };

  const handleSubmit = async (values) => {
    try {
      setLoading(true);
      const response = await settingsAPI.updateSettings(values);
      if (response.data.success) {
        message.success('Cập nhật cài đặt thành công!');
        fetchSettings();
      }
    } catch (error) {
      message.error('Không thể cập nhật cài đặt');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Title level={2}>Cài đặt hệ thống</Title>
      
      <Card>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          autoComplete="off"
         data-testid="form">
          <Row gutter={[24, 16]}>
            <Col span={12}>
              <Form.Item
                name="max_patients_per_day"
                label="Số lượng bệnh nhân tối đa trong ngày"
                rules={[
                  { required: true, message: 'Vui lòng nhập số lượng bệnh nhân tối đa!' },
                  { type: 'number', min: 1, max: 1000, message: 'Số lượng phải từ 1 đến 1000!' }
                ]}
               data-testid="form">
                <InputNumber
                  placeholder="Nhập số lượng bệnh nhân tối đa"
                  style={{ width: '100%' }}
                  min={1}
                  max={1000}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="consultation_fee"
                label="Phí khám bệnh mặc định (VND)"
                rules={[
                  { required: true, message: 'Vui lòng nhập phí khám bệnh!' },
                  { type: 'number', min: 0, message: 'Phí khám bệnh phải lớn hơn 0!' }
                ]}
               data-testid="form">
                <InputNumber
                  placeholder="Nhập phí khám bệnh"
                  style={{ width: '100%' }}
                  min={0}
                  formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={value => value.replace(/\$\s?|(,*)/g, '')}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item style={{ marginTop: 24, textAlign: 'right' }} data-testid="form">
            <Button
              type="primary"
              htmlType="submit"
              icon={<SaveOutlined />}
              loading={loading}
            >
              Lưu cài đặt
            </Button>
          </Form.Item>
        </Form>
      </Card>

      <Card style={{ marginTop: 24 }}>
        <Title level={4}>Thông tin hệ thống</Title>
        <Row gutter={[16, 8]}>
          <Col span={12}>
            <p><strong>Phiên bản:</strong> 1.0.0</p>
            <p><strong>Ngày phát hành:</strong> {new Date().toLocaleDateString('vi-VN')}</p>
          </Col>
          <Col span={12}>
            <p><strong>Hỗ trợ:</strong> admin@clinic.com</p>
            <p><strong>Hotline:</strong> 1900-xxxx</p>
          </Col>
        </Row>
      </Card>
    </div>
  );
};

export default Settings;
