import React, { useState, useEffect } from 'react';
import {
  Card,
  Button,
  message,
  Spin,
  Row,
  Col,
  Typography,
  Table,
  Space,
  Tag,
  Divider
} from 'antd';
import {
  PrinterOutlined,
  DollarOutlined,
  ArrowLeftOutlined
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import { invoicesAPI } from '../services/api';
import moment from 'moment';
import { useReactToPrint } from 'react-to-print';
import { useRef } from 'react';

const { Title, Text } = Typography;

const InvoiceDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(false);
  const [paying, setPaying] = useState(false);
  const printRef = useRef();

  useEffect(() => {
    fetchInvoice();
  }, [id]);

  const fetchInvoice = async () => {
    try {
      setLoading(true);
      const response = await invoicesAPI.getInvoice(id);
      
      if (response.data.success) {
        setInvoice(response.data.data);
      } else {
        message.error(response.data.message);
        navigate('/invoices');
      }
    } catch (error) {
      console.error('Error fetching invoice:', error);
      message.error('Không thể tải thông tin hóa đơn');
      navigate('/invoices');
    } finally {
      setLoading(false);
    }
  };

  const handlePay = async () => {
    try {
      setPaying(true);
      const response = await invoicesAPI.payInvoice(id);
      
      if (response.data.success) {
        message.success('Xác nhận thanh toán thành công!');
        fetchInvoice();
      } else {
        message.error(response.data.message);
      }
    } catch (error) {
      console.error('Error paying invoice:', error);
      message.error('Không thể xác nhận thanh toán');
    } finally {
      setPaying(false);
    }
  };

  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: `Hoa_don_${invoice?.id}_${moment().format('YYYY-MM-DD')}`,
  });

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!invoice) {
    return <div>Không tìm thấy hóa đơn</div>;
  }

  const prescriptionColumns = [
    {
      title: 'Tên thuốc',
      dataIndex: 'medicine_name',
      key: 'medicine_name',
    },
    {
      title: 'Đơn vị',
      dataIndex: 'unit',
      key: 'unit',
      width: 80,
    },
    {
      title: 'Đơn giá',
      dataIndex: 'price',
      key: 'price',
      width: 120,
      render: (price) => formatCurrency(price),
    },
    {
      title: 'Số lượng',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 80,
    },
    {
      title: 'Cách dùng',
      dataIndex: 'usage_method_name',
      key: 'usage_method_name',
    },
    {
      title: 'Thành tiền',
      key: 'total',
      width: 120,
      render: (_, record) => formatCurrency(record.price * record.quantity),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/invoices')}
        >
          Quay lại
        </Button>
      </div>

      <div ref={printRef} className="invoice-details">
        <div className="invoice-header">
          <Title level={2} className="invoice-title">
            PHÒNG MẠCH TƯ
          </Title>
          <Text className="invoice-subtitle">
            Hóa đơn khám bệnh và thuốc
          </Text>
        </div>

        <Row gutter={[24, 16]}>
          <Col span={12}>
            <div className="invoice-section">
              <Title level={4} className="invoice-section-title">
                Thông tin bệnh nhân
              </Title>
              <div>
                <p><strong>Họ tên:</strong> {invoice.patient_name}</p>
                <p><strong>Số điện thoại:</strong> {invoice.phone_number}</p>
                <p><strong>Địa chỉ:</strong> {invoice.address || 'Chưa cập nhật'}</p>
              </div>
            </div>
          </Col>
          <Col span={12}>
            <div className="invoice-section">
              <Title level={4} className="invoice-section-title">
                Thông tin hóa đơn
              </Title>
              <div>
                <p><strong>Số hóa đơn:</strong> #{invoice.id}</p>
                <p><strong>Ngày tạo:</strong> {moment(invoice.created_at).format('DD/MM/YYYY HH:mm')}</p>
                <p><strong>Trạng thái:</strong> 
                  <Tag color={invoice.payment_status === 'paid' ? 'green' : 'orange'} style={{ marginLeft: 8 }}>
                    {invoice.payment_status === 'paid' ? 'Đã thanh toán' : 'Chờ thanh toán'}
                  </Tag>
                </p>
              </div>
            </div>
          </Col>
        </Row>

        <div className="invoice-section">
          <Title level={4} className="invoice-section-title">
            Thông tin khám bệnh
          </Title>
          <div>
            <p><strong>Triệu chứng:</strong> {invoice.symptoms}</p>
            <p><strong>Chẩn đoán:</strong> {invoice.disease_name || 'Chưa chẩn đoán'}</p>
            <p><strong>Bác sĩ:</strong> {invoice.doctor_name || 'Chưa xác định'}</p>
          </div>
        </div>

        <div className="invoice-section">
          <Title level={4} className="invoice-section-title">
            Đơn thuốc
          </Title>
          <Table
            columns={prescriptionColumns}
            dataSource={invoice.prescriptions}
            pagination={false}
            size="small"
            className="invoice-table"
          data-testid="table" />
        </div>

        <div className="invoice-section">
          <Title level={4} className="invoice-section-title">
            Tổng kết thanh toán
          </Title>
          <table className="invoice-table" style={{ width: '100%' }}>
            <tbody>
              <tr>
                <td style={{ textAlign: 'right', padding: '8px 16px' }}>
                  <strong>Tiền khám:</strong>
                </td>
                <td style={{ textAlign: 'right', padding: '8px 16px', width: '150px' }}>
                  {formatCurrency(invoice.consultation_fee)}
                </td>
              </tr>
              <tr>
                <td style={{ textAlign: 'right', padding: '8px 16px' }}>
                  <strong>Tiền thuốc:</strong>
                </td>
                <td style={{ textAlign: 'right', padding: '8px 16px' }}>
                  {formatCurrency(invoice.medicine_fee)}
                </td>
              </tr>
              <tr className="invoice-total">
                <td style={{ textAlign: 'right', padding: '12px 16px' }}>
                  <strong>TỔNG CỘNG:</strong>
                </td>
                <td style={{ textAlign: 'right', padding: '12px 16px' }}>
                  <strong>{formatCurrency(invoice.total_amount)}</strong>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <Divider />

        <div style={{ textAlign: 'center', marginTop: 32 }}>
          <p>Cảm ơn quý khách đã sử dụng dịch vụ!</p>
          <p>Chúc quý khách sức khỏe tốt!</p>
        </div>
      </div>

      <div className="no-print" style={{ marginTop: 24, textAlign: 'center' }}>
        <Space>
          <Button
            icon={<PrinterOutlined />}
            onClick={handlePrint}
          >
            In hóa đơn
          </Button>
          {invoice.payment_status === 'pending' && (
            <Button
              type="primary"
              icon={<DollarOutlined />}
              loading={paying}
              onClick={handlePay}
            >
              Xác nhận thanh toán
            </Button>
          )}
        </Space>
      </div>
    </div>
  );
};

export default InvoiceDetails;
