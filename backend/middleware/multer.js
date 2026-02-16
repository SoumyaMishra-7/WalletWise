const multer = require('multer');

const storage = multer.memoryStorage();

const singleUpload = multer({
    storage,
    limits: {
        fileSize: 2 * 1024 * 1024 // Limit to 2MB
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only images are allowed'), false);
        }
    }
}).single('file');

module.exports = singleUpload;
