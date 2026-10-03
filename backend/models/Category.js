const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
    minlength: [2, 'Category name must be at least 2 characters'],
    maxlength: [30, 'Category name must be at most 30 characters'],
    match: [/^[a-zA-Z0-9 _-]+$/, 'Category name contains invalid characters']
  },
  type: {
    type: String,
    enum: ['expense', 'income', 'both'],
    default: 'both'
  },
  color: {
    type: String,
    default: '#667eea',
    match: [/^#[0-9a-fA-F]{6}$/, 'Color must be a hex code like #667eea']
  },
  icon: {
    type: String,
    default: ''
  }
}, { timestamps: true });

categorySchema.index(
  { userId: 1, name: 1 },
  { unique: true, collation: { locale: 'en', strength: 2 } }
);

module.exports = mongoose.model('Category', categorySchema);
