const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const categoryController = require('../controllers/categoryController');

// GET    /api/categories      — list built-in + custom categories for the user
router.get('/', protect, categoryController.getCategories);

// POST   /api/categories      — create a custom category
router.post('/', protect, categoryController.createCategory);

// PUT    /api/categories/:id  — update a custom category
router.put('/:id', protect, categoryController.updateCategory);

// DELETE /api/categories/:id  — delete a custom category (?reassign=true to move txns to 'other')
router.delete('/:id', protect, categoryController.deleteCategory);

module.exports = router;
