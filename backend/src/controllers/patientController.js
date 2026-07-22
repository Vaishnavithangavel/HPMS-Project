const { query } = require('../db/db');
const bcrypt = require('bcryptjs');
const logAudit = require('../utils/auditLogger');

// Get all patients with search and filter
async function getAllPatients(req, res) {
  try {
    const { search = '', gender = '' } = req.query;
    
    let sql = 'SELECT * FROM patients WHERE 1=1';
    const params = [];

    if (search) {
      sql += ' AND (name LIKE ? OR contact_number LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    if (gender) {
      sql += ' AND gender = ?';
      params.push(gender);
    }

    sql += ' ORDER BY name ASC';

    const patients = await query(sql, params);
    res.status(200).json(patients);
  } catch (error) {
    console.error('Get all patients error:', error);
    res.status(500).json({ message: 'Internal server error retrieving patients' });
  }
}

// Get patient by ID
async function getPatientById(req, res) {
  try {
    const { id } = req.params;
    const user = req.user;

    // Check permissions: Patient can only view their own profile
    if (user.role === 'Patient') {
      const patientCheck = await query('SELECT id FROM patients WHERE id = ? AND user_id = ?', [id, user.id]);
      if (patientCheck.length === 0) {
        return res.status(403).json({ message: 'Access denied: You can only view your own profile' });
      }
    }

    const patients = await query('SELECT p.*, u.email as login_email, u.username as login_username FROM patients p LEFT JOIN users u ON p.user_id = u.id WHERE p.id = ?', [id]);
    
    if (patients.length === 0) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    res.status(200).json(patients[0]);
  } catch (error) {
    console.error('Get patient by ID error:', error);
    res.status(500).json({ message: 'Internal server error retrieving patient details' });
  }
}

// Create new patient (by Admin or Receptionist)
async function createPatient(req, res) {
  const { name, age, gender, contact_number, address, emergency_contact, medical_history = '', email, create_login = false } = req.body;
  const adminId = req.user.id;
  const clientIp = req.ip || req.connection.remoteAddress;

  try {
    if (!name || !age || !gender || !contact_number || !address || !emergency_contact) {
      return res.status(400).json({ message: 'Missing required fields for patient registration' });
    }

    let userId = null;

    // Optional: create a linked user account
    if (create_login && email) {
      // Check if email already exists
      const existingUser = await query('SELECT id FROM users WHERE email = ?', [email]);
      if (existingUser.length > 0) {
        return res.status(400).json({ message: 'A user account with this email already exists' });
      }

      const defaultUsername = email.split('@')[0] + Math.floor(Math.random() * 1000);
      const defaultPassword = 'Patient' + contact_number.replace(/\D/g, '').slice(-4); // e.g., Patient3210
      const passwordHash = await bcrypt.hash(defaultPassword, 10);

      const userResult = await query(
        'INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)',
        [defaultUsername, email, passwordHash, 'Patient']
      );
      userId = userResult.insertId;
      console.log(`Auto-created login for patient: Username: ${defaultUsername}, Password: ${defaultPassword}`);
    }

    const patientResult = await query(
      'INSERT INTO patients (user_id, name, age, gender, contact_number, address, emergency_contact, medical_history) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [userId, name, age, gender, contact_number, address, emergency_contact, medical_history]
    );

    await logAudit(adminId, 'PATIENT_REGISTERED', `Registered patient: ${name} (ID: ${patientResult.insertId})`, clientIp);

    res.status(201).json({
      message: 'Patient registered successfully',
      patientId: patientResult.insertId,
      userId
    });

  } catch (error) {
    console.error('Create patient error:', error);
    res.status(500).json({ message: 'Internal server error registering patient' });
  }
}

// Update patient profile
async function updatePatient(req, res) {
  const { id } = req.params;
  const { name, age, gender, contact_number, address, emergency_contact, medical_history } = req.body;
  const user = req.user;
  const clientIp = req.ip || req.connection.remoteAddress;

  try {
    // Check permission: Patient can only update their own profile
    if (user.role === 'Patient') {
      const patientCheck = await query('SELECT id FROM patients WHERE id = ? AND user_id = ?', [id, user.id]);
      if (patientCheck.length === 0) {
        return res.status(403).json({ message: 'Access denied: You can only update your own profile' });
      }
    }

    const patientCheck = await query('SELECT id, name FROM patients WHERE id = ?', [id]);
    if (patientCheck.length === 0) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    await query(
      'UPDATE patients SET name = ?, age = ?, gender = ?, contact_number = ?, address = ?, emergency_contact = ?, medical_history = ? WHERE id = ?',
      [name, age, gender, contact_number, address, emergency_contact, medical_history, id]
    );

    await logAudit(user.id, 'PATIENT_UPDATED', `Updated patient details for ${patientCheck[0].name} (ID: ${id})`, clientIp);

    res.status(200).json({ message: 'Patient profile updated successfully' });
  } catch (error) {
    console.error('Update patient error:', error);
    res.status(500).json({ message: 'Internal server error updating patient' });
  }
}

// Delete patient profile (Admin only)
async function deletePatient(req, res) {
  const { id } = req.params;
  const adminId = req.user.id;
  const clientIp = req.ip || req.connection.remoteAddress;

  try {
    const patientCheck = await query('SELECT name, user_id FROM patients WHERE id = ?', [id]);
    if (patientCheck.length === 0) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    const { name, user_id } = patientCheck[0];

    // Delete patient (will cascade appointments and records because of FK constraints)
    await query('DELETE FROM patients WHERE id = ?', [id]);

    // If user account is linked, delete it too
    if (user_id) {
      await query('DELETE FROM users WHERE id = ?', [user_id]);
    }

    await logAudit(adminId, 'PATIENT_DELETED', `Deleted patient: ${name} (ID: ${id}) and their user account`, clientIp);

    res.status(200).json({ message: 'Patient record and associated user account deleted successfully' });
  } catch (error) {
    console.error('Delete patient error:', error);
    res.status(500).json({ message: 'Internal server error deleting patient' });
  }
}

// Get patient's medical records
async function getPatientRecords(req, res) {
  const { id } = req.params;
  const user = req.user;

  try {
    // RBAC Check: Patient can only view their own records
    if (user.role === 'Patient') {
      const patientCheck = await query('SELECT id FROM patients WHERE id = ? AND user_id = ?', [id, user.id]);
      if (patientCheck.length === 0) {
        return res.status(403).json({ message: 'Access denied: You can only view your own records' });
      }
    }

    const records = await query(
      `SELECT mr.*, d.name as doctor_name, d.specialty 
       FROM medical_records mr
       LEFT JOIN doctors d ON mr.doctor_id = d.id
       WHERE mr.patient_id = ?
       ORDER BY mr.visit_date DESC`,
      [id]
    );

    res.status(200).json(records);
  } catch (error) {
    console.error('Get patient records error:', error);
    res.status(500).json({ message: 'Internal server error retrieving patient records' });
  }
}

// Get patient's appointments
async function getPatientAppointments(req, res) {
  const { id } = req.params;
  const user = req.user;

  try {
    // RBAC Check: Patient can only view their own appointments
    if (user.role === 'Patient') {
      const patientCheck = await query('SELECT id FROM patients WHERE id = ? AND user_id = ?', [id, user.id]);
      if (patientCheck.length === 0) {
        return res.status(403).json({ message: 'Access denied: You can only view your own appointments' });
      }
    }

    const appointments = await query(
      `SELECT a.*, d.name as doctor_name, d.specialty 
       FROM appointments a
       LEFT JOIN doctors d ON a.doctor_id = d.id
       WHERE a.patient_id = ?
       ORDER BY a.appointment_date DESC`,
      [id]
    );

    res.status(200).json(appointments);
  } catch (error) {
    console.error('Get patient appointments error:', error);
    res.status(500).json({ message: 'Internal server error retrieving patient appointments' });
  }
}

module.exports = {
  getAllPatients,
  getPatientById,
  createPatient,
  updatePatient,
  deletePatient,
  getPatientRecords,
  getPatientAppointments,
};
