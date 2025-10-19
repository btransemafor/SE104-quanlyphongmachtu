const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();




router.post('/', [
  authenticateToken,
  authorizeRoles('receptionist', 'admin'),
  body('patient_id').isInt().withMessage('Patient ID must be a number'),
  body('medical_record_id').isInt().withMessage('Medical record ID must be a number'),
  body('daily_appointment_id').isInt().withMessage('Daily appointment ID must be a number')
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

    const { patient_id, medical_record_id, daily_appointment_id } = req.body;

    
    const appointmentResult = await pool.query(
      'SELECT id, status FROM daily_appointments WHERE id = $1 AND patient_id = $2',
      [daily_appointment_id, patient_id]
    );

    if (appointmentResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    if (appointmentResult.rows[0].status !== 'examined') {
      return res.status(400).json({
        success: false,
        message: 'Cannot create invoice for appointment that is not examined'
      });
    }

    
    const existingInvoice = await pool.query(
      'SELECT id FROM invoices WHERE daily_appointment_id = $1',
      [daily_appointment_id]
    );

    if (existingInvoice.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Invoice already exists for this appointment'
      });
    }

    
    const settingsResult = await pool.query(
      'SELECT setting_value FROM system_settings WHERE setting_key = $1',
      ['consultation_fee']
    );

    const consultationFee = settingsResult.rows.length > 0 ? 
      parseFloat(settingsResult.rows[0].setting_value) : 100000;

    
    const medicineFeeResult = await pool.query(`
      SELECT COALESCE(SUM(pd.quantity * m.price), 0) as total_medicine_fee
      FROM prescription_details pd
      JOIN medicines m ON pd.medicine_id = m.id
      WHERE pd.medical_record_id = $1
    `, [medical_record_id]);

    const medicineFee = parseFloat(medicineFeeResult.rows[0].total_medicine_fee);
    const totalAmount = consultationFee + medicineFee;

    
    const result = await pool.query(
      `INSERT INTO invoices (patient_id, medical_record_id, daily_appointment_id, consultation_fee, medicine_fee, total_amount)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [patient_id, medical_record_id, daily_appointment_id, consultationFee, medicineFee, totalAmount]
    );

    res.status(201).json({
      success: true,
      message: 'Invoice created successfully',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Create invoice error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating invoice'
    });
  }
});




router.get('/:id', [
  authenticateToken,
  authorizeRoles('receptionist', 'admin')
], async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      SELECT 
        i.*,
        p.full_name as patient_name,
        p.phone_number,
        p.address,
        mr.symptoms,
        mr.diagnosis,
        d.name as disease_name,
        u.username as doctor_name,
        pd.id as prescription_id,
        pd.quantity,
        m.name as medicine_name,
        m.unit as medicine_unit,
        m.price as medicine_price,
        um.name as usage_method_name
      FROM invoices i
      JOIN patients p ON i.patient_id = p.id
      JOIN medical_records mr ON i.medical_record_id = mr.id
      LEFT JOIN diseases d ON mr.disease_id = d.id
      LEFT JOIN users u ON mr.doctor_id = u.id
      LEFT JOIN prescription_details pd ON mr.id = pd.medical_record_id
      LEFT JOIN medicines m ON pd.medicine_id = m.id
      LEFT JOIN usage_methods um ON pd.usage_method_id = um.id
      WHERE i.id = $1
      ORDER BY pd.id
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    
    const invoice = {
      id: result.rows[0].id,
      patient_id: result.rows[0].patient_id,
      patient_name: result.rows[0].patient_name,
      phone_number: result.rows[0].phone_number,
      address: result.rows[0].address,
      medical_record_id: result.rows[0].medical_record_id,
      symptoms: result.rows[0].symptoms,
      diagnosis: result.rows[0].diagnosis,
      disease_name: result.rows[0].disease_name,
      doctor_name: result.rows[0].doctor_name,
      consultation_fee: result.rows[0].consultation_fee,
      medicine_fee: result.rows[0].medicine_fee,
      total_amount: result.rows[0].total_amount,
      payment_status: result.rows[0].payment_status,
      created_at: result.rows[0].created_at,
      prescriptions: result.rows
        .filter(row => row.prescription_id)
        .map(row => ({
          id: row.prescription_id,
          medicine_name: row.medicine_name,
          unit: row.medicine_unit,
          price: row.medicine_price,
          quantity: row.quantity,
          usage_method_name: row.usage_method_name,
          total: row.quantity * row.medicine_price
        }))
    };

    res.json({
      success: true,
      data: invoice
    });

  } catch (error) {
    console.error('Get invoice error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching invoice'
    });
  }
});




router.put('/:id/pay', [
  authenticateToken,
  authorizeRoles('receptionist', 'admin')
], async (req, res) => {
  try {
    const { id } = req.params;

    
    const existingInvoice = await pool.query(
      'SELECT id, payment_status FROM invoices WHERE id = $1',
      [id]
    );

    if (existingInvoice.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    if (existingInvoice.rows[0].payment_status === 'paid') {
      return res.status(400).json({
        success: false,
        message: 'Invoice is already paid'
      });
    }

    
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      
      await client.query(
        'UPDATE invoices SET payment_status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        ['paid', id]
      );

      
      await client.query(
        `UPDATE daily_appointments 
         SET status = 'completed', updated_at = CURRENT_TIMESTAMP
         WHERE id = (SELECT daily_appointment_id FROM invoices WHERE id = $1)`,
        [id]
      );

      await client.query('COMMIT');

      res.json({
        success: true,
        message: 'Payment confirmed successfully'
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Confirm payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while confirming payment'
    });
  }
});




router.get('/', [
  authenticateToken,
  authorizeRoles('receptionist', 'admin')
], async (req, res) => {
  try {
    const { 
      patient_id, 
      payment_status, 
      start_date, 
      end_date, 
      page = 1, 
      limit = 10 
    } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT 
        i.id,
        i.patient_id,
        i.consultation_fee,
        i.medicine_fee,
        i.total_amount,
        i.payment_status,
        i.created_at,
        p.full_name as patient_name,
        p.phone_number
      FROM invoices i
      JOIN patients p ON i.patient_id = p.id
      WHERE 1=1
    `;
    let queryParams = [];
    let paramCount = 0;

    if (patient_id) {
      paramCount++;
      query += ` AND i.patient_id = $${paramCount}`;
      queryParams.push(patient_id);
    }

    if (payment_status) {
      paramCount++;
      query += ` AND i.payment_status = $${paramCount}`;
      queryParams.push(payment_status);
    }

    if (start_date) {
      paramCount++;
      query += ` AND DATE(i.created_at) >= $${paramCount}`;
      queryParams.push(start_date);
    }

    if (end_date) {
      paramCount++;
      query += ` AND DATE(i.created_at) <= $${paramCount}`;
      queryParams.push(end_date);
    }

    query += ` ORDER BY i.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    queryParams.push(parseInt(limit), offset);

    const result = await pool.query(query, queryParams);

    
    let countQuery = `
      SELECT COUNT(*) 
      FROM invoices i
      JOIN patients p ON i.patient_id = p.id
      WHERE 1=1
    `;
    let countParams = [];
    let countParamCount = 0;

    if (patient_id) {
      countParamCount++;
      countQuery += ` AND i.patient_id = $${countParamCount}`;
      countParams.push(patient_id);
    }

    if (payment_status) {
      countParamCount++;
      countQuery += ` AND i.payment_status = $${countParamCount}`;
      countParams.push(payment_status);
    }

    if (start_date) {
      countParamCount++;
      countQuery += ` AND DATE(i.created_at) >= $${countParamCount}`;
      countParams.push(start_date);
    }

    if (end_date) {
      countParamCount++;
      countQuery += ` AND DATE(i.created_at) <= $${countParamCount}`;
      countParams.push(end_date);
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
    console.error('Get invoices error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching invoices'
    });
  }
});

module.exports = router;
