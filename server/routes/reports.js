const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();




router.get('/revenue', [
  authenticateToken,
  authorizeRoles('admin')
], async (req, res) => {
  try {
    const { month, year } = req.query;

    if (!month || !year) {
      return res.status(400).json({
        success: false,
        message: 'Month and year are required'
      });
    }

    
    const dailyRevenue = await pool.query(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as patient_count,
        SUM(consultation_fee) as total_consultation_fee,
        SUM(medicine_fee) as total_medicine_fee,
        SUM(total_amount) as total_revenue
      FROM invoices 
      WHERE EXTRACT(MONTH FROM created_at) = $1 
        AND EXTRACT(YEAR FROM created_at) = $2
        AND payment_status = 'paid'
      GROUP BY DATE(created_at)
      ORDER BY DATE(created_at)
    `, [month, year]);

    
    const monthlySummary = await pool.query(`
      SELECT 
        COUNT(*) as total_patients,
        SUM(consultation_fee) as total_consultation_fee,
        SUM(medicine_fee) as total_medicine_fee,
        SUM(total_amount) as total_revenue,
        AVG(total_amount) as average_revenue_per_patient
      FROM invoices 
      WHERE EXTRACT(MONTH FROM created_at) = $1 
        AND EXTRACT(YEAR FROM created_at) = $2
        AND payment_status = 'paid'
    `, [month, year]);

    res.json({
      success: true,
      data: {
        daily_revenue: dailyRevenue.rows,
        monthly_summary: monthlySummary.rows[0] || {
          total_patients: 0,
          total_consultation_fee: 0,
          total_medicine_fee: 0,
          total_revenue: 0,
          average_revenue_per_patient: 0
        }
      }
    });

  } catch (error) {
    console.error('Get revenue report error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while generating revenue report'
    });
  }
});




router.get('/medicine-usage', [
  authenticateToken,
  authorizeRoles('admin')
], async (req, res) => {
  try {
    const { month, year } = req.query;

    if (!month || !year) {
      return res.status(400).json({
        success: false,
        message: 'Month and year are required'
      });
    }

    
    const medicineUsage = await pool.query(`
      SELECT 
        m.name as medicine_name,
        m.unit,
        SUM(pd.quantity) as total_quantity_used,
        COUNT(DISTINCT pd.medical_record_id) as prescription_count,
        ROUND(AVG(pd.quantity), 2) as average_quantity_per_prescription,
        SUM(pd.quantity * m.price) as total_value
      FROM prescription_details pd
      JOIN medicines m ON pd.medicine_id = m.id
      JOIN medical_records mr ON pd.medical_record_id = mr.id
      WHERE EXTRACT(MONTH FROM mr.created_at) = $1 
        AND EXTRACT(YEAR FROM mr.created_at) = $2
      GROUP BY m.id, m.name, m.unit
      ORDER BY total_quantity_used DESC
    `, [month, year]);

    
    const summary = await pool.query(`
      SELECT 
        COUNT(DISTINCT m.id) as unique_medicines_used,
        SUM(pd.quantity) as total_medicines_dispensed,
        SUM(pd.quantity * m.price) as total_medicine_value,
        COUNT(DISTINCT pd.medical_record_id) as total_prescriptions
      FROM prescription_details pd
      JOIN medicines m ON pd.medicine_id = m.id
      JOIN medical_records mr ON pd.medical_record_id = mr.id
      WHERE EXTRACT(MONTH FROM mr.created_at) = $1 
        AND EXTRACT(YEAR FROM mr.created_at) = $2
    `, [month, year]);

    res.json({
      success: true,
      data: {
        medicine_usage: medicineUsage.rows,
        summary: summary.rows[0] || {
          unique_medicines_used: 0,
          total_medicines_dispensed: 0,
          total_medicine_value: 0,
          total_prescriptions: 0
        }
      }
    });

  } catch (error) {
    console.error('Get medicine usage report error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while generating medicine usage report'
    });
  }
});




router.get('/patient-stats', [
  authenticateToken,
  authorizeRoles('admin')
], async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    console.log('Patient stats request:', { start_date, end_date });

    
    const checkData = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM daily_appointments) as total_appointments,
        (SELECT COUNT(*) FROM patients) as total_patients
    `);
    
    console.log('Data check result:', checkData.rows[0]);

    let dateFilter = '';
    let queryParams = [];

    if (start_date && end_date) {
      dateFilter = `WHERE DATE(da.appointment_date) BETWEEN $1 AND $2`;
      queryParams = [start_date, end_date];
    }

    
    const patientStats = await pool.query(`
      SELECT 
        COUNT(DISTINCT da.patient_id) as total_patients,
        COUNT(*) as total_appointments,
        COUNT(CASE WHEN da.status = 'completed' THEN 1 END) as completed_appointments,
        COUNT(CASE WHEN da.status = 'waiting' THEN 1 END) as waiting_appointments,
        COUNT(CASE WHEN da.status = 'examined' THEN 1 END) as examined_appointments,
        COUNT(CASE WHEN p.gender = 'Nam' THEN 1 END) as male_patients,
        COUNT(CASE WHEN p.gender = 'Nữ' THEN 1 END) as female_patients
      FROM daily_appointments da
      LEFT JOIN patients p ON da.patient_id = p.id
      ${dateFilter}
    `, queryParams);

    console.log('Patient stats result:', patientStats.rows[0]);

    
    let ageGroupStats = { rows: [] };
    if (patientStats.rows[0] && patientStats.rows[0].total_patients > 0) {
      try {
        ageGroupStats = await pool.query(`
          WITH age_groups AS (
            SELECT 
              da.patient_id,
              CASE 
                WHEN p.birth_year IS NULL THEN 'Unknown'
                WHEN EXTRACT(YEAR FROM CURRENT_DATE) - p.birth_year < 18 THEN 'Under 18'
                WHEN EXTRACT(YEAR FROM CURRENT_DATE) - p.birth_year BETWEEN 18 AND 30 THEN '18-30'
                WHEN EXTRACT(YEAR FROM CURRENT_DATE) - p.birth_year BETWEEN 31 AND 50 THEN '31-50'
                WHEN EXTRACT(YEAR FROM CURRENT_DATE) - p.birth_year BETWEEN 51 AND 70 THEN '51-70'
                ELSE 'Over 70'
              END as age_group
            FROM daily_appointments da
            LEFT JOIN patients p ON da.patient_id = p.id
            ${dateFilter}
          )
          SELECT 
            age_group,
            COUNT(DISTINCT patient_id) as patient_count
          FROM age_groups
          GROUP BY age_group
          ORDER BY 
            CASE age_group
              WHEN 'Under 18' THEN 1
              WHEN '18-30' THEN 2
              WHEN '31-50' THEN 3
              WHEN '51-70' THEN 4
              WHEN 'Over 70' THEN 5
              WHEN 'Unknown' THEN 6
            END
        `, queryParams);
        
        console.log('Age group stats result:', ageGroupStats.rows);
      } catch (ageError) {
        console.error('Age group stats error:', ageError);
        
      }
    }

    res.json({
      success: true,
      data: {
        patient_statistics: patientStats.rows[0] || {
          total_patients: 0,
          total_appointments: 0,
          completed_appointments: 0,
          waiting_appointments: 0,
          examined_appointments: 0,
          male_patients: 0,
          female_patients: 0
        },
        age_group_statistics: ageGroupStats.rows || []
      }
    });

  } catch (error) {
    console.error('Get patient stats error:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      hint: error.hint,
      position: error.position,
      where: error.where
    });
    
    res.status(500).json({
      success: false,
      message: 'Server error while generating patient statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});




router.get('/dashboard', authenticateToken, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    
    const todayStats = await pool.query(`
      SELECT 
        COUNT(*) as total_appointments,
        COUNT(CASE WHEN status = 'waiting' THEN 1 END) as waiting_count,
        COUNT(CASE WHEN status = 'examined' THEN 1 END) as examined_count,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_count
      FROM daily_appointments 
      WHERE appointment_date = $1
    `, [today]);

    
    const todayRevenue = await pool.query(`
      SELECT 
        COUNT(*) as invoices_count,
        SUM(total_amount) as total_revenue
      FROM invoices 
      WHERE DATE(created_at) = $1 AND payment_status = 'paid'
    `, [today]);

    
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    const monthlyRevenue = await pool.query(`
      SELECT 
        COUNT(*) as invoices_count,
        SUM(total_amount) as total_revenue
      FROM invoices 
      WHERE EXTRACT(MONTH FROM created_at) = $1 
        AND EXTRACT(YEAR FROM created_at) = $2
        AND payment_status = 'paid'
    `, [currentMonth, currentYear]);

    res.json({
      success: true,
      data: {
        today: {
          appointments: todayStats.rows[0] || {
            total_appointments: 0,
            waiting_count: 0,
            examined_count: 0,
            completed_count: 0
          },
          revenue: todayRevenue.rows[0] || {
            invoices_count: 0,
            total_revenue: 0
          }
        },
        monthly: {
          revenue: monthlyRevenue.rows[0] || {
            invoices_count: 0,
            total_revenue: 0
          }
        }
      }
    });

  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while generating dashboard statistics'
    });
  }
});

module.exports = router;
