const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

/**
 * ============================
 *  GET /api/medicines
 *  Get all medicines (with pagination, search, and filter by active)
 * ============================
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { search, page = 1, limit = 10, active_only = 'true' } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT m.id, m.name, m.description, m.quantity,  m.unit_id, u.name AS unit_name, m.is_active, m.created_at, m.updated_at
      FROM medicines m
      LEFT JOIN units u ON m.unit_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (active_only === 'true') {
      params.push(true);
      query += ` AND m.is_active = $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      query += ` AND m.name ILIKE $${params.length}`;
    }

    params.push(limit, offset);
    query += ` ORDER BY m.name ASC LIMIT $${params.length - 1} OFFSET $${params.length}`;

    const result = await pool.query(query, params);

    // Count total for pagination
    let countQuery = 'SELECT COUNT(*) FROM medicines WHERE 1=1';
    const countParams = [];
    if (active_only === 'true') {
      countParams.push(true);
      countQuery += ` AND is_active = $${countParams.length}`;
    }
    if (search) {
      countParams.push(`%${search}%`);
      countQuery += ` AND name ILIKE $${countParams.length}`;
    }

    const total = parseInt((await pool.query(countQuery, countParams)).rows[0].count);

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    });

  } catch (err) {
    console.error('Get medicines error:', err);
    res.status(500).json({ success: false, message: 'Server error while fetching medicines' });
  }
});


/// Fetch Thuốc dựa theo phiếu nhập thuốc /api/available-medicines
//  Lấy danh sách thuốc khả dụng (ưu tiên lô cũ nhất còn hàng)
router.get('/available-medicines', authenticateToken, async (req, res) => {
  try {
    const { search, page = 1, limit = 10, active_only = 'true' } = req.query;
    const offset = (page - 1) * limit;

    //  Query chính dùng CTE để phân biệt batch cũ nhất
    let query = `
      WITH ranked_medicines AS (
        SELECT 
          m.id,
          m.name,
          m.description,
          m.unit_id,
          u.name AS unit_name,
          m.is_active,
          b.id AS batch_id,
          b.quantity AS batch_quantity,
          b.remaining_quantity,
          b.unit_price,
          ir.receipt_date,
          --  Xếp hạng các batch theo ngày nhập
          ROW_NUMBER() OVER (PARTITION BY m.id ORDER BY ir.receipt_date ASC) AS row_num,
          --  Tổng tồn kho của thuốc (gộp mọi batch)
          COALESCE(SUM(b.remaining_quantity) OVER (PARTITION BY m.id), 0) AS total_stock,
          --  Gợi ý giá bán = giá nhập * 1.2 (lãi 20%)
          ROUND(b.unit_price * 1.2, 0) AS suggested_price
        FROM medicines m
        LEFT JOIN units u ON m.unit_id = u.id
        LEFT JOIN batches b ON b.medicine_id = m.id
        LEFT JOIN import_receipts ir ON ir.id = b.import_receipt_id
        WHERE b.remaining_quantity > 0
      )
      SELECT *
      FROM ranked_medicines
      WHERE row_num = 1
    `;

    const params = [];

    //  Lọc theo trạng thái hoạt động
    if (active_only === 'true') {
      params.push(true);
      query += ` AND is_active = $${params.length}`;
    }

    //  Tìm kiếm theo tên thuốc
    if (search) {
      params.push(`%${search}%`);
      query += ` AND name ILIKE $${params.length}`;
    }

    //  Phân trang
    params.push(limit, offset);
    query += ` ORDER BY name ASC LIMIT $${params.length - 1} OFFSET $${params.length}`;

    //  Thực thi
    const result = await pool.query(query, params);

    //  Đếm tổng thuốc
    let countQuery = `
      SELECT COUNT(DISTINCT m.id)
      FROM medicines m
      LEFT JOIN batches b ON b.medicine_id = m.id
      WHERE b.remaining_quantity > 0
    `;
    const countParams = [];
    if (active_only === 'true') {
      countParams.push(true);
      countQuery += ` AND m.is_active = $${countParams.length}`;
    }
    if (search) {
      countParams.push(`%${search}%`);
      countQuery += ` AND m.name ILIKE $${countParams.length}`;
    }

    const total = parseInt((await pool.query(countQuery, countParams)).rows[0].count);

    //  Kết quả trả về
    res.json({
      success: true,
      data: result.rows,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    });

  } catch (err) {
    console.error('❌ Get available medicines error:', err);
    res.status(500).json({ success: false, message: 'Server error while fetching medicines' });
  }
});


/**
 * ============================
 *  GET /api/medicines/:id
 *  Get medicine by ID
 * ============================
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT 
          m.id,
          m.name,
          m.unit_id,
          m.quantity, 
          u.name AS unit_name,
          m.is_active,
          m.created_at,
          m.updated_at,
          COALESCE(SUM(b.remaining_quantity), 0) AS total_quantity
       FROM medicines m
       LEFT JOIN units u ON m.unit_id = u.id
       LEFT JOIN batches b ON m.id = b.medicine_id
       WHERE m.id = $1
       GROUP BY m.id, u.name`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Medicine not found'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (err) {
    console.error('Get medicine error:', err);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching medicine'
    });
  }
});

/**
 * ============================
 *  POST /api/medicines
 *  Create new medicine
 * ============================
 */
router.post(
  '/',
  [
    authenticateToken,
    authorizeRoles('admin'),
    body('name').notEmpty().withMessage('Medicine name is required'),
    body('unit_id').notEmpty().withMessage('Unit is required'),
    //body('price').isFloat({ min: 0 }).withMessage('Price must be positive')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty())
        return res.status(400).json({ success: false, errors: errors.array() });

      const { name, unit_id, description, quantity } = req.body;

      // Check duplicate
      const exists = await pool.query(
        'SELECT id FROM medicines WHERE name = $1 AND unit_id = $2',
        [name, unit_id]
      );

      if (exists.rows.length > 0)
        return res.status(400).json({ success: false, message: 'Medicine already exists' });

      const result = await pool.query(
        `INSERT INTO medicines (name, unit_id, desciption, quanity)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [name, unit_id, description, quantity]
      );

      res.status(201).json({ success: true, message: 'Medicine created', data: result.rows[0] });
    } catch (err) {
      console.error('Create medicine error:', err);
      res.status(500).json({ success: false, message: 'Server error while creating medicine' });
    }
  }
);

/**
 * ============================
 *  PUT /api/medicines/:id
 *  Update medicine
 * ============================
 */
router.put(
  '/:id',
  [
    authenticateToken,
    authorizeRoles('admin'),
    body('name').optional().notEmpty(),
    body('unit_id').optional().notEmpty(),
    //body('price').optional().isFloat({ min: 0 }),
    body('is_active').optional().isBoolean()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty())
        return res.status(400).json({ success: false, errors: errors.array() });

      const { id } = req.params;
      const { name, unit_id, is_active, description, quantity } = req.body;

      const check = await pool.query('SELECT id FROM medicines WHERE id = $1', [id]);
      if (check.rows.length === 0)
        return res.status(404).json({ success: false, message: 'Medicine not found' });

      const duplicate = await pool.query(
        'SELECT id FROM medicines WHERE name = $1 AND unit_id = $2 AND id != $3',
        [name, unit_id, id]
      );
      if (duplicate.rows.length > 0)
        return res.status(400).json({ success: false, message: 'Duplicate medicine' });

      const result = await pool.query(
        `UPDATE medicines
         SET name = COALESCE($1, name),
             unit_id = COALESCE($2, unit_id),
             is_active = COALESCE($3, is_active),
             updated_at = CURRENT_TIMESTAMP, 
             description = COALESCE($4, description), 
             quantity = COALESCE($6, quantity)
         WHERE id = $5
         RETURNING *`,
        [name, unit_id, is_active, description, id, quantity]
      );

      res.json({ success: true, message: 'Medicine updated', data: result.rows[0] });
    } catch (err) {
      console.error('Update medicine error:', err);
      res.status(500).json({ success: false, message: 'Server error while updating medicine' });
    }
  }
);

/**
 * ============================
 *  DELETE /api/medicines/:id
 *  Soft delete (set inactive)
 * ============================
 */
router.delete('/:id', [authenticateToken, authorizeRoles('admin')], async (req, res) => {
  try {
    const { id } = req.params;
    const check = await pool.query('SELECT id FROM medicines WHERE id = $1', [id]);
    if (check.rows.length === 0)
      return res.status(404).json({ success: false, message: 'Medicine not found' });

    await pool.query('UPDATE medicines SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1', [id]);

    res.json({ success: true, message: 'Medicine deleted successfully' });
  } catch (err) {
    console.error('Delete medicine error:', err);
    res.status(500).json({ success: false, message: 'Server error while deleting medicine' });
  }
});




module.exports = router;
