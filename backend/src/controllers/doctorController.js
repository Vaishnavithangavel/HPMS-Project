const { query } = require('../db/db');
const bcrypt = require('bcryptjs');
const logAudit = require('../utils/auditLogger');

// Get all doctors with optional search and specialty filters
async function getAllDoctors(req, res) {
  try {
    const { search = '', specialty = '' } = req.query;

    let sql = 'SELECT * FROM doctors WHERE 1=1';
    const params = [];

    if (search) {
      sql += ' AND name LIKE ?';
      params.push(`%${search}%`);
    }

    if (specialty) {
      sql += ' AND specialty = ?';
      params.push(specialty);
    }

    sql += ' ORDER BY specialty ASC, name ASC';

    const doctors = await query(sql, params);
    res.status(200).json(doctors);
  } catch (error) {
    console.error('Get all doctors error:', error);
    res.status(500).json({ message: 'Internal server error retrieving doctors list' });
  }
}

// Get all unique specialties
async function getSpecialties(req, res) {
  try {
    const specialties = await query('SELECT DISTINCT specialty FROM doctors ORDER BY specialty ASC');
    const list = specialties.map(item => item.specialty);
    res.status(200).json(list);
  } catch (error) {
    console.error('Get specialties error:', error);
    res.status(500).json({ message: 'Internal server error retrieving specialties' });
  }
}

// Get doctor by ID
async function getDoctorById(req, res) {
  try {
    const { id } = req.params;
    const doctors = await query('SELECT d.*, u.username as login_username FROM doctors d LEFT JOIN users u ON d.user_id = u.id WHERE d.id = ?', [id]);
    
    if (doctors.length === 0) {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    res.status(200).json(doctors[0]);
  } catch (error) {
    console.error('Get doctor by ID error:', error);
    res.status(500).json({ message: 'Internal server error retrieving doctor details' });
  }
}

// Create new doctor profile (Admin only)
async function createDoctor(req, res) {
  const { name, specialty, contact_number, email, available_days, available_hours, username, password } = req.body;
  const adminId = req.user.id;
  const clientIp = req.ip || req.connection.remoteAddress;

  try {
    if (!name || !specialty || !contact_number || !email || !username || !password) {
      return res.status(400).json({ message: 'Missing required fields to register a new doctor account' });
    }

    // 1. Check if user already exists
    const existingUser = await query('SELECT id FROM users WHERE username = ? OR email = ?', [username, email]);
    if (existingUser.length > 0) {
      return res.status(400).json({ message: 'Username or email already exists for another account' });
    }

    // 2. Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // 3. Create user
    const userResult = await query(
      'INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)',
      [username, email, passwordHash, 'Doctor']
    );
    const userId = userResult.insertId;

    // 4. Create doctor profile
    const doctorResult = await query(
      'INSERT INTO doctors (user_id, name, specialty, contact_number, email, available_days, available_hours) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [userId, name, specialty, contact_number, email, available_days || 'Mon,Tue,Wed,Thu,Fri', available_hours || '09:00-17:00']
    );

    await logAudit(adminId, 'DOCTOR_REGISTERED', `Admin registered doctor: ${name} (${specialty}, ID: ${doctorResult.insertId})`, clientIp);

    res.status(201).json({
      message: 'Doctor account and profile created successfully',
      doctorId: doctorResult.insertId,
      userId
    });

  } catch (error) {
    console.error('Create doctor error:', error);
    res.status(500).json({ message: 'Internal server error registering doctor' });
  }
}

// Update doctor profile (Admin or the Doctor themselves)
async function updateDoctor(req, res) {
  const { id } = req.params;
  const { name, specialty, contact_number, available_days, available_hours } = req.body;
  const user = req.user;
  const clientIp = req.ip || req.connection.remoteAddress;

  try {
    // Check permission: Doctors can only edit their own profile
    if (user.role === 'Doctor') {
      const docCheck = await query('SELECT id FROM doctors WHERE id = ? AND user_id = ?', [id, user.id]);
      if (docCheck.length === 0) {
        return res.status(403).json({ message: 'Access denied: You can only update your own profile' });
      }
    }

    const docCheck = await query('SELECT id, name FROM doctors WHERE id = ?', [id]);
    if (docCheck.length === 0) {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    await query(
      'UPDATE doctors SET name = ?, specialty = ?, contact_number = ?, available_days = ?, available_hours = ? WHERE id = ?',
      [name, specialty, contact_number, available_days, available_hours, id]
    );

    await logAudit(user.id, 'DOCTOR_UPDATED', `Updated doctor details for ${docCheck[0].name} (ID: ${id})`, clientIp);

    res.status(200).json({ message: 'Doctor profile updated successfully' });
  } catch (error) {
    console.error('Update doctor error:', error);
    res.status(500).json({ message: 'Internal server error updating doctor profile' });
  }
}

// Delete doctor profile (Admin only)
async function deleteDoctor(req, res) {
  const { id } = req.params;
  const adminId = req.user.id;
  const clientIp = req.ip || req.connection.remoteAddress;

  try {
    const docCheck = await query('SELECT name, user_id FROM doctors WHERE id = ?', [id]);
    if (docCheck.length === 0) {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    const { name, user_id } = docCheck[0];

    // Delete doctor profile
    await query('DELETE FROM doctors WHERE id = ?', [id]);

    // Delete associated user account
    if (user_id) {
      await query('DELETE FROM users WHERE id = ?', [user_id]);
    }

    await logAudit(adminId, 'DOCTOR_DELETED', `Deleted doctor: ${name} (ID: ${id}) and user credentials`, clientIp);

    res.status(200).json({ message: 'Doctor record and credentials deleted successfully' });
  } catch (error) {
    console.error('Delete doctor error:', error);
    res.status(500).json({ message: 'Internal server error deleting doctor' });
  }
}

module.exports = {
  getAllDoctors,
  getSpecialties,
  getDoctorById,
  createDoctor,
  updateDoctor,
  deleteDoctor,
};
