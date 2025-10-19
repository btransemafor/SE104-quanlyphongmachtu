const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();




router.get('/', authenticateToken, async (req, res) => {
  try {
    const { active_only = true } = req.query;

    let query = 'SELECT id, name, is_active, created_at FROM units WHERE 1=1';
    let queryParams = [];
    let paramCount = 0;

    if (active_only === 'true') {
      paramCount++;
      query += ` AND is_active = $${paramCount}`;
      queryParams.push(true);
    }

    query += ' ORDER BY name ASC';

    const result = await pool.query(query, queryParams);

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Get units error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching units'
    });
  }
});




router.post('/', [
  authenticateToken,
  authorizeRoles('admin'),
  body('name').notEmpty().withMessage('Unit name is required')
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

    const { name } = req.body;

    
    const existingUnit = await pool.query(
      'SELECT id FROM units WHERE name = $1',
      [name]
    );

    if (existingUnit.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Unit with this name already exists'
      });
    }

    const result = await pool.query(
      `INSERT INTO units (name)
       VALUES ($1)
       RETURNING *`,
      [name]
    );

    res.status(201).json({
      success: true,
      message: 'Unit created successfully',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Create unit error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating unit'
    });
  }
});




router.put('/:id', [
  authenticateToken,
  authorizeRoles('admin'),
  body('name').optional().notEmpty().withMessage('Unit name cannot be empty'),
  body('is_active').optional().isBoolean().withMessage('is_active must be a boolean')
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
    const { name, is_active } = req.body;

    
    const existingUnit = await pool.query(
      'SELECT id FROM units WHERE id = $1',
      [id]
    );

    if (existingUnit.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Unit not found'
      });
    }

    
    if (name) {
      const duplicateCheck = await pool.query(
        'SELECT id FROM units WHERE name = $1 AND id != $2',
        [name, id]
      );

      if (duplicateCheck.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Unit with this name already exists'
        });
      }
    }

    const result = await pool.query(
      `UPDATE units 
       SET name = COALESCE($1, name),
           is_active = COALESCE($2, is_active)
       WHERE id = $3
       RETURNING *`,
      [name, is_active, id]
    );

    res.json({
      success: true,
      message: 'Unit updated successfully',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Update unit error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating unit'
    });
  }
});




router.delete('/:id', [
  authenticateToken,
  authorizeRoles('admin')
], async (req, res) => {
  try {
    const { id } = req.params;

    
    const existingUnit = await pool.query(
      'SELECT id FROM units WHERE id = $1',
      [id]
    );

    if (existingUnit.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Unit not found'
      });
    }

    
    await pool.query(
      'UPDATE units SET is_active = false WHERE id = $1',
      [id]
    );

    res.json({
      success: true,
      message: 'Unit deleted successfully'
    });

  } catch (error) {
    console.error('Delete unit error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting unit'
    });
  }
});

module.exports = router;
