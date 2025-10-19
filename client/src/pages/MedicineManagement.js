import React, { useState, useEffect } from "react";
import {
  Card,
  Table,
  Button,
  Input,
  Select,
  Space,
  Modal,
  Form,
  InputNumber,
  message,
  Popconfirm,
  Tag,
} from "antd";
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import { medicinesAPI, unitsAPI } from "../services/api";

const { Search } = Input;

const MedicineManagement = () => {
  const [medicines, setMedicines] = useState([]);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingMedicine, setEditingMedicine] = useState(null);
  const [form] = Form.useForm();
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    fetchMedicines();
    fetchUnits();
  }, [pagination.current, pagination.pageSize, searchText]);

  const fetchMedicines = async () => {
    try {
      setLoading(true);
      const response = await medicinesAPI.getMedicines({
        page: pagination.current,
        limit: pagination.pageSize,
        search: searchText,
      });

      if (response.data.success) {
        setMedicines(response.data.data);
        setPagination((prev) => ({
          ...prev,
          total: response.data.pagination.totalItems,
        }));
      }
    } catch (error) {
      console.error("Error fetching medicines:", error);
      message.error("Không thể tải danh sách thuốc");
    } finally {
      setLoading(false);
    }
  };

  /// Hàm fetch danh sách đơn vị
  const fetchUnits = async () => {
    try {
      const response = await unitsAPI.getUnits(); // gọi API /api/units chẳng hạn
      if (response.data.success) {
        setUnits(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching units:", error);
    }
  };

  const handleAdd = () => {
    setEditingMedicine(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (medicine) => {
    setEditingMedicine(medicine);
    form.setFieldsValue(medicine);
    setModalVisible(true);
  };

  const handleDelete = async (id) => {
    try {
      const response = await medicinesAPI.deleteMedicine(id);
      if (response.data.success) {
        message.success("Xóa thuốc thành công!");
        fetchMedicines();
      }
    } catch (error) {
      console.error("Error deleting medicine:", error);
      message.error("Không thể xóa thuốc");
    }
  };

  const handleSubmit = async (values) => {
    try {
      let response;
      if (editingMedicine) {
        response = await medicinesAPI.updateMedicine(
          editingMedicine.id,
          values
        );
      } else {
        response = await medicinesAPI.createMedicine(values);
      }

      if (response.data.success) {
        message.success(
          editingMedicine
            ? "Cập nhật thuốc thành công!"
            : "Thêm thuốc thành công!"
        );
        setModalVisible(false);
        form.resetFields();
        fetchMedicines();
      }
    } catch (error) {
      console.error("Error saving medicine:", error);
      message.error("Không thể lưu thuốc");
    }
  };

  const columns = [
    {
      title: "Tên thuốc",
      dataIndex: "name",
      key: "name",
      sorter: (a, b) => a.name.localeCompare(b.name),
    },

    {
      title: "Đơn vị",
      dataIndex: "unit_name",
      key: "unit",
      width: 100,
    },

    {
      title: "Mô tả",
      description: "Mô tả",
      dataIndex: "description",
      key: "description",
    },

    {
      title: "Số lượng",
      description: "Số lượng",
      dataIndex: "quantity",
      key: "quantity",
    },

    /*     {
      title: 'Giá',
      dataIndex: 'price',
      key: 'price',
      width: 120,
      render: (price) => price.toLocaleString('vi-VN') + 'đ',
      sorter: (a, b) => a.price - b.price,
    }, */

    {
      title: "Trạng thái",
      dataIndex: "is_active",
      key: "is_active",
      width: 100,
      render: (isActive) => (
        <Tag color={isActive ? "green" : "red"}>
          {isActive ? "Hoạt động" : "Ngừng hoạt động"}
        </Tag>
      ),
    },

    {
      title: "Thao tác",
      key: "actions",
      width: 120,
      render: (_, record) => (
        <Space>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            Sửa
          </Button>
          <Popconfirm
            title="Bạn có chắc muốn xóa thuốc này?"
            onConfirm={() => handleDelete(record.id)}
            okText="Xóa"
            cancelText="Hủy"
          >
            <Button danger size="small" icon={<DeleteOutlined />}>
              Xóa
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <h1 style={{ marginBottom: 24 }}>Quản lý thuốc</h1>

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
            placeholder="Tìm kiếm theo tên thuốc"
            allowClear
            onSearch={setSearchText}
            style={{ width: 300 }}
            prefix={<SearchOutlined />}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            Thêm thuốc mới
          </Button>
        </div>

        <Table
          columns={columns}
          dataSource={medicines}
          loading={loading}
          rowKey="id"
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} của ${total} thuốc`,
            onChange: (page, pageSize) => {
              setPagination((prev) => ({
                ...prev,
                current: page,
                pageSize: pageSize || prev.pageSize,
              }));
            },
          }}
        />
      </Card>

      <Modal
        title={editingMedicine ? "Sửa thông tin thuốc" : "Thêm thuốc mới"}
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
          data-testid="form"
        >
          <Form.Item
            name="name"
            label="Tên thuốc"
            rules={[{ required: true, message: "Vui lòng nhập tên thuốc!" }]}
            data-testid="form"
          >
            <Input placeholder="Nhập tên thuốc" />
          </Form.Item>

          <Form.Item
            name="unit_id"
            label="Đơn vị"
            rules={[{ required: true, message: "Vui lòng chọn đơn vị" }]}
          >
            <Select
              placeholder="Chọn đơn vị"
              options={units.map((u) => ({
                label: u.name,
                value: u.id,
              }))}
            />
          </Form.Item>

          <Form.Item name="description" label="Mô tả">
            <Input placeholder="Nhập mô tả thuốc ... " />
          </Form.Item>
          {/*    <Form.Item
            name="price"
            label="Giá (VND)"
            rules={[
              { required: true, message: "Vui lòng nhập giá!" },
              { type: "number", min: 0, message: "Giá phải lớn hơn 0!" },
            ]}
            data-testid="form"
          >
            <InputNumber
              placeholder="Nhập giá"
              style={{ width: "100%" }}
              formatter={(value) =>
                `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
              }
              parser={(value) => value.replace(/\$\s?|(,*)/g, "")}
            />
          </Form.Item> */}

          <Form.Item
            style={{ marginBottom: 0, textAlign: "right" }}
            data-testid="form"
          >
            <Space>
              <Button
                onClick={() => {
                  setModalVisible(false);
                  form.resetFields();
                }}
              >
                Hủy
              </Button>
              <Button type="primary" htmlType="submit">
                {editingMedicine ? "Cập nhật" : "Thêm mới"}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default MedicineManagement;
