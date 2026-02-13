"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const router = express_1.default.Router();
router.get('/', (req, res) => {
    return res.json({ success: true, message: 'Test endpoint is working!' });
});
router.get('/convert', (req, res) => {
    try {
        const logoPath = path_1.default.join(__dirname, '..', '..', 'public', `app_Logo.png`);
        if (!fs_1.default.existsSync(logoPath)) {
            return res.status(404).json({ success: false, error: 'Logo not found' });
        }
        const logoData = fs_1.default.readFileSync(logoPath);
        res.setHeader('Content-Type', 'image/png');
        return res.send(logoData);
    }
    catch (error) {
        console.error('Error fetching logo:', error);
        return res.status(500).json({ success: false, error: 'Failed to fetch logo' });
    }
});
exports.default = router;
//# sourceMappingURL=testRoutes.js.map