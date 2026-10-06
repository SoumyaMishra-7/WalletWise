const Category = require('../models/Category');
const Transaction = require('../models/Transactions');
const { CATEGORIES } = require('../constants/categories');
const { isValidObjectId } = require('../utils/validation');

// GET /api/categories — returns built-in + user's custom categories
const getCategories = async (req, res) => {
  try {
    const custom = await Category.find({ userId: req.userId }).sort({ name: 1 });
    const customNames = custom.map(c => c.name.toLowerCase());

    const builtIn = CATEGORIES.map(name => ({
      id: null,
      name,
      type: 'both',
      color: '#667eea',
      icon: null,
      isBuiltIn: true
    }));

    const customFormatted = custom.map(c => ({ ...c.toJSON(), isBuiltIn: false }));

    // Merge: built-in categories that haven't been shadowed by a custom one
    const merged = [
      ...builtIn.filter(b => !customNames.includes(b.name.toLowerCase())),
      ...customFormatted
    ].sort((a, b) => a.name.localeCompare(b.name));

    res.json({ success: true, categories: merged });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch categories' });
  }
};

// POST /api/categories — create a custom category
const createCategory = async (req, res) => {
  try {
    const { name, type, color, icon } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Category name is required' });
    }

    // Reject clashes with built-in categories
    const trimmedName = name.trim();
    const isBuiltIn = CATEGORIES.some(b => b.toLowerCase() === trimmedName.toLowerCase());
    if (isBuiltIn) {
      return res.status(409).json({
        success: false,
        message: `"${trimmedName}" is a built-in category and cannot be overridden`
      });
    }

    const category = new Category({
      userId: req.userId,
      name: trimmedName,
      type: type || 'both',
      color: color || '#667eea',
      icon: icon || null
    });

    await category.save();
    res.status(201).json({ success: true, category: category.toJSON() });

  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: 'A category with this name already exists' });
    }
    if (error.name === 'ValidationError') {
      const message = Object.values(error.errors).map(e => e.message).join(', ');
      return res.status(400).json({ success: false, message });
    }
    console.error('Create category error:', error);
    res.status(500).json({ success: false, message: 'Failed to create category' });
  }
};

// PUT /api/categories/:id — update a custom category
const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid category ID' });
    }

    const category = await Category.findOne({ _id: id, userId: req.userId });
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    const { name, type, color, icon } = req.body;

    if (name !== undefined) {
      const trimmedName = name.trim();
      const isBuiltIn = CATEGORIES.some(b => b.toLowerCase() === trimmedName.toLowerCase());
      if (isBuiltIn) {
        return res.status(409).json({
          success: false,
          message: `"${trimmedName}" is a built-in category name`
        });
      }
      category.name = trimmedName;
    }
    if (type !== undefined) category.type = type;
    if (color !== undefined) category.color = color;
    if (icon !== undefined) category.icon = icon;

    await category.save();
    res.json({ success: true, category: category.toJSON() });

  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: 'A category with this name already exists' });
    }
    if (error.name === 'ValidationError') {
      const message = Object.values(error.errors).map(e => e.message).join(', ');
      return res.status(400).json({ success: false, message });
    }
    console.error('Update category error:', error);
    res.status(500).json({ success: false, message: 'Failed to update category' });
  }
};

// DELETE /api/categories/:id — delete a custom category
const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid category ID' });
    }

    const category = await Category.findOne({ _id: id, userId: req.userId });
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    // Check if any transactions use this category
    const inUseCount = await Transaction.countDocuments({
      userId: req.userId,
      category: { $regex: new RegExp(`^${category.name}$`, 'i') }
    });

    if (inUseCount > 0) {
      const { reassign } = req.query;
      if (reassign === 'true') {
        // Reassign all transactions that use this category to 'other'
        await Transaction.updateMany(
          { userId: req.userId, category: { $regex: new RegExp(`^${category.name}$`, 'i') } },
          { $set: { category: 'other' } }
        );
      } else {
        return res.status(409).json({
          success: false,
          message: `This category is used by ${inUseCount} transaction(s). Add ?reassign=true to reassign them to "other" before deleting.`,
          inUseCount
        });
      }
    }

    await category.deleteOne();
    res.json({ success: true, message: 'Category deleted successfully' });

  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete category' });
  }
};

module.exports = { getCategories, createCategory, updateCategory, deleteCategory };
