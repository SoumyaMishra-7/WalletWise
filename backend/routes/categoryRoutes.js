const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const categoryController = require('../controllers/categoryController');

router.get('/', protect, categoryController.listCategories);
router.post('/', protect, categoryController.createCategory);
router.put('/:id', protect, categoryController.updateCategory);
router.delete('/:id', protect, categoryController.deleteCategory);

module.exports = router;
