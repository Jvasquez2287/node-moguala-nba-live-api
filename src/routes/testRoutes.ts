import express from 'express';
import path from 'path';
import fs from 'fs'; 

const router = express.Router();

router.get('/', (req, res) => {
  return res.json({ success: true, message: 'Test endpoint is working!' });
});



export default router;