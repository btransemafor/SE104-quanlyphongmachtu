import React, { useState, useEffect, useCallback } from "react";
import {
  Popconfirm,
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
  InputNumber,
  Row,
  Col,
  Divider,
  Tooltip,
  Descriptions,
  Tag,
} from "antd";
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  PrinterOutlined,
  CheckCircleOutlined,
  FileTextOutlined,
} from "@ant-design/icons";
import moment from "moment";
import { importReceiptsAPI, medicinesAPI } from "../services/api";
import { formatNumber } from "../utils/utils";

const { Search } = Input;
const { Option } = Select;

const ReceiptMedicineManagement = () => {
  const [receipts, setReceipts] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [editingReceipt, setEditingReceipt] = useState(null);
  const [form] = Form.useForm();

  const [medicineList, setMedicineList] = useState([]);

  useEffect(() => {
    fetchMedicines();
    fetchReceipts();
  }, []);

  const fetchReceipts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await importReceiptsAPI.getImportReceipts();
      if (res.data.success) setReceipts(res.data.data);
    } catch (error) {
      console.error("Fetch receipts error:", error);
      message.error("Không thể tải danh sách phiếu nhập");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMedicines = useCallback(async () => {
    try {
      const res = await medicinesAPI.getMedicines();
      if (res.data.success) setMedicines(res.data.data);
    } catch (error) {
      console.error("Fetch medicines error:", error);
      message.error("Không thể tải danh sách thuốc");
    }
  }, []);

  const handleAddReceipt = useCallback(() => {
    setEditingReceipt(null);
    setMedicineList([]);
    form.resetFields();
    setModalVisible(true);
  }, [form]);

  const handleEditReceipt = useCallback(
    (receipt) => {
      setEditingReceipt(receipt);

      const medicineFields =
        receipt.medicines?.map((m) => {
          const medicine = medicines.find((x) => x.id === m.medicine_id);
          return {
            id: Date.now() + Math.random(),
            medicine_code: medicine?.code || medicine?.id,
            medicine_name: medicine?.name,
            unit: medicine?.unit_name,
            quantity: m.quantity,
            unit_price: m.unit_price,
            expiry_date: moment(m.expiry_date),
            batch_number: m.batch_number,
          };
        }) || [];

      setMedicineList(medicineFields);

      form.setFieldsValue({
        supplier_name: receipt.supplier_name,
        receipt_date: moment(receipt.receipt_date),
        staff_name: receipt.staff_name,
      });
      setModalVisible(true);
    },
    [medicines, form]
  );

  const handleDeleteReceipt = async (id) => {
    try {
      await importReceiptsAPI.deleteImportReceipt(id);
      message.success("Xóa phiếu nhập thành công");
      fetchReceipts();
    } catch (error) {
      message.error("Không thể xóa phiếu nhập");
    }
  };

  /* const handleViewDetail = useCallback(async (record) => {
  try {
    setSelectedReceipt(record);
    // Gọi API lấy chi tiết phiếu nhập
    const res = await importReceiptsAPI.getImportReceipt(record.id);
    if (res && res.data) {
      //setSelectedReceiptDetail(res.data); // lưu chi tiết để hiển thị trong modal
      setDetailModalVisible(true); // mở modal sau khi có data
    } else {
      message.warning("Không tìm thấy chi tiết phiếu nhập");
    }
  } catch (error) {
    console.error("Lỗi khi tải chi tiết phiếu nhập:", error);
    message.error("Không thể tải chi tiết phiếu nhập");
  }
}, []); */

  const handleViewDetail = useCallback(async (record) => {
    try {
      setSelectedReceipt(null); // clear cũ
      const res = await importReceiptsAPI.getImportReceipt(record.id);

      if (res?.data?.success && res.data.data) {
        // dữ liệu chi tiết phiếu nhập từ API
        console.log("DANH SACH THUOC : ", res.data.data);
        setSelectedReceipt(res.data.data);
        setDetailModalVisible(true);
      } else {
        message.warning("Không tìm thấy chi tiết phiếu nhập");
      }
    } catch (error) {
      console.error("Lỗi khi tải chi tiết phiếu nhập:", error);
      message.error("Không thể tải chi tiết phiếu nhập");
    }
  }, []);

  const handlePrintReceipt = useCallback(() => {
    window.print();
  }, []);

  const addMedicine = useCallback(() => {
    const newMedicine = {
      id: Date.now() + Math.random(),
      medicine_code: null,
      medicine_name: "",
      unit: "",
      quantity: 1,
      unit_price: 0,
      expiry_date: null,
      batch_number: "",
    };
    setMedicineList((prev) => [...prev, newMedicine]);
  }, []);

  const removeMedicine = useCallback((id) => {
    setMedicineList((prev) => {
      const newList = prev.filter((m) => m.id !== id);
      if (newList.length === 0) {
        message.warning("Phải có ít nhất 1 thuốc!");
        return prev;
      }
      return newList;
    });
  }, []);

  const updateMedicine = useCallback((id, field, value) => {
    setMedicineList((prev) =>
      prev.map((m) => (m.id === id ? { ...m, [field]: value } : m))
    );
  }, []);

  const handleMedicineCodeChange = useCallback(
    (id, value) => {
      const selectedMedicine = medicines.find(
        (m) => m.code === value || m.id === value
      );

      if (selectedMedicine) {
        updateMedicine(id, "medicine_code", value);
        updateMedicine(id, "medicine_name", selectedMedicine.name);
        updateMedicine(id, "unit", selectedMedicine.unit_name);
      }
    },
    [medicines, updateMedicine]
  );

  const calculateSubtotal = useCallback((quantity, unitPrice) => {
    return (quantity || 0) * (unitPrice || 0);
  }, []);

  const calculateTotal = useCallback(() => {
    return medicineList.reduce((total, m) => {
      return total + calculateSubtotal(m.quantity, m.unit_price);
    }, 0);
  }, [medicineList, calculateSubtotal]);

  const getMedicineInfo = useCallback(
    (medicineCode) => {
      return medicines.find(
        (m) => m.code === medicineCode || m.id === medicineCode
      );
    },
    [medicines]
  );

  const updateQuantityMedicine = async () => {
    try {
      for (const item of medicineList) {
        const found = medicines.find(
          (m) => m.code === item.medicine_code || m.id === item.medicine_code
        );

        if (!found) {
          console.warn(`Không tìm thấy thuốc có mã: ${item.medicine_code}`);
          continue;
        }

        const newQuantity = (found.quantity || 0) + (item.quantity || 0);
        await medicinesAPI.updateMedicine(found.id, { quantity: newQuantity });
      }

      message.success("Cập nhật số lượng thuốc thành công!");
    } catch (error) {
      console.error("❌ Lỗi cập nhật số lượng thuốc:", error);
      message.error("Không thể cập nhật số lượng thuốc!");
    }
  };

  const handleSubmit = useCallback(
    async (values) => {
      try {
        setLoading(true);

        const medicinesData = medicineList
          .map((item) => {
            const found = getMedicineInfo(item.medicine_code);

            return {
              medicine_id: found?.id,
              batch_code: item.batch_number,
              expiry_date: item.expiry_date?.format("YYYY-MM-DD"),
              quantity: item.quantity,
              unit_price: item.unit_price,
            };
          })
          .filter((item) => item.medicine_id);

        if (medicinesData.length === 0) {
          message.error("Vui lòng chọn ít nhất 1 thuốc hợp lệ!");
          return;
        }

        const payload = {
          supplier_name: values.supplier_name,
          receipt_date: values.receipt_date?.format("YYYY-MM-DD"),
          user_id: 1,
          batches: medicinesData,
        };

        if (editingReceipt) {
          await importReceiptsAPI.updateImportReceipt(
            editingReceipt.id,
            payload
          );
          message.success("Cập nhật phiếu nhập thành công");
        } else {
          await importReceiptsAPI.createImportReceipt(payload);
          message.success("Thêm phiếu nhập thành công");
          await updateQuantityMedicine();
        }

        setModalVisible(false);
        form.resetFields();
        setMedicineList([]);
        fetchReceipts();
      } catch (error) {
        console.error("❌ Submit error:", error);
        message.error("Không thể lưu phiếu nhập thuốc");
      } finally {
        setLoading(false);
      }
    },
    [medicineList, editingReceipt, getMedicineInfo, form, fetchReceipts]
  );

  const medicineColumns = [
    {
      title: "STT",
      key: "index",
      width: 60,
      render: (_, __, index) => index + 1,
    },
    {
      title: "Mã thuốc",
      key: "medicine_code",
      width: 180,
      render: (_, record) => (
        <Select
          placeholder="Chọn mã thuốc"
          value={record.medicine_code}
          onChange={(value) => handleMedicineCodeChange(record.id, value)}
          style={{ width: "100%" }}
          showSearch
          allowClear
          filterOption={(input, option) =>
            option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
          }
        >
          {medicines.map((medicine) => (
            <Option key={medicine.id} value={medicine.code || medicine.id}>
              {medicine.code || medicine.id} - {medicine.name}
            </Option>
          ))}
        </Select>
      ),
    },
    {
      title: "Tên thuốc",
      key: "medicine_name",
      width: 200,
      render: (_, record) => (
        <span style={{ fontWeight: 500 }}>{record.medicine_name || ""}</span>
      ),
    },
    {
      title: "Đơn vị",
      key: "unit",
      width: 100,
      render: (_, record) => <span>{record.unit || ""}</span>,
    },
    {
      title: "Số lượng",
      key: "quantity",
      width: 120,
      render: (_, record) => (
        <InputNumber
          min={1}
          value={record.quantity}
          onChange={(value) => updateMedicine(record.id, "quantity", value)}
          style={{ width: "100%" }}
        />
      ),
    },
    {
      title: "Giá nhập",
      key: "unit_price",
      width: 120,
      render: (_, record) => (
        <InputNumber
          min={0}
          precision={0}
          value={record.unit_price}
          onChange={(value) => updateMedicine(record.id, "unit_price", value)}
          style={{ width: "100%" }}
          formatter={(value) =>
            `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ".") + " ₫"
          }
          parser={(value) =>
            value.replace(/\₫\s?|(,*)/g, "").replace(/\./g, "")
          }
        />
      ),
    },
    {
      title: "Thành tiền",
      key: "subtotal",
      width: 120,
      render: (_, record) => {
        const subtotal = calculateSubtotal(record.quantity, record.unit_price);
        return (
          <span style={{ fontWeight: 500, color: "#1890ff" }}>
            {new Intl.NumberFormat("vi-VN", {
              style: "currency",
              currency: "VND",
            }).format(subtotal)}
          </span>
        );
      },
    },
    {
      title: "Hạn sử dụng",
      key: "expiry_date",
      width: 140,
      render: (_, record) => (
        <DatePicker
          value={record.expiry_date}
          onChange={(date) => updateMedicine(record.id, "expiry_date", date)}
          format="DD/MM/YYYY"
          style={{ width: "100%" }}
          placeholder="DD/MM/YYYY"
        />
      ),
    },
    {
      title: "Số lô",
      key: "batch_number",
      width: 120,
      render: (_, record) => (
        <Input
          value={record.batch_number}
          onChange={(e) =>
            updateMedicine(record.id, "batch_number", e.target.value)
          }
          placeholder="Số lô"
        />
      ),
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
          onClick={() => removeMedicine(record.id)}
        />
      ),
    },
  ];

  const detailMedicineColumns = [
    {
      title: "STT",
      key: "index",
      width: 60,
      align: "center",
      render: (_, __, index) => index + 1,
    },
    {
      title: "Mã thuốc",
      dataIndex: "medicine_code",
      key: "medicine_code",
      width: 120,
    },
    {
      title: "Tên thuốc",
      dataIndex: "medicine_name",
      key: "medicine_name",
      width: 200,
      render: (text) => <strong>{text}</strong>,
    },
    {
      title: "Đơn vị",
      dataIndex: "unit",
      key: "unit",
      width: 100,
      align: "center",
    },
    {
      title: "Số lượng",
      dataIndex: "quantity",
      key: "quantity",
      width: 100,
      align: "center",
      render: (value) => <Tag color="blue">{value}</Tag>,
    },
    {
      title: "Giá nhập",
      dataIndex: "unit_price",
      key: "unit_price",
      width: 120,
      align: "right",
      render: (value) => `${value?.toLocaleString("vi-VN")} ₫`,
    },
    {
      title: "Thành tiền",
      key: "subtotal",
      width: 140,
      align: "right",
      render: (_, record) => {
        const subtotal = (record.quantity || 0) * (record.unit_price || 0);
        return (
          <strong style={{ color: "#52c41a" }}>
            {subtotal.toLocaleString("vi-VN")} ₫
          </strong>
        );
      },
    },
    {
      title: "Hạn SD",
      dataIndex: "expiry_date",
      key: "expiry_date",
      width: 120,
      align: "center",
      render: (date) => moment(date).format("DD/MM/YYYY"),
    },
    {
      title: "Số lô",
      dataIndex: "batch_number",
      key: "batch_number",
      width: 120,
      align: "center",
    },
  ];

  const columns = [
    { title: "Mã phiếu", dataIndex: "id", key: "id", width: 120 },
    {
      title: "Ngày nhập",
      dataIndex: "receipt_date",
      key: "receipt_date",
      width: 120,
      render: (d) => moment(d).format("DD/MM/YYYY"),
    },
    {
      title: "Nhà cung cấp",
      dataIndex: "supplier_name",
      key: "supplier_name",
      width: 200,
    },
    {
      title: "Tổng tiền",
      dataIndex: "total_amount",
      key: "total_amount",
      width: 150,
      render: (v) =>
        new Intl.NumberFormat("vi-VN", {
          style: "currency",
          currency: "VND",
        }).format(v),
    },
    {
      title: "Thao tác",
      key: "actions",
      width: 100,
      render: (_, record) => (
        <Space>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEditReceipt(record)}
          >
            Sửa
          </Button>

          <Popconfirm
            title="Bạn có chắc muốn xóa phiếu này không?"
            onConfirm={() => handleDeleteReceipt(record.id)}
            okText="Xóa"
            cancelText="Hủy"
          >
            <Button size="small" icon={<DeleteOutlined />} danger />
          </Popconfirm>

          <Tooltip title="Xem chi tiết">
            <Button
              size="small"
              shape="square"
              icon={<EyeOutlined style={{ color: "white" }} />}
              onClick={() => handleViewDetail(record)}
              style={{
                backgroundColor: "#fa8c16",
                borderColor: "#fa8c16",
              }}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: "16px" }}>
      <h1 style={{ marginBottom: 24, color: "#1890ff" }}>PHIẾU NHẬP THUỐC</h1>

      <Card>
        <div
          style={{
            marginBottom: 16,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Search
            placeholder="Tìm kiếm phiếu nhập thuốc"
            style={{ width: 300 }}
            prefix={<SearchOutlined />}
          />
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAddReceipt}
          >
            Thêm phiếu nhập thuốc
          </Button>
        </div>
        <Table
          columns={columns}
          dataSource={receipts}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
          scroll={{ x: 800 }}
        />
      </Card>

      {/* Modal Form Thêm/Sửa */}
      <Modal
        title={
          editingReceipt ? "Sửa phiếu nhập thuốc" : "Thêm phiếu nhập thuốc"
        }
        open={modalVisible}
        footer={null}
        onCancel={() => {
          setModalVisible(false);
          setMedicineList([]);
          setEditingReceipt(null);
          form.resetFields();
        }}
        width={1400}
        bodyStyle={{ maxHeight: "70vh", overflow: "auto" }}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={8}>
              <Form.Item
                name="supplier_name"
                label="Nhà cung cấp"
                rules={[{ required: true }]}
              >
                <Input placeholder="Nhập tên nhà cung cấp" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="receipt_date"
                label="Ngày nhập"
                rules={[{ required: true }]}
              >
                <DatePicker
                  style={{ width: "100%" }}
                  format="DD/MM/YYYY"
                  defaultValue={moment()}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="staff_name" label="Người nhập">
                <Input placeholder="Nhập tên nhân viên nhập" />
              </Form.Item>
            </Col>
          </Row>

          <Divider>Kê danh sách thuốc</Divider>

          <div style={{ marginBottom: 16 }}>
            <Button
              type="dashed"
              icon={<PlusOutlined />}
              onClick={addMedicine}
              block
            >
              Thêm thuốc
            </Button>
          </div>

          <Table
            columns={medicineColumns}
            dataSource={medicineList}
            pagination={false}
            rowKey="id"
            size="small"
            scroll={{ x: 1400, y: 300 }}
            bordered
          />

          {medicineList.length > 0 && (
            <div style={{ marginTop: 16, textAlign: "right" }}>
              <strong style={{ fontSize: 18, color: "#52c41a" }}>
                Tổng tiền: {calculateTotal().toLocaleString("vi-VN")} ₫
              </strong>
            </div>
          )}

          <Form.Item style={{ marginTop: 24, textAlign: "right" }}>
            <Space>
              <Button
                onClick={() => {
                  setModalVisible(false);
                  setMedicineList([]);
                  setEditingReceipt(null);
                  form.resetFields();
                }}
              >
                Hủy
              </Button>
              <Button type="primary" htmlType="submit" loading={loading}>
                {editingReceipt ? "Cập nhật" : "Thêm mới"}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal Chi Tiết Phiếu Nhập */}
      <Modal
        title={
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              background: "linear-gradient(135deg, #1890ff 0%, #40a9ff 100%)",
              padding: "16px 24px",
              borderRadius: "12px 12px 0 0",
              color: "white",
              boxShadow: "0 4px 12px rgba(24, 144, 255, 0.2)",
            }}
          >
            <FileTextOutlined style={{ fontSize: 24, color: "white" }} />
            <span style={{ fontSize: 20, fontWeight: 600 }}>
              Chi tiết phiếu nhập thuốc
            </span>
          </div>
        }
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        width={1300}
        footer={[
          <Button
            key="print"
            type="primary"
            size="large"
            icon={<PrinterOutlined />}
            style={{
              background: "linear-gradient(135deg, #1890ff 0%, #40a9ff 100%)",
              border: "none",
              fontWeight: 600,
              borderRadius: 8,
              boxShadow: "0 4px 12px rgba(24, 144, 255, 0.3)",
            }}
            onClick={handlePrintReceipt}
          >
            In phiếu
          </Button>,
          <Button
            key="close"
            size="large"
            style={{
              borderRadius: 8,
              fontWeight: 500,
              borderColor: "#d9d9d9",
              color: "#595959",
            }}
            onClick={() => setDetailModalVisible(false)}
          >
            Đóng
          </Button>,
        ]}
        bodyStyle={{
          padding: "0",
          backgroundColor: "#fafbfc",
          borderRadius: "0 0 12px 12px",
        }}
        style={{
          borderRadius: 12,
          boxShadow: "0 20px 40px rgba(0,0,0,0.1)",
        }}
      >
        {selectedReceipt && (
          <div style={{ padding: "24px" }}>
            {/* Header Information */}
            <Card
              style={{
                marginBottom: 24,
                background: "linear-gradient(135deg, #e6f7ff 0%, #f0f5ff 100%)",
                border: "1px solid #e8f4fd",
                borderRadius: 12,
                boxShadow: "0 4px 12px rgba(24, 144, 255, 0.1)",
                overflow: "hidden",
              }}
              bodyStyle={{ padding: "24px" }}
            >
              <div
                style={{
                  fontSize: 18,
                  color: "#1890ff",
                  marginBottom: 20,
                  fontWeight: 600,
                  borderBottom: "2px solid #e6f7ff",
                  paddingBottom: 12,
                }}
              >
                Thông tin phiếu nhập
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
                  gap: 16,
                }}
              >
                <div
                  style={{
                    background: "white",
                    padding: 16,
                    borderRadius: 8,
                    border: "1px solid #f0f0f0",
                  }}
                >
                  <div
                    style={{
                      color: "#595959",
                      fontWeight: 500,
                      marginBottom: 8,
                      fontSize: 14,
                    }}
                  >
                    Mã phiếu
                  </div>
                  <Tag
                    color="blue"
                    style={{
                      fontSize: 14,
                      padding: "6px 12px",
                      borderRadius: 16,
                      background:
                        "linear-gradient(135deg, #1890ff 0%, #40a9ff 100%)",
                      border: "none",
                      fontWeight: 600,
                    }}
                  >
                    #{selectedReceipt.id}
                  </Tag>
                </div>
                <div
                  style={{
                    background: "white",
                    padding: 16,
                    borderRadius: 8,
                    border: "1px solid #f0f0f0",
                  }}
                >
                  <div
                    style={{
                      color: "#595959",
                      fontWeight: 500,
                      marginBottom: 8,
                      fontSize: 14,
                    }}
                  >
                    Ngày nhập
                  </div>
                  <strong style={{ fontSize: 16, color: "#262626" }}>
                    {moment(selectedReceipt.receipt_date).format("DD/MM/YYYY")}
                  </strong>
                </div>
                <div
                  style={{
                    background: "white",
                    padding: 16,
                    borderRadius: 8,
                    border: "1px solid #f0f0f0",
                    gridColumn: "1 / -1",
                  }}
                >
                  <div
                    style={{
                      color: "#595959",
                      fontWeight: 500,
                      marginBottom: 8,
                      fontSize: 14,
                    }}
                  >
                    Nhà cung cấp
                  </div>
                  <strong style={{ fontSize: 16, color: "#262626" }}>
                    {selectedReceipt.supplier_name}
                  </strong>
                </div>
                <div
                  style={{
                    background: "white",
                    padding: 16,
                    borderRadius: 8,
                    border: "1px solid #f0f0f0",
                  }}
                >
                  <div
                    style={{
                      color: "#595959",
                      fontWeight: 500,
                      marginBottom: 8,
                      fontSize: 14,
                    }}
                  >
                    Người nhập
                  </div>
                  <span style={{ color: "#8c8c8c", fontSize: 14 }}>
                    {selectedReceipt.staff_name || "N/A"}
                  </span>
                </div>
                <div
                  style={{
                    background: "white",
                    padding: 16,
                    borderRadius: 8,
                    border: "1px solid #f0f0f0",
                  }}
                >
                  <div
                    style={{
                      color: "#595959",
                      fontWeight: 500,
                      marginBottom: 8,
                      fontSize: 14,
                    }}
                  >
                    Tổng tiền
                  </div>
                  <strong
                    style={{
                      fontSize: 18,
                      color: "#52c41a",
                      //background: "linear-gradient(135deg, #52c41a 0%, #73d13d 100%)",
                      padding: "8px 16px",
                      borderRadius: 16,
                      display: "inline-block",
                      fontWeight: 600,
                    }}
                  >
                    {new Intl.NumberFormat("vi-VN", {
                      style: "currency",
                      currency: "VND",
                    }).format(selectedReceipt.total_amount)}
                  </strong>
                </div>
              </div>
            </Card>

            {/* Medicine List */}
            <Card
              title={
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    color: "#262626",
                    fontSize: 16,
                    fontWeight: 600,
                  }}
                >
                  Danh sách thuốc
                  <Tag color="blue" style={{ marginLeft: 8, fontSize: 12 }}>
                    {selectedReceipt.batches?.length || 0} loại
                  </Tag>
                </div>
              }
              style={{
                borderRadius: 12,
                border: "1px solid #d9d9d9",
                boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                marginBottom: 24,
              }}
              bodyStyle={{ padding: "0" }}
            >
              <Table
                columns={detailMedicineColumns}
                dataSource={selectedReceipt.batches?.map((m) => {
                  const medicine = medicines.find(
                    (x) => x.id === m.medicine_id
                  );
                  return {
                    ...m,
                    medicine_code: medicine?.code || m.medicine_id,
                    medicine_name: medicine?.name || "N/A",
                    unit: medicine?.unit_name || "N/A",
                  };
                })}
                rowKey="medicine_id"
                pagination={false}
                size="middle"
                bordered
                style={{ borderRadius: 8 }}
                summary={(pageData) => {
                  const total = pageData.reduce((sum, record) => {
                    return (
                      sum + (record.quantity || 0) * (record.unit_price || 0)
                    );
                  }, 0);

                  return (
                    <Table.Summary.Row
                      style={{
                        background:
                          "linear-gradient(135deg, #1890ff 0%, #40a9ff 100%)",
                        color: "white",
                      }}
                    >
                      <Table.Summary.Cell
                        index={0}
                        colSpan={6}
                        align="right"
                        style={{
                          color: "white",
                          fontWeight: 600,
                          fontSize: 16,
                        }}
                      >
                        TỔNG CỘNG:
                      </Table.Summary.Cell>
                      <Table.Summary.Cell
                        index={1}
                        align="right"
                        style={{
                          color: "white",
                          fontWeight: 700,
                          fontSize: 18,
                        }}
                      >
                        {total.toLocaleString("vi-VN")} ₫
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={2} colSpan={2} />
                    </Table.Summary.Row>
                  );
                }}
              />
            </Card>

            {/* Footer Notes */}
            <Card
              style={{
                background: "linear-gradient(135deg, #f6ffed 0%, #f0f9e8 100%)",
                border: "1px solid #d9f7be",
                borderRadius: 12,
                boxShadow: "0 2px 8px rgba(82, 196, 26, 0.1)",
              }}
              bodyStyle={{ padding: "20px" }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 12,
                  fontSize: 14,
                  color: "#389e0d",
                }}
              >
                <CheckCircleOutlined
                  style={{
                    fontSize: 20,
                    color: "#52c41a",
                    marginTop: 2,
                  }}
                />
                <div>
                  <strong
                    style={{ fontSize: 16, marginBottom: 8, display: "block" }}
                  >
                    Trạng thái hệ thống
                  </strong>
                  <p style={{ margin: 0, lineHeight: 1.6, color: "#595959" }}>
                    Phiếu nhập này đã được lưu thành công vào hệ thống và cập
                    nhật vào kho thuốc. Tất cả thông tin đã được xác nhận và sẵn
                    sàng sử dụng.
                  </p>
                </div>
              </div>
            </Card>

            <style jsx>{`
              .ant-table-thead > tr > th {
                background: linear-gradient(
                  135deg,
                  #1890ff 0%,
                  #40a9ff 100%
                ) !important;
                color: white !important;
                font-weight: 600;
                border: none;
              }
              .ant-table-tbody > tr:hover > td {
                background-color: #e6f7ff !important;
              }
              .ant-table-tbody > tr > td {
                border-bottom: 1px solid #f0f0f0;
                padding: 16px 12px;
              }
            `}</style>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ReceiptMedicineManagement;
