const multer = require('multer');

const storage = multer.memoryStorage();

const upload = multer({
    storage,
    limits: {
        fileSize: 2 * 1024 * 1024 // 2MB limit
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'Only image files are allowed'), false);
        }
    }
});

/**
 * Wraps multer's single-file upload to return a structured JSON error
 * instead of an unhandled exception when MulterError occurs.
 *
 * Handles:
 *   LIMIT_FILE_SIZE → 400 "File is too large. Maximum allowed size is 2MB."
 *   Other MulterErrors → 400 with multer's message
 *   Non-image files → 400 "Only image files are allowed."
 */
const singleUpload = (req, res, next) => {
    upload.single('file')(req, res, (err) => {
        if (!err) return next();

        if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({
                    success: false,
                    message: 'File is too large. Maximum allowed size is 2MB.'
                });
            }
            return res.status(400).json({
                success: false,
                message: `Upload error: ${err.message}`
            });
        }

        // Non-multer errors (e.g. file type rejection)
        return res.status(400).json({
            success: false,
            message: err.message || 'File upload failed.'
        });
    });
};

module.exports = singleUpload;

