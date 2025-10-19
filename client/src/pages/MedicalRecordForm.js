import React, { useState, useEffect } from "react";
import {
  Card,
  Form,
  Input,
  Select,
  Button,
  Space,
  message,
  Row,
  Col,
  Divider,
  Table,
  InputNumber,
  Modal,
  Typography,
} from "antd";
import {
  PlusOutlined,
  DeleteOutlined,
  SaveOutlined,
  HistoryOutlined,
} from "@ant-design/icons";
import { useParams, useNavigate } from "react-router-dom";
import {
  appointmentsAPI,
  diseasesAPI,
  medicinesAPI,
  unitsAPI,
  usageMethodsAPI,
  medicalRecordsAPI,
  patientsAPI,
} from "../services/api";
import moment from "moment";

const { TextArea } = Input;
const { Option } = Select;
const { Title } = Typography;

const MedicalRecordForm = () => {
  const { appointmentId } = useParams();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [appointment, setAppointment] = useState(null);
  const [diseases, setDiseases] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [units, setUnits] = useState([]);
  const [usageMethods, setUsageMethods] = useState([]);
  const [medicalHistory, setMedicalHistory] = useState([]);
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [prescriptions, setPrescriptions] = useState([]);

  useEffect(() => {
    fetchAppointmentData();
    fetchMasterData();
  }, [appointmentId]);

  // 1. Create a helper function to calculate sell price
  const calculateSellPrice = (unitPrice) => {
    return (unitPrice || 0) * 1.3;
  };

 const calculateTotal = () => {
  let total = 0;

  if (!prescriptions || prescriptions.length === 0) {
    return total;
  }

  prescriptions.forEach((p) => {
    const medicine = getMedicineInfo(p.medicine_id);
    const sell_price = medicine
      ? calculateSellPrice(medicine.unit_price)
      : 0;

    total += sell_price * p.quantity; 
  });

  return total;
};


  const fetchAppointmentData = async () => {
    try {
      setLoading(true);
      const response = await appointmentsAPI.getDailyAppointments({
        date: moment().format("YYYY-MM-DD"),
      });

      if (response.data.success) {
        const appointmentData = response.data.data.find(
          (apt) => apt.id === parseInt(appointmentId)
        );
        if (appointmentData) {
          setAppointment(appointmentData);
          if (appointmentData.status !== "waiting") {
            message.warning("Bệnh nhân này đã được khám hoặc hoàn thành");
            navigate("/appointments");
          }
        } else {
          message.error("Không tìm thấy cuộc hẹn");
          navigate("/appointments");
        }
      }
    } catch (error) {
      console.error("Error fetching appointment:", error);
      message.error("Không thể tải thông tin cuộc hẹn");
      navigate("/appointments");
    } finally {
      setLoading(false);
    }
  };

  const fetchMasterData = async () => {
    try {
      const [diseasesRes, medicinesRes, unitsRes, usageMethodsRes] =
        await Promise.all([
          diseasesAPI.getDiseases({ active_only: true }),
          medicinesAPI.getAvailableMedicines(),
          unitsAPI.getUnits(),
          usageMethodsAPI.getUsageMethods({ active_only: true }),
        ]);

      if (diseasesRes.data.success) setDiseases(diseasesRes.data.data);
      if (medicinesRes.data.success) setMedicines(medicinesRes.data.data);
      if (unitsRes.data.success) setUnits(unitsRes.data.data);
      if (usageMethodsRes.data.success)
        setUsageMethods(usageMethodsRes.data.data);
    } catch (error) {
      console.error("Error fetching master data:", error);
      message.error("Không thể tải dữ liệu gốc");
    }
  };

  const fetchMedicalHistory = async () => {
    if (!appointment?.patient_id) return;

    try {
      const response = await patientsAPI.getMedicalHistory(
        appointment.patient_id
      );
      if (response.data.success) {
        setMedicalHistory(response.data.data);
        setHistoryModalVisible(true);
      }
    } catch (error) {
      console.error("Error fetching medical history:", error);
      message.error("Không thể tải lịch sử khám bệnh");
    }
  };

  const addPrescription = () => {
    const newPrescription = {
      id: Date.now(),
      medicine_id: null,
      quantity: 1,
      usage_method_id: null,
    };
    setPrescriptions([...prescriptions, newPrescription]);
  };

  const removePrescription = (id) => {
    setPrescriptions(prescriptions.filter((p) => p.id !== id));
  };

  const updatePrescription = (id, field, value) => {
    setPrescriptions(
      prescriptions.map((p) => (p.id === id ? { ...p, [field]: value } : p))
    );
  };

  const getMedicineInfo = (medicineId) => {
    return medicines.find((m) => m.id === medicineId);
  };

  const handleSubmit = async (values) => {
    try {
      setLoading(true);

      const prescriptionData = prescriptions.map((p) => {
        const medicine = getMedicineInfo(p.medicine_id);
        const sell_price = medicine
          ? calculateSellPrice(medicine.unit_price)
          : 0;

        return {
          medicine_id: p.medicine_id,
          quantity: p.quantity,
          usage_method_id: p.usage_method_id,
          sell_price: sell_price,
        };
      });

      const response = await medicalRecordsAPI.createMedicalRecord({
        patient_id: appointment.patient_id,
        symptoms: values.symptoms,
        disease_id: values.disease_id,
        diagnosis: values.diagnosis,
        total_amount: calculateTotal(), 
        prescriptions: prescriptionData,
      });

      if (response.data.success) {
        message.success(
          "Lưu phiếu khám bệnh thành công! Lễ tân sẽ tạo hóa đơn thanh toán cho bệnh nhân."
        );
        navigate("/appointments");
      } else {
        message.error(response.data.message);
      }
    } catch (error) {
      console.error("Error saving medical record:", error);
      message.error("Không thể lưu phiếu khám bệnh");
    } finally {
      setLoading(false);
    }
  };

  const prescriptionColumns = [
    {
      title: "Tên thuốc",
      dataIndex: "medicine_id",
      key: "medicine_id",
      render: (medicineId, record) => (
        <Select
          placeholder="Chọn thuốc"
          value={medicineId}
          onChange={(value) => {
            updatePrescription(record.id, "medicine_id", value);
          }}
          style={{ width: "100%" }}
          showSearch
          filterOption={(input, option) =>
            option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
          }
        >
          {medicines.map((medicine) => (
            <Option key={medicine.id} value={medicine.id}>
              {medicine.name} {/* - {medicine.unit} - {medicine.price} */}
            </Option>
          ))}
        </Select>
      ),
    },
    {
      title: "Số lượng",
      dataIndex: "quantity",
      key: "quantity",
      width: 100,
      render: (quantity, record) => (
        <InputNumber
          min={1}
          value={quantity}
          onChange={(value) => updatePrescription(record.id, "quantity", value)}
          style={{ width: "100%" }}
        />
      ),
    },
    {
      title: "Cách dùng",
      dataIndex: "usage_method_id",
      key: "usage_method_id",
      render: (usageMethodId, record) => (
        <Select
          placeholder="Chọn cách dùng"
          value={usageMethodId}
          onChange={(value) =>
            updatePrescription(record.id, "usage_method_id", value)
          }
          style={{ width: "100%" }}
        >
          {usageMethods.map((method) => (
            <Option key={method.id} value={method.id}>
              {method.name}
            </Option>
          ))}
        </Select>
      ),
    },

    {
      title: "Giá bán",
      dataIndex: "sell_price",
      render: (_, record) => {
        const medicine = getMedicineInfo(record.medicine_id);
        if (!medicine) return "—";
        const sell_price = (medicine.unit_price || 0) * 1.3;
        return `${sell_price.toLocaleString()}đ`;
      },
    },
    {
      title: "Thành tiền",
      key: "total",
      width: 120,
      render: (_, record) => {
        const medicine = getMedicineInfo(record.medicine_id);
        if (!medicine || !record.quantity) return "0đ";
        const sell_price = (medicine.unit_price || 0) * 1.3;
        const total = sell_price * record.quantity;

        return `${total.toLocaleString()}đ`;
      },
    },

    {
      title: "Thao tác",
      key: "actions",
      width: 80,
      render: (_, record) => (
        <Button
          type="text"
          danger
          icon={<DeleteOutlined />}
          onClick={() => removePrescription(record.id)}
        />
      ),
    },
  ];

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!appointment) {
    return <div>Không tìm thấy thông tin cuộc hẹn</div>;
  }

  return (
    <div>
      <Card>
        <div
          style={{
            marginBottom: 24,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Title level={3}>Lập Phiếu Khám Bệnh</Title>
          <Button icon={<HistoryOutlined />} onClick={fetchMedicalHistory}>
            Xem lịch sử khám
          </Button>
        </div>

        <div
          style={{
            marginBottom: 24,
            padding: 16,
            background: "#f5f5f5",
            borderRadius: 6,
          }}
        >
          <Row gutter={[16, 8]}>
            <Col span={6}>
              <strong>Bệnh nhân:</strong> {appointment.full_name}
            </Col>
            <Col span={6}>
              <strong>Giới tính:</strong> {appointment.gender}
            </Col>
            <Col span={6}>
              <strong>Năm sinh:</strong> {appointment.birth_year}
            </Col>
            <Col span={6}>
              <strong>SĐT:</strong> {appointment.phone_number}
            </Col>
          </Row>
        </div>

        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          autoComplete="off"
          data-testid="form"
        >
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item
                name="symptoms"
                label="Triệu chứng"
                rules={[
                  { required: true, message: "Vui lòng nhập triệu chứng!" },
                ]}
                data-testid="form"
              >
                <TextArea
                  rows={4}
                  placeholder="Mô tả chi tiết các triệu chứng của bệnh nhân"
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="disease_id"
                label="Dự đoán loại bệnh"
                data-testid="form"
              >
                <Select
                  placeholder="Chọn loại bệnh"
                  showSearch
                  filterOption={(input, option) =>
                    option.children
                      .toLowerCase()
                      .indexOf(input.toLowerCase()) >= 0
                  }
                >
                  {diseases.map((disease) => (
                    <Option key={disease.id} value={disease.id}>
                      {disease.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="diagnosis" label="Chẩn đoán" data-testid="form">
                <Input placeholder="Nhập chẩn đoán" />
              </Form.Item>
            </Col>
          </Row>

          <Divider>Kê đơn thuốc</Divider>

          <div style={{ marginBottom: 16 }}>
            <Button
              type="dashed"
              icon={<PlusOutlined />}
              onClick={addPrescription}
              block
            >
              Thêm thuốc
            </Button>
          </div>

          <Table
            columns={prescriptionColumns}
            dataSource={prescriptions}
            pagination={false}
            rowKey="id"
            size="small"
            data-testid="table"
          />

          {prescriptions.length > 0 && (
            <div style={{ marginTop: 16, textAlign: "right" }}>
              <strong>Tổng tiền thuốc: {calculateTotal().toLocaleString()}đ</strong>
            </div>
          )}

          <Form.Item
            style={{ marginTop: 24, textAlign: "right" }}
            data-testid="form"
          >
            <Space>
              <Button onClick={() => navigate("/appointments")}>Hủy</Button>
              <Button
                type="primary"
                htmlType="submit"
                icon={<SaveOutlined />}
                loading={loading}
              >
                Lưu phiếu khám
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>

      {}
      <Modal
        title="Lịch sử khám bệnh"
        open={historyModalVisible}
        onCancel={() => setHistoryModalVisible(false)}
        footer={null}
        width={800}
      >
        <Table
          data-testid="table"
          columns={[
            {
              title: "Ngày khám",
              dataIndex: "created_at",
              key: "created_at",
              render: (date) => moment(date).format("DD/MM/YYYY HH:mm"),
            },
            {
              title: "Triệu chứng",
              dataIndex: "symptoms",
              key: "symptoms",
              ellipsis: true,
            },
            {
              title: "Chẩn đoán",
              dataIndex: "disease_name",
              key: "disease_name",
            },
            {
              title: "Bác sĩ",
              dataIndex: "doctor_name",
              key: "doctor_name",
            },
          ]}
          dataSource={medicalHistory}
          pagination={false}
          rowKey="id"
          size="small"
        />
      </Modal>
    </div>
  );
};

export default MedicalRecordForm;
