import express from 'express';
import multer from 'multer';
import { protect } from '../middleware/authMiddleware.js';
import { uploadReceipt } from '../controllers/uploadController.js';
import fs from 'fs';
import path from 'path';

const router = express.Router();

// Simple local storage configuration
const storage = multer.diskStorage({
  destination(req, file, cb) {
    const uploadPath = 'uploads/';
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename(req, file, cb) {
    cb(null, `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
});

router.post('/receipt', protect, upload.single('receipt'), uploadReceipt);

export default router;
