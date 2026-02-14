
const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    amount: {
        type: Number,
        required: true,
        min: 0
    },
    currency: {
        type: String,
        default: 'INR'
    },
    billingCycle: {
        type: String,
        enum: ['monthly', 'yearly', 'weekly'],
        default: 'monthly'
    },
    nextDueDate: {
        type: Date,
        required: true
    },
    category: {
        type: String,
        default: 'Utilities'
    },
    provider: {
        type: String,
        trim: true
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

module.exports = mongoose.model('Subscription', subscriptionSchema);
