const express = require('express');
const router = express.Router();
const {
  getAllPatients,
  getPatientById,
  createPatient,
  updatePatient,
  deletePatient,
  getPatientRecords,
  getPatientAppointments,
} = require('../controllers/patientController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// Apply base authentication to all patient routes
router.use(authenticateToken);

router.get('/', authorizeRoles('Admin', 'Doctor', 'Receptionist'), getAllPatients);
router.get('/:id', getPatientById);
router.post('/', authorizeRoles('Admin', 'Receptionist'), createPatient);
router.put('/:id', updatePatient);
router.delete('/:id', authorizeRoles('Admin'), deletePatient);
router.get('/:id/records', getPatientRecords);
router.get('/:id/appointments', getPatientAppointments);

module.exports = router;
