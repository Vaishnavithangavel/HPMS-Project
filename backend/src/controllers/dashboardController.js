const { query } = require('../db/db');

// Get Dashboard Overview metrics and chart data
async function getDashboardStats(req, res) {
  const user = req.user;

  try {
    if (user.role === 'Admin' || user.role === 'Receptionist') {
      // 1. Admin/Receptionist Stats
      const [patientCount] = await query('SELECT COUNT(*) as count FROM patients');
      const [doctorCount] = await query('SELECT COUNT(*) as count FROM doctors');
      const [apptTodayCount] = await query('SELECT COUNT(*) as count FROM appointments WHERE DATE(appointment_date) = CURDATE() AND status = "Scheduled"');
      
      const apptBreakdown = await query('SELECT status, COUNT(*) as count FROM appointments GROUP BY status');
      const specialtyLoads = await query(
        `SELECT d.specialty, COUNT(a.id) as count 
         FROM appointments a 
         JOIN doctors d ON a.doctor_id = d.id 
         GROUP BY d.specialty`
      );
      
      const weeklyTrends = await query(
  `SELECT DATE(appointment_date) as date, COUNT(*) as count 
   FROM appointments 
   WHERE appointment_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) 
   GROUP BY DATE(appointment_date) 
   ORDER BY DATE(appointment_date) ASC`
);

      const recentLogs = await query(
        `SELECT al.*, u.username 
         FROM audit_logs al 
         LEFT JOIN users u ON al.user_id = u.id 
         ORDER BY al.created_at DESC 
         LIMIT 5`
      );

      return res.status(200).json({
        role: user.role,
        metrics: {
          totalPatients: patientCount.count,
          totalDoctors: doctorCount.count,
          appointmentsToday: apptTodayCount.count,
          breakdown: apptBreakdown
        },
        charts: {
          specialtyLoads,
          weeklyTrends
        },
        recentLogs
      });
      
    } else if (user.role === 'Doctor') {
      // 2. Doctor Stats
      // Get doctor's ID from user ID
      const doctorRecord = await query('SELECT id FROM doctors WHERE user_id = ?', [user.id]);
      if (doctorRecord.length === 0) {
        return res.status(404).json({ message: 'Doctor profile not found for user' });
      }
      const doctorId = doctorRecord[0].id;

      const [uniquePatients] = await query('SELECT COUNT(DISTINCT patient_id) as count FROM appointments WHERE doctor_id = ?', [doctorId]);
      const [totalRecords] = await query('SELECT COUNT(*) as count FROM medical_records WHERE doctor_id = ?', [doctorId]);
      const [todayScheduled] = await query(
        'SELECT COUNT(*) as count FROM appointments WHERE doctor_id = ? AND DATE(appointment_date) = CURDATE() AND status = "Scheduled"',
        [doctorId]
      );

      const todayAppointments = await query(
        `SELECT a.*, p.name as patient_name, p.age as patient_age, p.gender as patient_gender
         FROM appointments a
         JOIN patients p ON a.patient_id = p.id
         WHERE a.doctor_id = ? AND DATE(a.appointment_date) = CURDATE() AND a.status = "Scheduled"
         ORDER BY a.appointment_date ASC`,
        [doctorId]
      );

      return res.status(200).json({
        role: user.role,
        metrics: {
          uniquePatients: uniquePatients.count,
          recordsAuthored: totalRecords.count,
          todayScheduled: todayScheduled.count,
        },
        todayAppointments
      });

    } else if (user.role === 'Patient') {
      // 3. Patient Stats
      const patientRecord = await query('SELECT id FROM patients WHERE user_id = ?', [user.id]);
      if (patientRecord.length === 0) {
        return res.status(404).json({ message: 'Patient profile not found for user' });
      }
      const patientId = patientRecord[0].id;

      const [upcomingAppts] = await query(
        'SELECT COUNT(*) as count FROM appointments WHERE patient_id = ? AND appointment_date >= NOW() AND status = "Scheduled"',
        [patientId]
      );
      
      const [totalVisits] = await query('SELECT COUNT(*) as count FROM medical_records WHERE patient_id = ?', [patientId]);
      
      const upcomingList = await query(
        `SELECT a.*, d.name as doctor_name, d.specialty 
         FROM appointments a
         JOIN doctors d ON a.doctor_id = d.id
         WHERE a.patient_id = ? AND a.appointment_date >= NOW() AND a.status = "Scheduled"
         ORDER BY a.appointment_date ASC
         LIMIT 5`,
        [patientId]
      );

      const [lastMedicalRecord] = await query(
        `SELECT mr.*, d.name as doctor_name 
         FROM medical_records mr
         JOIN doctors d ON mr.doctor_id = d.id
         WHERE mr.patient_id = ? 
         ORDER BY mr.visit_date DESC, mr.created_at DESC 
         LIMIT 1`,
        [patientId]
      );

      return res.status(200).json({
        role: user.role,
        metrics: {
          upcomingAppointments: upcomingAppts.count,
          totalVisits: totalVisits.count,
        },
        upcomingAppointmentsList: upcomingList,
        latestRecord: lastMedicalRecord || null
      });
    }

    res.status(400).json({ message: 'Unknown role' });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ message: 'Internal server error calculating metrics' });
  }
}

module.exports = {
  getDashboardStats,
};
