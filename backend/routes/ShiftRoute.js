const express = require('express');
const multer = require('multer');
const router = express.Router();
const requireAuth = require('../middleware/RequireAuth');
const {
  submitShift,
  updateShift,
  deleteShift,
  getShifts,
  getShift,
  synchronizeReadings,
  aiUploadShift
} = require('../controllers/ShiftController');

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit per file
  },
  fileFilter: (req, file, cb) => {
    // Only allow images
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

const requireAdmin = require('../middleware/RequireAdmin')

router.use(requireAuth);

router.post('/submit', submitShift);
router.post('/synchronize-readings', synchronizeReadings); // For current user
router.post('/synchronize-readings/:userId', synchronizeReadings); // For admin use with specific user
router.post('/ai-upload', upload.single('image'), aiUploadShift);

router.use(requireAuth)
router.use(requireAdmin)

router.patch('/update/:id', updateShift);
router.delete('/delete/:id', deleteShift);
router.get('/search', getShifts);     // Get with pagination and/or date filters
router.get('/:id', getShift)


module.exports = router;
