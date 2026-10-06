const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: [true, 'Category name is required'],
    trim: true,
    minlength: [2, 'Category name must be at least 2 characters'],
    maxlength: [30, 'Category name cannot exceed 30 characters'],
    match: [/^[a-zA-Z0-9 _-]+$/, 'Category name may only contain letters, numbers, spaces, underscores, and hyphens']
  },
  type: {
    type: String,
    enum: ['expense', 'income', 'both'],
    default: 'both'
  },
  color: {
    type: String,
    default: '#667eea',
    match: [/^#[0-9a-fA-F]{6}$/, 'Color must be a valid 6-digit hex color']
  },
  icon: {
    type: String,
    default: null,
    trim: true
  }
}, {
  timestamps: true
});

// Case-insensitive unique index per user
categorySchema.index(
  { userId: 1, name: 1 },
  { unique: true, collation: { locale: 'en', strength: 2 } }
);

categorySchema.methods.toJSON = function () {
  const obj = this.toObject();
  obj.id = obj._id;
  delete obj._id;
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model('Category', categorySchema);
