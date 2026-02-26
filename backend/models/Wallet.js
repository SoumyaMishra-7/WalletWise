const mongoose = require('mongoose');

const walletSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Wallet name is required'],
    trim: true,
    maxlength: [50, 'Name cannot be more than 50 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [200, 'Description cannot be more than 200 characters']
  },
  currency: {
    type: String,
    required: true,
    default: 'USD'
  },
  balance: {
    type: Number,
    default: 0
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  members: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    role: {
      type: String,
      enum: ['admin', 'member'],
      default: 'member'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }],
}, { timestamps: true });

// Ensure owner is always an admin member
walletSchema.pre('save', function(next) {
  if (this.isNew) {
    const isOwnerInMembers = this.members.some(m => m.user.toString() === this.owner.toString());
    if (!isOwnerInMembers) {
      this.members.push({ user: this.owner, role: 'admin' });
    }
  }
  next();
});

module.exports = mongoose.model('Wallet', walletSchema);
