const { query } = require('../db/db');
const logAudit = require('../utils/auditLogger');

// Get appointments with filters based on roles
async function getAppointments(req, res) {
  const user = req.user;
  const { status = '', date = '', doctorId = '', patientId = '' } = req.query;

  try {
    let sql = `
      SELECT a.*, 
             p.name as patient_name, p.contact_number as patient_contact,
             d.name as doctor_name, d.specialty
      FROM appointments a
      JOIN patients p ON a.patient_id = p.id
      JOIN doctors d ON a.doctor_id = d.id
      WHERE 1=1
    `;
    const params = [];

    // Role-based scoping
    if (user.role === 'Patient') {
      sql += ' AND p.user_id = ?';
      params.push(user.id);
    } else if (user.role === 'Doctor') {
      sql += ' AND d.user_id = ?';
      params.push(user.id);
    }

    // Optional query filters
    if (status) {
      sql += ' AND a.status = ?';
      params.push(status);
    }

    if (date) {
      sql += ' AND DATE(a.appointment_date) = ?';
      params.push(date);
    }

    if (doctorId) {
      sql += ' AND a.doctor_id = ?';
      params.push(doctorId);
    }

    if (patientId) {
      sql += ' AND a.patient_id = ?';
      params.push(patientId);
    }

    sql += ' ORDER BY a.appointment_date DESC';

    const appointments = await query(sql, params);
    res.status(200).json(appointments);
  } catch (error) {
    console.error('Get appointments error:', error);
    res.status(500).json({ message: 'Internal server error retrieving appointments' });
  }
}

// Create (schedule) an appointment
async function createAppointment(req, res) {
  const { doctor_id, appointment_date, notes = '', patient_id: reqPatientId } = req.body;
  const user = req.user;
  const clientIp = req.ip || req.connection.remoteAddress;

  try {
    if (!doctor_id || !appointment_date) {
      return res.status(400).json({ message: 'Doctor ID and appointment date/time are required' });
    }

    let patient_id = reqPatientId;

    // If the user is a Patient, force booking for themselves
    if (user.role === 'Patient') {
      const patientRecord = await query('SELECT id FROM patients WHERE user_id = ?', [user.id]);
      if (patientRecord.length === 0) {
        return res.status(404).json({ message: 'Patient profile not found for current user' });
      }
      patient_id = patientRecord[0].id;
    } else {
      // Admins and receptionists must specify which patient this is for
      if (!patient_id) {
        return res.status(400).json({ message: 'Patient ID is required for staff booking' });
      }
    }

    // Double-booking check: prevent booking a slot within 30 minutes of another active appointment for this doctor
    const conflicts = await query(
      `SELECT id, appointment_date FROM appointments 
       WHERE doctor_id = ? 
       AND status != 'Cancelled' 
       AND ABS(TIMESTAMPDIFF(MINUTE, appointment_date, ?)) < 30`,
      [doctor_id, appointment_date]
    );

    if (conflicts.length > 0) {
      return res.status(409).json({ 
        message: 'Doctor conflict: This slot overlaps with another scheduled appointment. Please choose a time at least 30 minutes before or after.',
        conflictTime: conflicts[0].appointment_date
      });
    }

    // Book appointment
    const result = await query(
      'INSERT INTO appointments (patient_id, doctor_id, appointment_date, status, notes) VALUES (?, ?, ?, ?, ?)',
      [patient_id, doctor_id, appointment_date, 'Scheduled', notes]
    );

    await logAudit(user.id, 'APPOINTMENT_SCHEDULED', `Appointment scheduled (ID: ${result.insertId}) with Doctor ID ${doctor_id} for Patient ID ${patient_id}`, clientIp);

    res.status(201).json({
      message: 'Appointment booked successfully',
      appointmentId: result.insertId
    });

  } catch (error) {
    console.error('Schedule appointment error:', error);
    res.status(500).json({ message: 'Internal server error scheduling appointment' });
  }
}

// Update appointment details or status
async function updateAppointment(req, res) {
  const { id } = req.params;
  const { status, appointment_date, notes } = req.body;
  const user = req.user;
  const clientIp = req.ip || req.connection.remoteAddress;

  try {
    // Check if appointment exists
    const appts = await query('SELECT a.*, p.user_id as patient_user_id, d.user_id as doctor_user_id FROM appointments a JOIN patients p ON a.patient_id = p.id JOIN doctors d ON a.doctor_id = d.id WHERE a.id = ?', [id]);
    
    if (appts.length === 0) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    const appt = appts[0];

    // RBAC validation:
    // 1. Patients can only cancel their own appointments, they cannot change status to Completed
    if (user.role === 'Patient') {
      if (appt.patient_user_id !== user.id) {
        return res.status(403).json({ message: 'Access denied: You can only modify your own appointments' });
      }
      if (status && status !== 'Cancelled') {
        return res.status(403).json({ message: 'Access denied: Patients are only allowed to cancel their appointments' });
      }
    }

    // 2. Doctors can mark their appointments as Completed, but cannot reschedule them to times that conflict
    if (user.role === 'Doctor' && appt.doctor_user_id !== user.id) {
      return res.status(403).json({ message: 'Access denied: You can only update appointments scheduled with you' });
    }

    // Build update fields dynamically
    let sql = 'UPDATE appointments SET ';
    const updates = [];
    const params = [];

    if (status) {
      updates.push('status = ?');
      params.push(status);
    }
    if (appointment_date) {
      // If rescheduling, check for double booking
      const conflicts = await query(
        `SELECT id FROM appointments 
         WHERE doctor_id = ? 
         AND id != ?
         AND status != 'Cancelled' 
         AND ABS(TIMESTAMPDIFF(MINUTE, appointment_date, ?)) < 30`,
        [appt.doctor_id, id, appointment_date]
      );

      if (conflicts.length > 0) {
        return res.status(409).json({ message: 'Doctor conflict: Rescheduled time overlaps with another active appointment.' });
      }

      updates.push('appointment_date = ?');
      params.push(appointment_date);
    }
    if (notes !== undefined) {
      updates.push('notes = ?');
      params.push(notes);
    }

    if (updates.length === 0) {
      return res.status(400).json({ message: 'No fields provided to update' });
    }

    sql += updates.join(', ') + ' WHERE id = ?';
    params.push(id);

    await query(sql, params);

    await logAudit(
      user.id, 
      'APPOINTMENT_UPDATED', 
      `Appointment (ID: ${id}) updated. Status: ${status || appt.status}. Rescheduled: ${appointment_date ? 'Yes' : 'No'}`, 
      clientIp
    );

    res.status(200).json({ message: 'Appointment updated successfully' });

  } catch (error) {
    console.error('Update appointment error:', error);
    res.status(500).json({ message: 'Internal server error updating appointment' });
  }
}

// Delete appointment (Admin only)
async function deleteAppointment(req, res) {
  const { id } = req.params;
  const adminId = req.user.id;
  const clientIp = req.ip || req.connection.remoteAddress;

  try {
    const check = await query('SELECT id FROM appointments WHERE id = ?', [id]);
    if (check.length === 0) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    await query('DELETE FROM appointments WHERE id = ?', [id]);
    await logAudit(adminId, 'APPOINTMENT_DELETED', `Deleted appointment ID: ${id}`, clientIp);

    res.status(200).json({ message: 'Appointment deleted successfully' });
  } catch (error) {
    console.error('Delete appointment error:', error);
    res.status(500).json({ message: 'Internal server error deleting appointment' });
  }
}

module.exports = {
  getAppointments,
  createAppointment,
  updateAppointment,
  deleteAppointment,
};
