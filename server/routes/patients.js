const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();


const validatePatient = [
  body('full_name').notEmpty().withMessage('Full name is required'),
  body('gender').isIn(['Nam', 'Nữ']).withMessage('Gender must be Nam or Nữ'),
  body('birth_year').isInt({ min: 1900, max: new Date().getFullYear() }).withMessage('Invalid birth year'),
  body('phone_number').isLength({ min: 10, max: 11 }).withMessage('Phone number must be 10-11 digits'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }
    next();
  }
];




router.get('/', authenticateToken, async (req, res) => {
  try {
    const { search, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT id, full_name, gender, birth_year, address, phone_number, created_at
      FROM patients 
      WHERE 1=1
    `;
    let queryParams = [];
    let paramCount = 0;

    if (search) {
      paramCount++;
      query += ` AND (full_name ILIKE $${paramCount} OR phone_number ILIKE $${paramCount})`;
      queryParams.push(`%${search}%`);
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    queryParams.push(parseInt(limit), offset);

    const result = await pool.query(query, queryParams);

    
    let countQuery = 'SELECT COUNT(*) FROM patients WHERE 1=1';
    let countParams = [];
    let countParamCount = 0;

    if (search) {
      countParamCount++;
      countQuery += ` AND (full_name ILIKE $${countParamCount} OR phone_number ILIKE $${countParamCount})`;
      countParams.push(`%${search}%`);
    }

    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

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

  } catch (error) {
    console.error('Get patients error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching patients'
    });
  }
});




router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'SELECT * FROM patients WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Get patient error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching patient'
    });
  }
});




router.post('/', [
  authenticateToken,
  authorizeRoles('receptionist', 'admin'),
  body('full_name').notEmpty().withMessage('Full name is required'),
  body('gender').isIn(['Nam', 'Nữ']).withMessage('Gender must be Nam or Nữ'),
  body('birth_year').isInt({ min: 1900, max: new Date().getFullYear() }).withMessage('Invalid birth year'),
  body('phone_number').isMobilePhone('vi-VN').withMessage('Invalid phone number format')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { full_name, gender, birth_year, address, phone_number } = req.body;

    
    const existingPatient = await pool.query(
      'SELECT id FROM patients WHERE phone_number = $1',
      [phone_number]
    );

    if (existingPatient.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Phone number already exists'
      });
    }

    
    const result = await pool.query(
      `INSERT INTO patients (full_name, gender, birth_year, address, phone_number)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [full_name, gender, birth_year, address, phone_number]
    );

    res.status(201).json({
      success: true,
      message: 'Patient created successfully',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Create patient error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating patient'
    });
  }
});




router.put('/:id', [
  authenticateToken,
  authorizeRoles('receptionist', 'admin'),
  body('full_name').optional().notEmpty().withMessage('Full name cannot be empty'),
  body('gender').optional().isIn(['Nam', 'Nữ']).withMessage('Gender must be Nam or Nữ'),
  body('birth_year').optional().isInt({ min: 1900, max: new Date().getFullYear() }).withMessage('Invalid birth year'),
  body('phone_number').optional().isMobilePhone('vi-VN').withMessage('Invalid phone number format')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const { full_name, gender, birth_year, address, phone_number } = req.body;

    
    const existingPatient = await pool.query(
      'SELECT id FROM patients WHERE id = $1',
      [id]
    );

    if (existingPatient.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    
    if (phone_number) {
      const phoneCheck = await pool.query(
        'SELECT id FROM patients WHERE phone_number = $1 AND id != $2',
        [phone_number, id]
      );

      if (phoneCheck.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Phone number already exists'
        });
      }
    }

    
    const result = await pool.query(
      `UPDATE patients 
       SET full_name = COALESCE($1, full_name),
           gender = COALESCE($2, gender),
           birth_year = COALESCE($3, birth_year),
           address = COALESCE($4, address),
           phone_number = COALESCE($5, phone_number),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $6
       RETURNING *`,
      [full_name, gender, birth_year, address, phone_number, id]
    );

    res.json({
      success: true,
      message: 'Patient updated successfully',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Update patient error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating patient'
    });
  }
});




router.get('/:id/medical-history', [
  authenticateToken,
  authorizeRoles('doctor', 'admin')
], async (req, res) => {
  try {
    const { id } = req.params;

    
    const recordsQuery = `
      SELECT 
        mr.id,
        mr.symptoms,
        mr.diagnosis,
        COALESCE(mr.status, 'pending') as status,
        mr.created_at,
        d.name as disease_name,
        u.username as doctor_name
      FROM medical_records mr
      LEFT JOIN diseases d ON mr.disease_id = d.id
      LEFT JOIN users u ON mr.doctor_id = u.id
      WHERE mr.patient_id = $1
      ORDER BY mr.created_at DESC
    `;

    const recordsResult = await pool.query(recordsQuery, [id]);

    
    const recordsWithPrescriptions = await Promise.all(
      recordsResult.rows.map(async (record) => {
        try {
          const prescriptionsQuery = `
            SELECT 
              pd.quantity,
              COALESCE(m.name, 'Unknown Medicine') as medicine_name,
              COALESCE(m.unit, 'Unknown Unit') as unit,
              COALESCE(um.name, 'Unknown Usage') as usage_method
            FROM prescription_details pd
            LEFT JOIN medicines m ON pd.medicine_id = m.id
            LEFT JOIN usage_methods um ON pd.usage_method_id = um.id
            WHERE pd.medical_record_id = $1
          `;

          const prescriptionsResult = await pool.query(prescriptionsQuery, [record.id]);
          
          return {
            ...record,
            prescriptions: prescriptionsResult.rows
          };
        } catch (error) {
          console.error(`Error fetching prescriptions for record ${record.id}:`, error);
          return {
            ...record,
            prescriptions: []
          };
        }
      })
    );

    res.json({
      success: true,
      data: recordsWithPrescriptions
    });

  } catch (error) {
    console.error('Get medical history error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching medical history'
    });
  }
});

module.exports = router;
