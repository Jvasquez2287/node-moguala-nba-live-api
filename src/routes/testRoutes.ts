import express from 'express';
import path from 'path';
import fs from 'fs'; 

const router = express.Router();

router.get('/', (req, res) => {
  return res.json({ success: true, message: 'Test endpoint is working!' });
});


router.get('/convert', (req, res) => {
  try {
    const logoPath = path.join(__dirname,'..', '..', 'public', `app_Logo.png`);
    if(!fs.existsSync(logoPath)) {
      return res.status(404).json({ success: false, error: 'Logo not found' });
    }
    const logoData = fs.readFileSync(logoPath);
    res.setHeader('Content-Type', 'image/png');
    return res.send(logoData);
  } catch (error) {
    console.error('Error fetching logo:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch logo' });
  }
});


export default router;