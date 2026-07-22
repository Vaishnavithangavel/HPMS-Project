const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../db/db');
const logAudit = require('../utils/auditLogger');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_key_for_hospital_patient_management_system_2026';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

// User Registration
async function register(req, res) {
  const { 
    username, 
    email, 
    password, 
    role = 'Patient',
    // Patient details
    name, 
    age, 
    gender, 
    contact_number, 
    address, 
    emergency_contact,
    medical_history = '',
    // Doctor details
    specialty,
    available_days = 'Mon,Tue,Wed,Thu,Fri',
    available_hours = '09:00-17:00'
  } = req.body;

  const clientIp = req.ip || req.connection.remoteAddress;

  try {
    // 1. Basic validation
    if (!username || !email || !password) {
      return res.status(400).json({ message: 'Username, email, and password are required' });
    }

    // 2. Role control: Only Admin can create Admin, Doctor, or Receptionist accounts.
    if (role !== 'Patient') {
      const authHeader = req.headers['authorization'];
      const token = authHeader && authHeader.split(' ')[1];
      if (!token) {
        return res.status(403).json({ message: 'Only administrators can create staff accounts' });
      }

      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (decoded.role !== 'Admin') {
          return res.status(403).json({ message: 'Only administrators can create staff accounts' });
        }
      } catch (err) {
        return res.status(403).json({ message: 'Unauthorized staff creation' });
      }
    }

    // 3. Check if user already exists
    const existingUser = await query('SELECT id FROM users WHERE username = ? OR email = ?', [username, email]);
    if (existingUser.length > 0) {
      return res.status(400).json({ message: 'Username or email already exists' });
    }

    // 4. Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // 5. Create user (using raw queries)
    const userResult = await query(
      'INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)',
      [username, email, passwordHash, role]
    );
    const userId = userResult.insertId;

    // 6. Handle profile creation based on role
    if (role === 'Patient') {
      if (!name || !age || !gender || !contact_number) {
        // Rollback user creation (simulate transaction manually)
        await query('DELETE FROM users WHERE id = ?', [userId]);
        return res.status(400).json({ message: 'Patient demographic details (name, age, gender, contact_number) are required' });
      }
      
      await query(
        'INSERT INTO patients (user_id, name, age, gender, contact_number, address, emergency_contact, medical_history) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [userId, name, age, gender, contact_number, address || '', emergency_contact || 'N/A', medical_history]
      );
      await logAudit(userId, 'USER_REGISTERED', `Patient profile self-registered for ${name}`, clientIp);

    } else if (role === 'Doctor') {
      if (!name || !specialty || !contact_number) {
        await query('DELETE FROM users WHERE id = ?', [userId]);
        return res.status(400).json({ message: 'Doctor details (name, specialty, contact_number) are required' });
      }

      await query(
        'INSERT INTO doctors (user_id, name, specialty, contact_number, email, available_days, available_hours) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [userId, name, specialty, contact_number, email, available_days, available_hours]
      );
      await logAudit(userId, 'DOCTOR_CREATED', `Doctor profile created for ${name} (${specialty})`, clientIp);
    } else {
      // Admin or Receptionist
      await logAudit(userId, 'STAFF_CREATED', `${role} account created for ${username}`, clientIp);
    }

    res.status(201).json({ 
      message: `${role} account registered successfully.`,
      user: { id: userId, username, email, role }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Internal server error during registration' });
  }
}

// User Login
async function login(req, res) {
  const { usernameOrEmail, password } = req.body;
  const clientIp = req.ip || req.connection.remoteAddress;

  try {
    if (!usernameOrEmail || !password) {
      return res.status(400).json({ message: 'Username/email and password are required' });
    }

    // Find user
    const users = await query(
      'SELECT * FROM users WHERE username = ? OR email = ?',
      [usernameOrEmail, usernameOrEmail]
    );

    if (users.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const user = users[0];

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      await logAudit(user.id, 'LOGIN_FAILED', 'Failed login attempt with incorrect password', clientIp);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, email: user.email },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Get role-specific profile information
    let profile = null;
    if (user.role === 'Patient') {
      const patients = await query('SELECT * FROM patients WHERE user_id = ?', [user.id]);
      if (patients.length > 0) profile = patients[0];
    } else if (user.role === 'Doctor') {
      const doctors = await query('SELECT * FROM doctors WHERE user_id = ?', [user.id]);
      if (doctors.length > 0) profile = doctors[0];
    }

    await logAudit(user.id, 'USER_LOGIN', `User logged in successfully from IP: ${clientIp}`, clientIp);

    res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        profile
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error during login' });
  }
}

// Get Logged In User Profile
async function getMe(req, res) {
  try {
    const user = req.user;
    const users = await query('SELECT id, username, email, role, created_at FROM users WHERE id = ?', [user.id]);
    
    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const userData = users[0];
    let profile = null;

    if (userData.role === 'Patient') {
      const patients = await query('SELECT * FROM patients WHERE user_id = ?', [userData.id]);
      if (patients.length > 0) profile = patients[0];
    } else if (userData.role === 'Doctor') {
      const doctors = await query('SELECT * FROM doctors WHERE user_id = ?', [userData.id]);
      if (doctors.length > 0) profile = doctors[0];
    }

    res.status(200).json({
      id: userData.id,
      username: userData.username,
      email: userData.email,
      role: userData.role,
      profile
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Internal server error retrieving profile' });
  }
}

module.exports = {
  register,
  login,
  getMe,
};
