const express = require('express');
const router = express.Router();
const {
  getRecords,
  getRecordById,
  createRecord,
  updateRecord,
  deleteRecord,
  downloadRecordPDF,
} = require('../controllers/recordController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

router.use(authenticateToken);

router.get('/', authorizeRoles('Admin', 'Doctor', 'Patient'), getRecords);
router.get('/:id', authorizeRoles('Admin', 'Doctor', 'Patient'), getRecordById);
router.post('/', authorizeRoles('Admin', 'Doctor'), createRecord);
router.put('/:id', authorizeRoles('Admin', 'Doctor'), updateRecord);
router.delete('/:id', authorizeRoles('Admin'), deleteRecord);
router.get('/:id/pdf', authorizeRoles('Admin', 'Doctor', 'Patient'), downloadRecordPDF);

module.exports = router;
