const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();




router.get('/', [
  authenticateToken,
  authorizeRoles('admin')
], async (req, res) => {
  try {
    console.log('Medical records API called');
    
    
    const checkQuery = `
      SELECT COUNT(*) as total
      FROM medical_records
    `;
    
    const checkResult = await pool.query(checkQuery);
    console.log('Total medical records:', checkResult.rows[0].total);

    
    const recordsQuery = `
      SELECT 
        mr.id,
        mr.patient_id,
        COALESCE(p.full_name, 'Unknown Patient') as patient_name,
        mr.symptoms,
        mr.diagnosis,
        COALESCE(mr.status, 'pending') as status,
        mr.created_at,
        COALESCE(d.name, 'Unknown Disease') as disease_name,
        COALESCE(u.username, 'Unknown Doctor') as doctor_name,
        COALESCE(u.username, 'Unknown Doctor') as doctor_full_name
      FROM medical_records mr
      LEFT JOIN patients p ON mr.patient_id = p.id
      LEFT JOIN diseases d ON mr.disease_id = d.id
      LEFT JOIN users u ON mr.doctor_id = u.id
      ORDER BY mr.created_at DESC
      LIMIT 100
    `;

    const recordsResult = await pool.query(recordsQuery);
    console.log('Records found:', recordsResult.rows.length);

    
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
            prescriptions: prescriptionsResult.rows || []
          };
        } catch (prescriptionError) {
          console.error('Error fetching prescriptions for record', record.id, prescriptionError);
          return {
            ...record,
            prescriptions: []
          };
        }
      })
    );

    res.json({
      success: true,
      data: recordsWithPrescriptions,
      pagination: {
        current: 1,
        pageSize: 100,
        total: recordsWithPrescriptions.length,
        pages: 1
      }
    });

  } catch (error) {
    console.error('Get medical records error:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      detail: error.detail
    });
    
    res.status(500).json({
      success: false,
      message: 'Server error while fetching medical records',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});




router.post('/', [
  authenticateToken,
  authorizeRoles('doctor', 'admin'),
  body('patient_id').isInt().withMessage('Patient ID must be a number'),
  body('symptoms').notEmpty().withMessage('Symptoms are required'),
  body('disease_id').optional().isInt().withMessage('Disease ID must be a number'),
  body('diagnosis').optional().isString(),
  body('prescriptions').optional().isArray().withMessage('Prescriptions must be an array')
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

    const { patient_id, symptoms, disease_id, diagnosis, total_amount, prescriptions = [] } = req.body;

    
    const patientResult = await pool.query(
      'SELECT id FROM patients WHERE id = $1',
      [patient_id]
    );

    if (patientResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    
    if (disease_id) {
      const diseaseResult = await pool.query(
        'SELECT id FROM diseases WHERE id = $1 AND is_active = true',
        [disease_id]
      );

      if (diseaseResult.rows.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Disease not found or inactive'
        });
      }
    }

    
    for (const prescription of prescriptions) {
      if (!prescription.medicine_id || !prescription.quantity || !prescription.usage_method_id) {
        return res.status(400).json({
          success: false,
          message: 'Each prescription must have medicine_id, quantity, and usage_method_id'
        });
      }

      
      const medicineResult = await pool.query(
        'SELECT id FROM medicines WHERE id = $1 AND is_active = true',
        [prescription.medicine_id]
      );

      if (medicineResult.rows.length === 0) {
        return res.status(400).json({
          success: false,
          message: `Medicine with ID ${prescription.medicine_id} not found or inactive`
        });
      }

      
      const usageMethodResult = await pool.query(
        'SELECT id FROM usage_methods WHERE id = $1 AND is_active = true',
        [prescription.usage_method_id]
      );

      if (usageMethodResult.rows.length === 0) {
        return res.status(400).json({
          success: false,
          message: `Usage method with ID ${prescription.usage_method_id} not found or inactive`
        });
      }
    }

    
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      
      const status = diagnosis && diagnosis.trim() ? 'completed' : 'pending';

      
      const medicalRecordResult = await client.query(
        `INSERT INTO medical_records (patient_id, doctor_id, symptoms, disease_id, diagnosis, status, total_amount)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [patient_id, req.user.id, symptoms, disease_id, diagnosis, status, total_amount]
      );

      const medicalRecord = medicalRecordResult.rows[0];

      
      for (const prescription of prescriptions) {
        await client.query(
          `INSERT INTO prescription_details (medical_record_id, medicine_id, quantity, usage_method_id, sell_price)
           VALUES ($1, $2, $3, $4, $5)`,
          [medicalRecord.id, prescription.medicine_id, prescription.quantity, prescription.usage_method_id, prescription.sell_price]
        );
      }

      
      await client.query(
        `UPDATE daily_appointments 
         SET status = 'examined', medical_record_id = $1, updated_at = CURRENT_TIMESTAMP
         WHERE patient_id = $2 AND appointment_date = CURRENT_DATE AND status = 'waiting'`,
        [medicalRecord.id, patient_id]
      );

      await client.query('COMMIT');

      
      const completeRecord = await pool.query(`
        SELECT 
          mr.*,
          p.full_name as patient_name,
          p.phone_number,
          d.name as disease_name,
          u.username as doctor_name,
          pd.id as prescription_id,
          pd.quantity,
          pd.usage_method_id,
          m.name as medicine_name,
          un.name as medicine_unit,
          pd.sell_price as medicine_price,
          um.name as usage_method_name
        FROM medical_records mr
        JOIN patients p ON mr.patient_id = p.id
        LEFT JOIN diseases d ON mr.disease_id = d.id
        LEFT JOIN users u ON mr.doctor_id = u.id
        LEFT JOIN prescription_details pd ON mr.id = pd.medical_record_id
        LEFT JOIN medicines m ON pd.medicine_id = m.id
         LEFT JOIN units un ON un.id = m.unit_id
        LEFT JOIN usage_methods um ON pd.usage_method_id = um.id
        WHERE mr.id = $1
        ORDER BY pd.id
      `, [medicalRecord.id]);

      res.status(201).json({
        success: true,
        message: 'Medical record created successfully',
        data: completeRecord.rows
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Create medical record error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating medical record'
    });
  }
});




router.get('/:id', [
  authenticateToken,
  authorizeRoles('doctor', 'admin')
], async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      SELECT 
        mr.*,
        p.full_name as patient_name,
        p.phone_number,
        d.name as disease_name,
        u.username as doctor_name,
        pd.id as prescription_id,
        pd.quantity,
        pd.usage_method_id,
        m.name as medicine_name,
        un.name as medicine_unit,
        m.price as medicine_price,
        um.name as usage_method_name
      FROM medical_records mr
      JOIN patients p ON mr.patient_id = p.id
      LEFT JOIN diseases d ON mr.disease_id = d.id
      LEFT JOIN users u ON mr.doctor_id = u.id
      LEFT JOIN prescription_details pd ON mr.id = pd.medical_record_id
      LEFT JOIN medicines m ON pd.medicine_id = m.id
      LEFT JOIN units un ON un.id = m.unit_id
      LEFT JOIN usage_methods um ON pd.usage_method_id = um.id
      WHERE mr.id = $1
      ORDER BY pd.id
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Medical record not found'
      });
    }

    
    const medicalRecord = {
      id: result.rows[0].id,
      patient_id: result.rows[0].patient_id,
      patient_name: result.rows[0].patient_name,
      phone_number: result.rows[0].phone_number,
      symptoms: result.rows[0].symptoms,
      disease_id: result.rows[0].disease_id,
      disease_name: result.rows[0].disease_name,
      diagnosis: result.rows[0].diagnosis,
      doctor_id: result.rows[0].doctor_id,
      doctor_name: result.rows[0].doctor_name,
      created_at: result.rows[0].created_at,
      prescriptions: result.rows
        .filter(row => row.prescription_id)
        .map(row => ({
          id: row.prescription_id,
          medicine_id: row.medicine_id,
          medicine_name: row.medicine_name,
          unit: row.medicine_unit,
          price: row.medicine_price,
          quantity: row.quantity,
          usage_method_id: row.usage_method_id,
          usage_method_name: row.usage_method_name
        }))
    };

    res.json({
      success: true,
      data: medicalRecord
    });

  } catch (error) {
    console.error('Get medical record error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching medical record'
    });
  }
});




router.get('/patient/:patientId', [
  authenticateToken,
  authorizeRoles('doctor', 'admin')
], async (req, res) => {
  try {
    const { patientId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const result = await pool.query(`
      SELECT 
        mr.id,
        mr.symptoms,
        mr.diagnosis,
        mr.created_at,
        d.name as disease_name,
        u.username as doctor_name
      FROM medical_records mr
      LEFT JOIN diseases d ON mr.disease_id = d.id
      LEFT JOIN users u ON mr.doctor_id = u.id
      WHERE mr.patient_id = $1
      ORDER BY mr.created_at DESC
      LIMIT $2 OFFSET $3
    `, [patientId, parseInt(limit), offset]);

    
    const countResult = await pool.query(
      'SELECT COUNT(*) FROM medical_records WHERE patient_id = $1',
      [patientId]
    );

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
    console.error('Get patient medical records error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching patient medical records'
    });
  }
});

module.exports = router;
