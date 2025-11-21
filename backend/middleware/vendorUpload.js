const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = path.join(__dirname, '..', 'uploads', 'vendors');

// make sure folder exists
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `${req.user._id}-${file.fieldname}-${Date.now()}${ext}`);
    }
});

const allowedExts = ['.png', '.jpg', '.jpeg', '.pdf'];

const fileFilter = (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowedExts.includes(ext)) {
        return cb(new Error('Only png, jpg, jpeg, and pdf files are allowed'));
    }
    cb(null, true);
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // 5 MB
});

// we expect TWO possible fields:
// - taxCard (usually pdf or image)
// - logo    (image)
module.exports = upload.fields([
    { name: 'taxCard', maxCount: 1 },
    { name: 'logo', maxCount: 1 }
]);
