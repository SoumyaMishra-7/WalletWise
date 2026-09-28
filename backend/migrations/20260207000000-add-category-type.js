const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/walletwise';

const budgetSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  totalBudget: Number,
  categories: [{
    name: String,
    categoryType: String,
    amount: Number,
    percentage: Number,
    color: String
  }],
  month: String,
  isActive: Boolean
}, { timestamps: true });

const Budget = mongoose.model('Budget', budgetSchema);

const inferCategoryType = (name) => {
  const normalized = String(name || '').toLowerCase();

  const mapping = {
         food: ['food', 'grocery', 'groceries', 'dining', 'meal', 'meals', 'eating', 'restaurant', 'restaurants', 'snacks'],
    transport: ['transport', 'transportation', 'travel', 'commute', 'fuel', 'gas', 'uber', 'taxi'],
    shopping: ['shopping', 'shop', 'clothes', 'clothing'],
    entertainment: ['entertainment', 'entertain', 'fun', 'leisure', 'movie', 'movies'],
    education: ['education', 'school', 'study'],
    healthcare: ['healthcare', 'health', 'medical', 'medicine'],
    housing: ['housing', 'rent', 'home', 'utility', 'utilities']
  };

  for (const [type, keywords] of Object.entries(mapping)) {
    if (keywords.some(keyword => new RegExp(`\\b${keyword}\\b`).test(normalized))) {
      return type;
    }
  }

  return 'other';
};

async function migrate() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected\n');

    const budgets = await Budget.find({});
    console.log(`📊 Found ${budgets.length} budgets\n`);

    let updated = 0;

    for (const budget of budgets) {
      let needsUpdate = false;

      budget.categories.forEach(cat => {
        if (!cat.categoryType) {
          cat.categoryType = inferCategoryType(cat.name);
          needsUpdate = true;
          console.log(`  "${cat.name}" → ${cat.categoryType}`);
        }
      });

      if (needsUpdate) {
        await budget.save();
        updated++;
      }
    }

    console.log(`\n✅ Updated ${updated} budgets`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
  }
}

if (require.main === module) {
  migrate();
}

module.exports = { inferCategoryType };
