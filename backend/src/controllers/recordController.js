const { query } = require('../db/db');
const logAudit = require('../utils/auditLogger');
const { generateMedicalRecordPDF } = require('../utils/pdfGenerator');
// Get all medical records with role-based scoping
async function getRecords(req, res) {
  const user = req.user;
  const { patientId = '' } = req.query;

  try {
    let sql = `
      SELECT mr.*, 
             p.name as patient_name, p.age as patient_age, p.gender as patient_gender,
             d.name as doctor_name, d.specialty
      FROM medical_records mr
      JOIN patients p ON mr.patient_id = p.id
      JOIN doctors d ON mr.doctor_id = d.id
      WHERE 1=1
    `;
    const params = [];

    // Role-based filtering
    if (user.role === 'Patient') {
      sql += ' AND p.user_id = ?';
      params.push(user.id);
    } else if (user.role === 'Receptionist') {
      return res.status(403).json({ message: 'Access denied: Receptionists cannot access clinical medical records' });
    }

    if (patientId) {
      sql += ' AND mr.patient_id = ?';
      params.push(patientId);
    }

    sql += ' ORDER BY mr.visit_date DESC, mr.created_at DESC';

    const records = await query(sql, params);
    res.status(200).json(records);
  } catch (error) {
    console.error('Get medical records error:', error);
    res.status(500).json({ message: 'Internal server error retrieving medical records' });
  }
}

// Get specific medical record by ID
async function getRecordById(req, res) {
  const { id } = req.params;
  const user = req.user;

  try {
    if (user.role === 'Receptionist') {
      return res.status(403).json({ message: 'Access denied: Receptionists cannot access clinical medical records' });
    }

    const records = await query(
      `SELECT mr.*, 
              p.name as patient_name, p.age as patient_age, p.gender as patient_gender, p.contact_number as patient_contact, p.emergency_contact, p.user_id as patient_user_id,
              d.name as doctor_name, d.specialty
       FROM medical_records mr
       JOIN patients p ON mr.patient_id = p.id
       JOIN doctors d ON mr.doctor_id = d.id
       WHERE mr.id = ?`,
      [id]
    );

    if (records.length === 0) {
      return res.status(404).json({ message: 'Medical record not found' });
    }

    const record = records[0];

    // Enforce patient data scoping
    if (user.role === 'Patient' && record.patient_user_id !== user.id) {
      return res.status(403).json({ message: 'Access denied: You can only view your own medical records' });
    }

    res.status(200).json(record);
  } catch (error) {
    console.error('Get medical record by ID error:', error);
    res.status(500).json({ message: 'Internal server error retrieving medical record details' });
  }
}

// Create new medical record (Doctors only)
async function createRecord(req, res) {
  const { patient_id, appointment_id, diagnosis, treatment, prescription, visit_date } = req.body;
  const user = req.user;
  const clientIp = req.ip || req.connection.remoteAddress;

  try {
    if (!patient_id || !diagnosis || !treatment || !prescription) {
      return res.status(400).json({ message: 'Patient ID, diagnosis, treatment, and prescription are required' });
    }

    // 1. Get Doctor's ID from user.id
    const doctorRecord = await query('SELECT id, name FROM doctors WHERE user_id = ?', [user.id]);
    if (doctorRecord.length === 0) {
      return res.status(403).json({ message: 'Access denied: Only registered doctor accounts can write medical records' });
    }
    const doctor_id = doctorRecord[0].id;
    const doctorName = doctorRecord[0].name;

    const recordDate = visit_date || new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    // 2. Insert medical record
    const result = await query(
      `INSERT INTO medical_records (patient_id, doctor_id, appointment_id, diagnosis, treatment, prescription, visit_date) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [patient_id, doctor_id, appointment_id || null, diagnosis, treatment, prescription, recordDate]
    );
    const newRecordId = result.insertId;

    // 3. Automatically complete linked appointment if present
    if (appointment_id) {
      await query(
        'UPDATE appointments SET status = "Completed" WHERE id = ? AND patient_id = ?',
        [appointment_id, patient_id]
      );
    }

    // Fetch patient name for logging
    const patientRecord = await query('SELECT name FROM patients WHERE id = ?', [patient_id]);
    const patientName = patientRecord.length > 0 ? patientRecord[0].name : `ID ${patient_id}`;

    await logAudit(user.id, 'MEDICAL_RECORD_CREATED', `Doctor ${doctorName} created medical record (ID: ${newRecordId}) for Patient ${patientName}`, clientIp);

    res.status(201).json({
      message: 'Medical record created successfully',
      recordId: newRecordId
    });

  } catch (error) {
    console.error('Create medical record error:', error);
    res.status(500).json({ message: 'Internal server error saving medical record' });
  }
}

// Update medical record (Doctor who created it or Admin)
async function updateRecord(req, res) {
  const { id } = req.params;
  const { diagnosis, treatment, prescription } = req.body;
  const user = req.user;
  const clientIp = req.ip || req.connection.remoteAddress;

  try {
    const records = await query('SELECT mr.*, d.user_id as doctor_user_id FROM medical_records mr JOIN doctors d ON mr.doctor_id = d.id WHERE mr.id = ?', [id]);
    if (records.length === 0) {
      return res.status(404).json({ message: 'Medical record not found' });
    }

    const record = records[0];

    // Enforce ownership: Doctor can only update records they authored
    if (user.role === 'Doctor' && record.doctor_user_id !== user.id) {
      return res.status(403).json({ message: 'Access denied: You can only edit medical records you authored' });
    }

    await query(
      'UPDATE medical_records SET diagnosis = ?, treatment = ?, prescription = ? WHERE id = ?',
      [diagnosis, treatment, prescription, id]
    );

    await logAudit(user.id, 'MEDICAL_RECORD_UPDATED', `Updated medical record ID: ${id}`, clientIp);

    res.status(200).json({ message: 'Medical record updated successfully' });
  } catch (error) {
    console.error('Update medical record error:', error);
    res.status(500).json({ message: 'Internal server error updating medical record' });
  }
}

// Delete medical record (Admin only)
async function deleteRecord(req, res) {
  const { id } = req.params;
  const adminId = req.user.id;
  const clientIp = req.ip || req.connection.remoteAddress;

  try {
    const check = await query('SELECT id FROM medical_records WHERE id = ?', [id]);
    if (check.length === 0) {
      return res.status(404).json({ message: 'Medical record not found' });
    }

    await query('DELETE FROM medical_records WHERE id = ?', [id]);
    await logAudit(adminId, 'MEDICAL_RECORD_DELETED', `Deleted medical record ID: ${id}`, clientIp);

    res.status(200).json({ message: 'Medical record deleted successfully' });
  } catch (error) {
    console.error('Delete medical record error:', error);
    res.status(500).json({ message: 'Internal server error deleting medical record' });
  }
}

// Download PDF consultation report
async function downloadRecordPDF(req, res) {
  const { id } = req.params;
  const user = req.user;

  try {
    if (user.role === 'Receptionist') {
      return res.status(403).json({ message: 'Access denied: Receptionists cannot access clinical medical records' });
    }

    const records = await query(
      `SELECT mr.*, 
              p.name as patient_name, p.age as patient_age, p.gender as patient_gender, p.contact_number as patient_contact, p.emergency_contact, p.user_id as patient_user_id,
              d.name as doctor_name, d.specialty
       FROM medical_records mr
       JOIN patients p ON mr.patient_id = p.id
       JOIN doctors d ON mr.doctor_id = d.id
       WHERE mr.id = ?`,
      [id]
    );

    if (records.length === 0) {
      return res.status(404).json({ message: 'Medical record not found' });
    }

    const record = records[0];

    // Enforce patient privacy
    if (user.role === 'Patient' && record.patient_user_id !== user.id) {
      return res.status(403).json({ message: 'Access denied: You can only export your own records' });
    }

    // Set Response headers for PDF attachment download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=medical_report_mr_${id}.pdf`);

    // Compile & Pipe PDF
    generateMedicalRecordPDF(record, res);

  } catch (error) {
    console.error('PDF generation error:', error);
    res.status(500).json({ message: 'Internal server error compiling PDF report' });
  }
}

module.exports = {
  getRecords,
  getRecordById,
  createRecord,
  updateRecord,
  deleteRecord,
  downloadRecordPDF,
};
