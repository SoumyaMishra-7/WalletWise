const { z } = require('zod');
const Category = require('../models/Category');
const Transaction = require('../models/Transactions');
const { CATEGORIES } = require('../constants/categories');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');

const categoryInput = z.object({
  name: z.string().trim().min(2).max(30).regex(/^[a-zA-Z0-9 _-]+$/),
  type: z.enum(['expense', 'income', 'both']).optional().default('both'),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional().default('#667eea'),
  icon: z.string().max(30).optional().default('')
});

const isBuiltIn = (name) => CATEGORIES.includes(String(name).toLowerCase());

const listCategories = catchAsync(async (req, res) => {
  const custom = await Category.find({ userId: req.userId }).sort({ name: 1 }).lean();
  res.json({
    success: true,
    builtIn: CATEGORIES,
    custom
  });
});

const createCategory = catchAsync(async (req, res) => {
  const parsed = categoryInput.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(parsed.error.errors[0]?.message || 'Invalid input', 400);
  }
  const name = parsed.data.name.trim();
  if (isBuiltIn(name)) {
    throw new AppError('A built-in category with this name already exists', 409);
  }
  const existing = await Category.findOne({
    userId: req.userId,
    name: { $regex: `^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' }
  });
  if (existing) {
    throw new AppError('You already have a category with this name', 409);
  }
  const category = await Category.create({ userId: req.userId, ...parsed.data, name });
  res.status(201).json({ success: true, category });
});

const updateCategory = catchAsync(async (req, res) => {
  const parsed = categoryInput.partial().safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(parsed.error.errors[0]?.message || 'Invalid input', 400);
  }
  const category = await Category.findOne({ _id: req.params.id, userId: req.userId });
  if (!category) {
    throw new AppError('Category not found', 404);
  }
  if (parsed.data.name !== undefined) {
    const name = parsed.data.name.trim();
    if (isBuiltIn(name)) {
      throw new AppError('A built-in category with this name already exists', 409);
    }
    const clash = await Category.findOne({
      _id: { $ne: category._id },
      userId: req.userId,
      name: { $regex: `^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' }
    });
    if (clash) {
      throw new AppError('You already have a category with this name', 409);
    }
    const inUse = await Transaction.countDocuments({
      userId: req.userId,
      category: category.name.toLowerCase()
    });
    if (inUse > 0 && name.toLowerCase() !== category.name.toLowerCase()) {
      await Transaction.updateMany(
        { userId: req.userId, category: category.name.toLowerCase() },
        { $set: { category: name.toLowerCase() } }
      );
    }
    category.name = name;
  }
  if (parsed.data.type !== undefined) category.type = parsed.data.type;
  if (parsed.data.color !== undefined) category.color = parsed.data.color;
  if (parsed.data.icon !== undefined) category.icon = parsed.data.icon;
  await category.save();
  res.json({ success: true, category });
});

const deleteCategory = catchAsync(async (req, res) => {
  const category = await Category.findOne({ _id: req.params.id, userId: req.userId });
  if (!category) {
    throw new AppError('Category not found', 404);
  }
  const inUse = await Transaction.countDocuments({
    userId: req.userId,
    category: category.name.toLowerCase()
  });
  if (inUse > 0) {
    throw new AppError(`Category is used by ${inUse} transaction(s). Rename it or move those transactions to another category first.`, 409);
  }
  await Category.deleteOne({ _id: category._id });
  res.json({ success: true, message: 'Category deleted' });
});

module.exports = { listCategories, createCategory, updateCategory, deleteCategory };
