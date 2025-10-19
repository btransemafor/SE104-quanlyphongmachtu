const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();




router.get('/daily', authenticateToken, async (req, res) => {
  try {
    const { date = new Date().toISOString().split('T')[0] } = req.query;

    const result = await pool.query(`
      SELECT 
        da.id,
        da.patient_id,
        da.status,
        da.created_at,
        p.full_name,
        p.gender,
        p.birth_year,
        p.phone_number,
        mr.id as medical_record_id,
        mr.symptoms,
        mr.diagnosis,
        d.name as disease_name,
        u.username as doctor_name
      FROM daily_appointments da
      JOIN patients p ON da.patient_id = p.id
      LEFT JOIN medical_records mr ON da.medical_record_id = mr.id
      LEFT JOIN diseases d ON mr.disease_id = d.id
      LEFT JOIN users u ON mr.doctor_id = u.id
      WHERE da.appointment_date = $1
      ORDER BY da.created_at ASC
    `, [date]);

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Get daily appointments error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching daily appointments'
    });
  }
});




router.post('/', [
  authenticateToken,
  authorizeRoles('receptionist', 'admin'),
  body('patient_id').isInt().withMessage('Patient ID must be a number'),
  body('appointment_date').optional().isISO8601().withMessage('Invalid date format')
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

    const { patient_id, appointment_date = new Date().toISOString().split('T')[0] } = req.body;

    
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

    
    const existingAppointment = await pool.query(
      'SELECT id FROM daily_appointments WHERE patient_id = $1 AND appointment_date = $2',
      [patient_id, appointment_date]
    );

    if (existingAppointment.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Patient is already in today\'s appointment list'
      });
    }

    
    const settingsResult = await pool.query(
      'SELECT setting_value FROM system_settings WHERE setting_key = $1',
      ['max_patients_per_day']
    );

    const maxPatients = settingsResult.rows.length > 0 ? 
      parseInt(settingsResult.rows[0].setting_value) : 50;

    const todayAppointmentsCount = await pool.query(
      'SELECT COUNT(*) FROM daily_appointments WHERE appointment_date = $1',
      [appointment_date]
    );

    if (parseInt(todayAppointmentsCount.rows[0].count) >= maxPatients) {
      return res.status(400).json({
        success: false,
        message: `Daily patient limit reached (${maxPatients} patients)`
      });
    }

    
    const result = await pool.query(
      `INSERT INTO daily_appointments (patient_id, appointment_date, status)
       VALUES ($1, $2, 'waiting')
       RETURNING *`,
      [patient_id, appointment_date]
    );

    res.status(201).json({
      success: true,
      message: 'Patient added to appointment list successfully',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Add appointment error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while adding appointment'
    });
  }
});




router.put('/:id/status', [
  authenticateToken,
  body('status').isIn(['waiting', 'examined', 'completed']).withMessage('Invalid status')
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
    const { status } = req.body;

    
    const existingAppointment = await pool.query(
      'SELECT id FROM daily_appointments WHERE id = $1',
      [id]
    );

    if (existingAppointment.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    
    const result = await pool.query(
      `UPDATE daily_appointments 
       SET status = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [status, id]
    );

    res.json({
      success: true,
      message: 'Appointment status updated successfully',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Update appointment status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating appointment status'
    });
  }
});




router.delete('/:id', [
  authenticateToken,
  authorizeRoles('receptionist', 'admin')
], async (req, res) => {
  try {
    const { id } = req.params;

    
    const existingAppointment = await pool.query(
      'SELECT id, status FROM daily_appointments WHERE id = $1',
      [id]
    );

    if (existingAppointment.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    
    if (existingAppointment.rows[0].status !== 'waiting') {
      return res.status(400).json({
        success: false,
        message: 'Cannot remove appointment that is not in waiting status'
      });
    }

    
    await pool.query('DELETE FROM daily_appointments WHERE id = $1', [id]);

    res.json({
      success: true,
      message: 'Appointment removed successfully'
    });

  } catch (error) {
    console.error('Remove appointment error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while removing appointment'
    });
  }
});




router.get('/stats', [
  authenticateToken
], async (req, res) => {
  try {
    const { date = new Date().toISOString().split('T')[0] } = req.query;

    
    const todayStats = await pool.query(`
      SELECT 
        COUNT(*) as total_appointments,
        COUNT(CASE WHEN status = 'waiting' THEN 1 END) as waiting_count,
        COUNT(CASE WHEN status = 'examined' THEN 1 END) as examined_count,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_count
      FROM daily_appointments 
      WHERE appointment_date = $1
    `, [date]);

    
    const monthStart = new Date(date);
    monthStart.setDate(1);
    const monthEnd = new Date(date);
    monthEnd.setMonth(monthEnd.getMonth() + 1);
    monthEnd.setDate(0);

    const monthlyStats = await pool.query(`
      SELECT 
        COUNT(*) as total_appointments,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_count
      FROM daily_appointments 
      WHERE appointment_date >= $1 AND appointment_date <= $2
    `, [monthStart.toISOString().split('T')[0], monthEnd.toISOString().split('T')[0]]);

    res.json({
      success: true,
      data: {
        today: todayStats.rows[0],
        monthly: monthlyStats.rows[0]
      }
    });

  } catch (error) {
    console.error('Get appointment stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching appointment statistics'
    });
  }
});

module.exports = router;
