const express = require("express");
const { body, validationResult } = require("express-validator");
const pool = require("../config/database");
const { authenticateToken, authorizeRoles } = require("../middleware/auth");

const router = express.Router();

/* -------------------------------------------------------------------------- */
/*                                GET /records                                */
/* -------------------------------------------------------------------------- */
router.get("/", [authenticateToken, authorizeRoles("admin")], async (req, res) => {
  try {
    console.log("Fetching medical records...");

    //  Count total records
    const { rows: totalResult } = await pool.query("SELECT COUNT(*) AS total FROM medical_records");
    console.log("Total medical records:", totalResult[0].total);

    //  Fetch records with basic info
    const { rows: records } = await pool.query(`
      SELECT 
        mr.id,
        mr.patient_id,
        COALESCE(p.full_name, 'Unknown Patient') AS patient_name,
        mr.symptoms,
        mr.diagnosis,
        COALESCE(mr.status, 'pending') AS status,
        mr.created_at,
        COALESCE(d.name, 'Unknown Disease') AS disease_name,
        COALESCE(u.username, 'Unknown Doctor') AS doctor_name
      FROM medical_records mr
      LEFT JOIN patients p ON mr.patient_id = p.id
      LEFT JOIN diseases d ON mr.disease_id = d.id
      LEFT JOIN users u ON mr.doctor_id = u.id
      ORDER BY mr.created_at DESC
      LIMIT 100
    `);

    //  Attach prescriptions for each record
    const recordsWithPrescriptions = await Promise.all(
      records.map(async (record) => {
        const { rows: prescriptions } = await pool.query(`
          SELECT 
            pd.quantity,
            COALESCE(m.name, 'Unknown Medicine') AS medicine_name,
            COALESCE(m.unit, 'Unknown Unit') AS unit,
            COALESCE(um.name, 'Unknown Usage') AS usage_method
          FROM prescription_details pd
          LEFT JOIN medicines m ON pd.medicine_id = m.id
          LEFT JOIN usage_methods um ON pd.usage_method_id = um.id
          WHERE pd.medical_record_id = $1
        `, [record.id]);

        return { ...record, prescriptions };
      })
    );

    res.json({
      success: true,
      data: recordsWithPrescriptions,
      pagination: {
        current: 1,
        pageSize: 100,
        total: recordsWithPrescriptions.length,
        pages: 1,
      },
    });
  } catch (error) {
    console.error(" Get medical records error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching medical records",
    });
  }
});

/* -------------------------------------------------------------------------- */
/*                               POST /records                                */
/* -------------------------------------------------------------------------- */
router.post(
  "/",
  [
    authenticateToken,
    authorizeRoles("doctor", "admin"),
    body("patient_id").isInt().withMessage("Patient ID must be a number"),
    body("symptoms").notEmpty().withMessage("Symptoms are required"),
    body("disease_id").optional().isInt(),
    body("diagnosis").optional().isString(),
    body("prescriptions").optional().isArray(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation errors",
        errors: errors.array(),
      });
    }

    const { patient_id, symptoms, disease_id, diagnosis, total_amount, prescriptions = [] } = req.body;

    const client = await pool.connect();

    try {
      //  Validation logic
      const patient = await client.query("SELECT id FROM patients WHERE id = $1", [patient_id]);
      if (!patient.rowCount)
        return res.status(404).json({ success: false, message: "Patient not found" });

      if (disease_id) {
        const disease = await client.query(
          "SELECT id FROM diseases WHERE id = $1 AND is_active = true",
          [disease_id]
        );
        if (!disease.rowCount)
          return res.status(400).json({ success: false, message: "Disease not found or inactive" });
      }

      for (const p of prescriptions) {
        if (!p.medicine_id || !p.quantity || !p.usage_method_id)
          return res.status(400).json({
            success: false,
            message: "Each prescription must have medicine_id, quantity, and usage_method_id",
          });
      }

      await client.query("BEGIN");

      //  Create medical record
      const status = diagnosis?.trim() ? "completed" : "pending";
      const { rows: [medicalRecord] } = await client.query(
        `INSERT INTO medical_records 
         (patient_id, doctor_id, symptoms, disease_id, diagnosis, status, total_amount)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [patient_id, req.user.id, symptoms, disease_id, diagnosis, status, total_amount]
      );

      //  Insert prescriptions + update stock
      for (const p of prescriptions) {
        await client.query(
          `INSERT INTO prescription_details 
           (medical_record_id, medicine_id, quantity, usage_method_id, sell_price)
           VALUES ($1, $2, $3, $4, $5)`,
          [medicalRecord.id, p.medicine_id, p.quantity, p.usage_method_id, p.sell_price]
        );

        //  Deduct stock (FEFO)
        let remaining = p.quantity;
        const { rows: batches } = await client.query(`
          SELECT b.id, b.remaining_quantity
          FROM batches b
          JOIN import_receipts ir ON ir.id = b.import_receipt_id
          WHERE b.medicine_id = $1 AND b.remaining_quantity > 0
          ORDER BY b.expiry_date ASC NULLS LAST, ir.receipt_date ASC
        `, [p.medicine_id]);

        for (const batch of batches) {
          if (remaining <= 0) break;
          const deduct = Math.min(batch.remaining_quantity, remaining);
          await client.query(`UPDATE batches SET remaining_quantity = remaining_quantity - $1 WHERE id = $2`, [deduct, batch.id]);
          remaining -= deduct;
        }

        if (remaining > 0)
          throw new Error(`Not enough stock for medicine ID ${p.medicine_id}`);

        await client.query(`
          UPDATE medicines
          SET quantity = (SELECT COALESCE(SUM(remaining_quantity), 0) FROM batches WHERE medicine_id = $1)
          WHERE id = $1
        `, [p.medicine_id]);
      }

      //  Update appointment status
      await client.query(`
        UPDATE daily_appointments 
        SET status = 'examined', medical_record_id = $1, updated_at = CURRENT_TIMESTAMP
        WHERE patient_id = $2 AND appointment_date = CURRENT_DATE AND status = 'waiting'
      `, [medicalRecord.id, patient_id]);

      await client.query("COMMIT");

      //  Return complete record
      const { rows: completeRecord } = await pool.query(`
        SELECT 
          mr.*, p.full_name AS patient_name, p.phone_number,
          d.name AS disease_name, u.username AS doctor_name,
          pd.id AS prescription_id, pd.quantity, pd.usage_method_id,
          m.name AS medicine_name, un.name AS medicine_unit,
          pd.sell_price AS medicine_price, um.name AS usage_method_name
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
        message: "Medical record created successfully",
        data: completeRecord,
      });
    } catch (error) {
      await client.query("ROLLBACK");
      console.error(" Create medical record error:", error);
      res.status(500).json({
        success: false,
        message: "Server error while creating medical record",
      });
    } finally {
      client.release();
    }
  }
);

/* -------------------------------------------------------------------------- */
/*                              GET /records/:id                              */
/* -------------------------------------------------------------------------- */
router.get("/:id", [authenticateToken, authorizeRoles("doctor", "admin")], async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query(`
      SELECT 
        mr.*, p.full_name AS patient_name, p.phone_number,
        d.name AS disease_name, u.username AS doctor_name,
        pd.id AS prescription_id, pd.quantity, pd.usage_method_id,
        m.name AS medicine_name, un.name AS medicine_unit,
        m.price AS medicine_price, um.name AS usage_method_name
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

    if (!rows.length) {
      return res.status(404).json({ success: false, message: "Medical record not found" });
    }

    const record = rows[0];
    const prescriptions = rows
      .filter((r) => r.prescription_id)
      .map((r) => ({
        id: r.prescription_id,
        medicine_id: r.medicine_id,
        medicine_name: r.medicine_name,
        unit: r.medicine_unit,
        price: r.medicine_price,
        quantity: r.quantity,
        usage_method_id: r.usage_method_id,
        usage_method_name: r.usage_method_name,
      }));

    res.json({ success: true, data: { ...record, prescriptions } });
  } catch (error) {
    console.error("❌ Get medical record error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching medical record",
    });
  }
});

/* -------------------------------------------------------------------------- */
/*                       GET /records/patient/:patientId                      */
/* -------------------------------------------------------------------------- */
router.get("/patient/:patientId", [authenticateToken, authorizeRoles("doctor", "admin")], async (req, res) => {
  try {
    const { patientId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const { rows } = await pool.query(`
      SELECT 
        mr.id, mr.symptoms, mr.diagnosis, mr.created_at,
        d.name AS disease_name, u.username AS doctor_name
      FROM medical_records mr
      LEFT JOIN diseases d ON mr.disease_id = d.id
      LEFT JOIN users u ON mr.doctor_id = u.id
      WHERE mr.patient_id = $1
      ORDER BY mr.created_at DESC
      LIMIT $2 OFFSET $3
    `, [patientId, parseInt(limit), offset]);

    const { rows: countRows } = await pool.query(
      "SELECT COUNT(*) FROM medical_records WHERE patient_id = $1",
      [patientId]
    );

    const total = parseInt(countRows[0].count);

    res.json({
      success: true,
      data: rows,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: parseInt(limit),
      },
    });
  } catch (error) {
    console.error("Get patient records error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching patient medical records",
    });
  }
});

module.exports = router;
