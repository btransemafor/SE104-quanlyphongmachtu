const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// =========================
// 📌 CREATE Import Receipt (Phiếu nhập + các lô thuốc)
// =========================
/* router.post('/', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    const { supplier_name, receipt_date, batches } = req.body;
    const user_id = req.user?.id || null; // lấy user_id từ token

    // batches = [{ medicine_id, batch_code, manufacture_date, expiry_date, quantity, unit_price }]

    await client.query('BEGIN');

    //  Tính tổng tiền phiếu nhập
    const totalAmount = batches.reduce(
      (sum, b) => sum + b.quantity * b.unit_price,
      0
    );

    //  Tạo phiếu nhập
    const receiptResult = await client.query(
      `INSERT INTO import_receipts (supplier_name, user_id, receipt_date, total_amount)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [supplier_name, user_id, receipt_date, totalAmount]
    );

    const receiptId = receiptResult.rows[0].id;

    // Tạo từng lô thuốc
    for (const b of batches) {
      await client.query(
        `INSERT INTO batches (
          medicine_id, import_receipt_id, batch_code, manufacture_date, expiry_date,
          quantity, unit_price, remaining_quantity
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $6)`,
        [
          b.medicine_id,
          receiptId,
          b.batch_code,
          b.manufacture_date,
          b.expiry_date,
          b.quantity,
          b.unit_price,
        ]
      );

      //  Cập nhật tổng tồn trong bảng medicines
      await client.query(
        `UPDATE medicines
         SET total_quantity = COALESCE(total_quantity, 0) + $1
         WHERE id = $2`,
        [b.quantity, b.medicine_id]
      );
    }

    await client.query('COMMIT');
    res.json({
      success: true,
      message: 'Import receipt created successfully',
      receipt_id: receiptId,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Create import receipt error:', err);
    res.status(500).json({
      success: false,
      message: 'Server error while creating import receipt',
    });
  } finally {
    client.release();
  }
});
 */

// ======================= CREATE =======================
router.post('/',    [ authenticateToken,
    authorizeRoles('admin')], async (req, res) => {
  const client = await pool.connect();
  try {
    const { supplier_name, receipt_date,user_id, batches } = req.body;

    if (!supplier_name || !receipt_date || !batches || batches.length === 0) {
      return res.status(400).json({ success: false, message: 'Thiếu thông tin phiếu nhập hoặc danh sách thuốc' });
    }

    await client.query('BEGIN');

    const totalAmount = batches.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);

    // 1️ Tạo phiếu nhập
    const result = await client.query(
      `INSERT INTO import_receipts (supplier_name, receipt_date, user_id, total_amount)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [supplier_name , receipt_date, user_id, totalAmount]
    );
    const receiptId = result.rows[0].id;

    // 2️⃣ Tạo chi tiết các lô thuốc
    for (const b of batches) {
      await client.query(
        `INSERT INTO batches (medicine_id, import_receipt_id, batch_code, manufacture_date, expiry_date, quantity, unit_price, remaining_quantity)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $6)`,
        [b.medicine_id, receiptId, b.batch_code, b.manufacture_date, b.expiry_date, b.quantity, b.unit_price]
      );
    }

    await client.query('COMMIT');
    res.json({ success: true, message: 'Thêm phiếu nhập thành công', receipt_id: receiptId });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Lỗi thêm phiếu nhập:', err);
    res.status(500).json({ success: false, message: 'Lỗi khi thêm phiếu nhập thuốc' });
  } finally {
    client.release();
  }
});


// =========================
// 📌 GET ALL Import Receipts
// =========================
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT ir.*, u.full_name AS created_by
      FROM import_receipts ir
      LEFT JOIN users u ON ir.user_id = u.id
      ORDER BY ir.receipt_date DESC
    `);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Get all import receipts error:', err);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching import receipts',
    });
  }
});

// =========================
// GET ONE Import Receipt + batches
// =========================
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const receipt = await pool.query(
      `SELECT ir.*, u.full_name AS created_by
       FROM import_receipts ir
       LEFT JOIN users u ON ir.user_id = u.id
       WHERE ir.id = $1`,
      [id]
    );

    if (receipt.rows.length === 0)
      return res.status(404).json({
        success: false,
        message: 'Import receipt not found',
      });

    const batches = await pool.query(
      `SELECT b.*, m.name AS medicine_name, un.name AS unit_name
       FROM batches b
       LEFT JOIN medicines m ON b.medicine_id = m.id
       LEFT JOIN units un ON m.unit_id = un.id
       WHERE b.import_receipt_id = $1`,
      [id]
    );

    res.json({
      success: true,
      data: { ...receipt.rows[0], batches: batches.rows },
    });
  } catch (err) {
    console.error('Get import receipt error:', err);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching import receipt',
    });
  }
});

// =========================
// 📌 UPDATE Import Receipt
// =========================
router.put('/:id', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { supplier_name, receipt_date, batches } = req.body;

    await client.query('BEGIN');

    // Lấy lại các lô cũ để cập nhật số lượng thuốc
    const oldBatches = await client.query(
      `SELECT * FROM batches WHERE import_receipt_id = $1`,
      [id]
    );

    // Trừ lại tồn kho cũ
    for (const ob of oldBatches.rows) {
      await client.query(
        `UPDATE medicines 
         SET total_quantity = COALESCE(total_quantity, 0) - $1
         WHERE id = $2`,
        [ob.quantity, ob.medicine_id]
      );
    }

    // Xóa các lô cũ
    await client.query(`DELETE FROM batches WHERE import_receipt_id = $1`, [id]);

    // Tính lại tổng tiền
    const totalAmount = batches.reduce(
      (sum, b) => sum + b.quantity * b.unit_price,
      0
    );

    // Cập nhật phiếu nhập
    await client.query(
      `UPDATE import_receipts
       SET supplier_name = $1, receipt_date = $2, total_amount = $3, updated_at = CURRENT_TIMESTAMP
       WHERE id = $4`,
      [supplier_name, receipt_date, totalAmount, id]
    );

    // Thêm lại các lô mới
    for (const b of batches) {
      await client.query(
        `INSERT INTO batches (
          medicine_id, import_receipt_id, batch_code, manufacture_date, expiry_date,
          quantity, unit_price, remaining_quantity
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $6)`,
        [
          b.medicine_id,
          id,
          b.batch_code,
          b.manufacture_date,
          b.expiry_date,
          b.quantity,
          b.unit_price,
        ]
      );

      // Cộng lại vào tồn kho
      await client.query(
        `UPDATE medicines 
         SET total_quantity = COALESCE(total_quantity, 0) + $1
         WHERE id = $2`,
        [b.quantity, b.medicine_id]
      );
    }

    await client.query('COMMIT');
    res.json({ success: true, message: 'Import receipt updated successfully' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Update import receipt error:', err);
    res.status(500).json({
      success: false,
      message: 'Server error while updating import receipt',
    });
  } finally {
    client.release();
  }
});

// =========================
// 📌 DELETE Import Receipt
// =========================
router.delete('/:id', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    await client.query('BEGIN');

    // Lấy các lô để trừ tồn
    const batches = await client.query(
      `SELECT * FROM batches WHERE import_receipt_id = $1`,
      [id]
    );

    for (const b of batches.rows) {
      await client.query(
        `UPDATE medicines 
         SET total_quantity = COALESCE(total_quantity, 0) - $1
         WHERE id = $2`,
        [b.quantity, b.medicine_id]
      );
    }

    await client.query(`DELETE FROM batches WHERE import_receipt_id = $1`, [id]);
    await client.query(`DELETE FROM import_receipts WHERE id = $1`, [id]);

    await client.query('COMMIT');
    res.json({ success: true, message: 'Import receipt deleted successfully' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Delete import receipt error:', err);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting import receipt',
    });
  } finally {
    client.release();
  }
});

module.exports = router;
