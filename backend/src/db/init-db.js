const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const schemaPath = path.join(__dirname, 'schema.sql');

async function initializeDatabase() {
  console.log('Starting database initialization...');
  
  const dbName = process.env.DB_NAME || process.env.MYSQL_ADDON_DB || 'hpms_db';
  const isManagedDB = !!process.env.MYSQL_ADDON_HOST;

  // Connection details
  const connectionConfig = {
    host: process.env.DB_HOST || process.env.MYSQL_ADDON_HOST || 'localhost',
    user: process.env.DB_USER || process.env.MYSQL_ADDON_USER || 'root',
    password: process.env.DB_PASSWORD || process.env.MYSQL_ADDON_PASSWORD || '',
    port: parseInt(process.env.DB_PORT || process.env.MYSQL_ADDON_PORT || '3306'),
  };

  // For managed databases (Clever Cloud), connect directly with the database name
  if (isManagedDB) {
    connectionConfig.database = dbName;
  }

  let connection;
  try {
    connection = await mysql.createConnection(connectionConfig);
    console.log('Connected to MySQL server successfully.');
  } catch (error) {
    console.error('CRITICAL: Cannot connect to MySQL server. Please make sure MySQL is running and details in .env are correct.');
    console.error(error.message);
    return false;
  }

  try {
    if (isManagedDB) {
      console.log(`Using managed database: "${dbName}"`);
    } else {
      // Create database if it doesn't exist
      await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\`;`);
      console.log(`Database "${dbName}" ensured.`);
      // Switch connection to database
      await connection.query(`USE \`${dbName}\`;`);
    }

    // Read schema.sql
    if (!fs.existsSync(schemaPath)) {
      throw new Error(`Schema file not found at ${schemaPath}`);
    }
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    
    // Split queries by semicolon and strip SQL comment lines from each chunk
    const queries = schemaSql
      .split(/;\s*$/m)
      .map(q => q.split('\n').filter(line => !line.trim().startsWith('--')).join('\n').trim())
      .filter(q => q.length > 0);

    for (const q of queries) {
      if (q.startsWith('CREATE DATABASE') || q.startsWith('USE')) continue;
      try {
        await connection.query(q);
      } catch (err) {
        console.warn(`Query execution warning on setup: ${err.message}`);
      }
    }
    console.log('Database tables verified/created successfully.');

    // Check if seeding is already done (e.g., users table has records)
    const [users] = await connection.query('SELECT id FROM users LIMIT 1');
    if (users.length > 0) {
      console.log('Database already initialized with data. Skipping seeding.');
      await connection.end();
      return true;
    }

    console.log('Seeding default accounts & test data...');

    // Hashing passwords
    const adminHash = await bcrypt.hash('adminpassword', 10);
    const docSmithHash = await bcrypt.hash('doctorpassword', 10);
    const docAdamsHash = await bcrypt.hash('doctorpassword', 10);
    const receptionHash = await bcrypt.hash('receptionpassword', 10);
    const patientHash = await bcrypt.hash('patientpassword', 10);
    const patient2Hash = await bcrypt.hash('patientpassword', 10);

    // 1. Seed Users
    const insertUserSql = `INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)`;
    
    const [adminResult] = await connection.query(insertUserSql, ['admin', 'admin@hospital.com', adminHash, 'Admin']);
    const [smithResult] = await connection.query(insertUserSql, ['dr_smith', 'smith@hospital.com', docSmithHash, 'Doctor']);
    const [adamsResult] = await connection.query(insertUserSql, ['dr_adams', 'adams@hospital.com', docAdamsHash, 'Doctor']);
    const [receptResult] = await connection.query(insertUserSql, ['receptionist', 'reception@hospital.com', receptionHash, 'Receptionist']);
    const [patientResult] = await connection.query(insertUserSql, ['john_doe', 'john@gmail.com', patientHash, 'Patient']);
    const [patient2Result] = await connection.query(insertUserSql, ['mary_jane', 'mary@gmail.com', patient2Hash, 'Patient']);

    const adminId = adminResult.insertId;
    const smithUserId = smithResult.insertId;
    const adamsUserId = adamsResult.insertId;
    const receptId = receptResult.insertId;
    const patientUserId = patientResult.insertId;
    const patient2UserId = patient2Result.insertId;

    // 2. Seed Doctors
    const insertDoctorSql = `INSERT INTO doctors (user_id, name, specialty, contact_number, email, available_days, available_hours) VALUES (?, ?, ?, ?, ?, ?, ?)`;
    const [docSmithResult] = await connection.query(insertDoctorSql, [smithUserId, 'Dr. Richard Smith', 'Cardiology', '123-456-7890', 'smith@hospital.com', 'Mon,Wed,Fri', '09:00-17:00']);
    const [docAdamsResult] = await connection.query(insertDoctorSql, [adamsUserId, 'Dr. Sarah Adams', 'Pediatrics', '234-567-8901', 'adams@hospital.com', 'Tue,Thu', '10:00-16:00']);
    
    const docSmithId = docSmithResult.insertId;
    const docAdamsId = docAdamsResult.insertId;

    // 3. Seed Patients
    const insertPatientSql = `INSERT INTO patients (user_id, name, age, gender, contact_number, address, emergency_contact, medical_history) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
    const [patJohnResult] = await connection.query(insertPatientSql, [patientUserId, 'John Doe', 35, 'Male', '987-654-3210', '123 Main St, Springfield', 'Jane Doe (Wife) - 987-654-3211', 'Hypertension, seasonal allergies.']);
    const [patMaryResult] = await connection.query(insertPatientSql, [patient2UserId, 'Mary Jane', 28, 'Female', '555-123-4567', '456 Oak Avenue, Metropolis', 'Bob Jane (Father) - 555-123-4568', 'No chronic conditions. Penicillin allergy.']);

    const patientJohnId = patJohnResult.insertId;
    const patientMaryId = patMaryResult.insertId;

    // 4. Seed Appointments
    const insertApptSql = `INSERT INTO appointments (patient_id, doctor_id, appointment_date, status, notes) VALUES (?, ?, ?, ?, ?)`;
    // Create appointments for John and Mary
    // Yesterday's appointment (Completed)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(10, 0, 0, 0);
    const [appt1] = await connection.query(insertApptSql, [patientJohnId, docSmithId, yesterday, 'Completed', 'Routine cardiovascular health screening.']);
    
    // Today's appointment (Scheduled)
    const today = new Date();
    today.setHours(14, 30, 0, 0);
    await connection.query(insertApptSql, [patientMaryId, docAdamsId, today, 'Scheduled', 'General pediatrics consultation.']);

    // Tomorrow's appointment (Scheduled)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(11, 0, 0, 0);
    await connection.query(insertApptSql, [patientJohnId, docSmithId, tomorrow, 'Scheduled', 'Follow-up for blood pressure medication check.']);

    // 5. Seed Medical Records (linking to completed appointment 1)
    const insertRecordSql = `INSERT INTO medical_records (patient_id, doctor_id, appointment_id, diagnosis, treatment, prescription, visit_date) VALUES (?, ?, ?, ?, ?, ?, ?)`;
    await connection.query(insertRecordSql, [
      patientJohnId, 
      docSmithId, 
      appt1.insertId, 
      'Stage 1 Essential Hypertension. Resting blood pressure 138/89 mmHg.', 
      'Prescribed blood pressure control medication, suggested dietary adjustments (low sodium diet), and recommended moderate daily aerobic exercise.', 
      'Lisinopril 10mg orally once daily. Dispense 30 tablets. Refills: 3.', 
      yesterday
    ]);

    // 6. Seed Audit Logs
    const insertAuditSql = `INSERT INTO audit_logs (user_id, action, details, ip_address) VALUES (?, ?, ?, ?)`;
    await connection.query(insertAuditSql, [adminId, 'DATABASE_INIT', 'Database seeded with default values and test accounts.', '127.0.0.1']);
    await connection.query(insertAuditSql, [smithUserId, 'PROFILE_CREATED', 'Doctor profile established for Dr. Richard Smith.', '127.0.0.1']);
    await connection.query(insertAuditSql, [adamsUserId, 'PROFILE_CREATED', 'Doctor profile established for Dr. Sarah Adams.', '127.0.0.1']);
    await connection.query(insertAuditSql, [patientUserId, 'PATIENT_REGISTERED', 'Patient John Doe registered in the system.', '127.0.0.1']);
    await connection.query(insertAuditSql, [patient2UserId, 'PATIENT_REGISTERED', 'Patient Mary Jane registered in the system.', '127.0.0.1']);

    console.log('Database seeding completed successfully.');
    await connection.end();
    return true;
  } catch (error) {
    console.error('Error seeding database:', error.message);
    if (connection) await connection.end();
    return false;
  }
}

if (require.main === module) {
  initializeDatabase();
}

module.exports = initializeDatabase;
