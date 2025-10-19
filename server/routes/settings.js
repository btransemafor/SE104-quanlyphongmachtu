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
    const result = await pool.query(
      'SELECT setting_key, setting_value, description FROM system_settings ORDER BY setting_key'
    );

    const settings = {};
    result.rows.forEach(row => {
      settings[row.setting_key] = {
        value: row.setting_value,
        description: row.description
      };
    });

    res.json({
      success: true,
      data: settings
    });

  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching settings'
    });
  }
});




router.put('/', [
  authenticateToken,
  authorizeRoles('admin'),
  body('max_patients_per_day').optional().isInt({ min: 1, max: 1000 }).withMessage('Max patients per day must be between 1 and 1000'),
  body('consultation_fee').optional().isFloat({ min: 0 }).withMessage('Consultation fee must be a positive number')
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

    const { max_patients_per_day, consultation_fee } = req.body;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      if (max_patients_per_day !== undefined) {
        await client.query(
          `UPDATE system_settings 
           SET setting_value = $1, updated_at = CURRENT_TIMESTAMP 
           WHERE setting_key = 'max_patients_per_day'`,
          [max_patients_per_day.toString()]
        );
      }

      if (consultation_fee !== undefined) {
        await client.query(
          `UPDATE system_settings 
           SET setting_value = $1, updated_at = CURRENT_TIMESTAMP 
           WHERE setting_key = 'consultation_fee'`,
          [consultation_fee.toString()]
        );
      }

      await client.query('COMMIT');

      res.json({
        success: true,
        message: 'Settings updated successfully'
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating settings'
    });
  }
});




router.get('/:key', authenticateToken, async (req, res) => {
  try {
    const { key } = req.params;

    const result = await pool.query(
      'SELECT setting_value, description FROM system_settings WHERE setting_key = $1',
      [key]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Setting not found'
      });
    }

    res.json({
      success: true,
      data: {
        key,
        value: result.rows[0].setting_value,
        description: result.rows[0].description
      }
    });

  } catch (error) {
    console.error('Get setting error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching setting'
    });
  }
});




router.put('/:key', [
  authenticateToken,
  authorizeRoles('admin'),
  body('value').notEmpty().withMessage('Value is required')
], async (req, res) => {
  try {
    const { key } = req.params;
    const { value } = req.body;

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    
    const result = await pool.query(
      'UPDATE system_settings SET setting_value = $1, updated_at = CURRENT_TIMESTAMP WHERE setting_key = $2 RETURNING *',
      [value, key]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Setting not found'
      });
    }

    res.json({
      success: true,
      message: 'Setting updated successfully',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Update setting error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating setting'
    });
  }
});

module.exports = router;
