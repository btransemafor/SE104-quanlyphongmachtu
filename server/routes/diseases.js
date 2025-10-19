const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();




router.get('/', authenticateToken, async (req, res) => {
  try {
    const { search, page = 1, limit = 10, active_only = true } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT id, name, description, is_active, created_at, updated_at
      FROM diseases 
      WHERE 1=1
    `;
    let queryParams = [];
    let paramCount = 0;

    if (active_only === 'true') {
      paramCount++;
      query += ` AND is_active = $${paramCount}`;
      queryParams.push(true);
    }

    if (search) {
      paramCount++;
      query += ` AND name ILIKE $${paramCount}`;
      queryParams.push(`%${search}%`);
    }

    query += ` ORDER BY name ASC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    queryParams.push(parseInt(limit), offset);

    const result = await pool.query(query, queryParams);

    
    let countQuery = 'SELECT COUNT(*) FROM diseases WHERE 1=1';
    let countParams = [];
    let countParamCount = 0;

    if (active_only === 'true') {
      countParamCount++;
      countQuery += ` AND is_active = $${countParamCount}`;
      countParams.push(true);
    }

    if (search) {
      countParamCount++;
      countQuery += ` AND name ILIKE $${countParamCount}`;
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
    console.error('Get diseases error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching diseases'
    });
  }
});




router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'SELECT * FROM diseases WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Disease not found'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Get disease error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching disease'
    });
  }
});




router.post('/', [
  authenticateToken,
  authorizeRoles('admin'),
  body('name').notEmpty().withMessage('Disease name is required'),
  body('description').optional().isString()
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

    const { name, description } = req.body;

    
    const existingDisease = await pool.query(
      'SELECT id FROM diseases WHERE name = $1',
      [name]
    );

    if (existingDisease.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Disease with this name already exists'
      });
    }

    const result = await pool.query(
      `INSERT INTO diseases (name, description)
       VALUES ($1, $2)
       RETURNING *`,
      [name, description]
    );

    res.status(201).json({
      success: true,
      message: 'Disease created successfully',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Create disease error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating disease'
    });
  }
});




router.put('/:id', [
  authenticateToken,
  authorizeRoles('admin'),
  body('name').optional().notEmpty().withMessage('Disease name cannot be empty'),
  body('description').optional().isString(),
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
    const { name, description, is_active } = req.body;

    
    const existingDisease = await pool.query(
      'SELECT id FROM diseases WHERE id = $1',
      [id]
    );

    if (existingDisease.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Disease not found'
      });
    }

    
    if (name) {
      const duplicateCheck = await pool.query(
        'SELECT id FROM diseases WHERE name = $1 AND id != $2',
        [name, id]
      );

      if (duplicateCheck.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Disease with this name already exists'
        });
      }
    }

    const result = await pool.query(
      `UPDATE diseases 
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           is_active = COALESCE($3, is_active),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING *`,
      [name, description, is_active, id]
    );

    res.json({
      success: true,
      message: 'Disease updated successfully',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Update disease error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating disease'
    });
  }
});




router.delete('/:id', [
  authenticateToken,
  authorizeRoles('admin')
], async (req, res) => {
  try {
    const { id } = req.params;

    
    const existingDisease = await pool.query(
      'SELECT id FROM diseases WHERE id = $1',
      [id]
    );

    if (existingDisease.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Disease not found'
      });
    }

    
    await pool.query(
      'UPDATE diseases SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [id]
    );

    res.json({
      success: true,
      message: 'Disease deleted successfully'
    });

  } catch (error) {
    console.error('Delete disease error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting disease'
    });
  }
});

module.exports = router;
