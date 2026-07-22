const express = require('express');
const router = express.Router();
const {
  getAllDoctors,
  getSpecialties,
  getDoctorById,
  createDoctor,
  updateDoctor,
  deleteDoctor,
} = require('../controllers/doctorController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

router.use(authenticateToken);

router.get('/', getAllDoctors);
router.get('/specialties', getSpecialties);
router.get('/:id', getDoctorById);
router.post('/', authorizeRoles('Admin'), createDoctor);
router.put('/:id', authorizeRoles('Admin', 'Doctor'), updateDoctor);
router.delete('/:id', authorizeRoles('Admin'), deleteDoctor);

module.exports = router;
