const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const dotenv = require("dotenv");
const passport = require("passport");
const { configurePassport } = require("./config/passport");
const authRoutes = require("./routes/authRoutes");
const oauthRoutes = require("./routes/oauthRoutes");
const { protect } = require("./middleware/auth");
dotenv.config();

// Initialize Express app
const app = express();

// ==================== ENHANCED ERROR LOGGING ====================
process.on("uncaughtException", (error) => {
  console.error("❌ UNCAUGHT EXCEPTION:", error);
  if (process.env.NODE_ENV === "production") {
    process.exit(1);
  }
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ UNHANDLED REJECTION at:", promise, "reason:", reason);
});

// ==================== MIDDLEWARE SETUP ====================

// CORS Configuration
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

// Body parsers
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Cookie parser
app.use(cookieParser());

// Passport setup (Google OAuth)
configurePassport();
app.use(passport.initialize());

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`\n═══════════════════════════════════════════════════`);
  console.log(`📨 ${timestamp} - ${req.method} ${req.originalUrl}`);
  console.log(`🌍 Origin: ${req.headers.origin || "No origin"}`);
  console.log(
    `🔑 Auth Header: ${req.headers.authorization || "No auth header"}`,
  );
  console.log(`🍪 Cookies:`, req.cookies);

  if (req.method === "POST" || req.method === "PUT" || req.method === "PATCH") {
    console.log(`📝 Request Body:`, JSON.stringify(req.body, null, 2));
  }

  next();
});

// ==================== DATABASE CONNECTION ====================
const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/walletwise";

console.log(`🔗 Connecting to MongoDB: ${MONGODB_URI}`);

mongoose
  .connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  })
  .then(() => {
    console.log("✅ MongoDB Connected Successfully");
    console.log(`📊 Database: ${mongoose.connection.name}`);
    console.log(
      `📈 Collections:`,
      mongoose.connection.collections
        ? Object.keys(mongoose.connection.collections)
        : "Not loaded yet",
    );
  })
  .catch((err) => {
    console.error("❌ MongoDB Connection Error:", err.message);
    console.log("\n💡 Troubleshooting Tips:");
    console.log("1. Check if MongoDB service is running");
    console.log(
      '2. Start MongoDB: "mongod" in terminal or "net start MongoDB" in Admin PowerShell',
    );
    console.log(
      "3. Check .env file has: MONGODB_URI=mongodb://localhost:27017/walletwise",
    );
    process.exit(1);
  });

// ==================== MODELS ====================

// User Model
const User = require("./models/User");
const Transaction = require("./models/Transactions");

// Budget Model
const budgetSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    totalBudget: {
      type: Number,
      required: [true, "Total budget amount is required"],
      min: [1, "Budget amount must be greater than 0"],
    },
    categories: [
      {
        name: {
          type: String,
          required: true,
          trim: true,
        },
        amount: {
          type: Number,
          required: true,
          min: 0,
        },
        percentage: {
          type: Number,
          required: true,
          min: 0,
          max: 100,
        },
        color: {
          type: String,
          default: "#667eea",
        },
      },
    ],
    month: {
      type: String,
      required: true,
      match: [/^\d{4}-\d{2}$/, "Month must be in YYYY-MM format"],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
);

// Create compound index for user and month
budgetSchema.index({ userId: 1, month: 1 }, { unique: true });

// Pre-save hook to update updatedAt
budgetSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

// Savings Goal Model - SIMPLIFIED
const savingsGoalSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  name: {
    type: String,
    required: [true, "Goal name is required"],
    trim: true,
  },
  description: {
    type: String,
    trim: true,
    default: "",
  },
  targetAmount: {
    type: Number,
    required: [true, "Target amount is required"],
    min: [1, "Target amount must be greater than 0"],
  },
  currentAmount: {
    type: Number,
    default: 0,
    min: [0, "Current amount cannot be negative"],
  },
  targetDate: {
    type: Date,
    required: [true, "Target date is required"],
  },
  category: {
    type: String,
    default: "Other",
  },
  priority: {
    type: String,
    default: "Medium",
  },
  monthlyContribution: {
    type: Number,
    default: 0,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  progress: {
    type: Number,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Calculate progress before saving
savingsGoalSchema.pre("save", function (next) {
  if (this.targetAmount > 0) {
    this.progress = Math.min(
      100,
      (this.currentAmount / this.targetAmount) * 100,
    );
  } else {
    this.progress = 0;
  }
  this.updatedAt = new Date();
  next();
});

// Create models
const Budget = mongoose.model("Budget", budgetSchema);
const SavingsGoal = mongoose.model("SavingsGoal", savingsGoalSchema);

// ==================== HELPER FUNCTIONS ====================

// Simple sanitization
const sanitizeInput = (req, res, next) => {
  if (req.body) {
    for (let key in req.body) {
      if (typeof req.body[key] === "string") {
        req.body[key] = req.body[key].trim();
      }
    }
  }
  next();
};

// ==================== AUTH ROUTES ====================

app.use("/api/auth", authRoutes);
app.use("/auth", oauthRoutes);

// ==================== BUDGET ROUTES ====================

// Set/Update Budget
app.post("/api/budget", protect, sanitizeInput, async (req, res) => {
  try {
    console.log("\n💰 SET BUDGET REQUEST");
    console.log("User ID:", req.userId);
    console.log("Request body:", req.body);

    const { totalBudget, categories, month } = req.body;

    // Validation
    if (!totalBudget || totalBudget <= 0) {
      return res.status(400).json({
        success: false,
        message: "Valid total budget amount is required",
      });
    }

    if (!categories || !Array.isArray(categories) || categories.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one category is required",
      });
    }

    // Validate categories
    let totalPercentage = 0;
    let totalAmount = 0;

    for (const category of categories) {
      if (
        !category.name ||
        category.amount === undefined ||
        category.percentage === undefined
      ) {
        return res.status(400).json({
          success: false,
          message: "Each category must have name, amount, and percentage",
        });
      }

      if (category.percentage < 0 || category.percentage > 100) {
        return res.status(400).json({
          success: false,
          message: `Percentage for ${category.name} must be between 0 and 100`,
        });
      }

      if (category.amount < 0) {
        return res.status(400).json({
          success: false,
          message: `Amount for ${category.name} cannot be negative`,
        });
      }

      totalPercentage += category.percentage;
      totalAmount += category.amount;
    }

    // Check if percentages sum to 100
    if (Math.abs(totalPercentage - 100) > 0.01) {
      return res.status(400).json({
        success: false,
        message: `Total percentage must be 100%. Currently ${totalPercentage.toFixed(2)}%`,
      });
    }

    // Check if total amount matches sum of categories
    if (Math.abs(totalAmount - totalBudget) > 0.01) {
      return res.status(400).json({
        success: false,
        message: `Sum of category amounts (${totalAmount}) must equal total budget (${totalBudget})`,
      });
    }

    // Determine month (use current month if not provided)
    const budgetMonth = month || new Date().toISOString().slice(0, 7);

    // Validate month format
    const monthRegex = /^\d{4}-\d{2}$/;
    if (!monthRegex.test(budgetMonth)) {
      return res.status(400).json({
        success: false,
        message: "Month must be in YYYY-MM format",
      });
    }

    // Check if budget for this month already exists
    let budget = await Budget.findOne({
      userId: req.userId,
      month: budgetMonth,
      isActive: true,
    });

    if (budget) {
      // Update existing budget
      budget.totalBudget = totalBudget;
      budget.categories = categories;
      budget.updatedAt = new Date();
      await budget.save();
      console.log("✅ Budget updated:", budget._id);
    } else {
      // Create new budget
      budget = new Budget({
        userId: req.userId,
        totalBudget,
        categories,
        month: budgetMonth,
        isActive: true,
      });
      await budget.save();
      console.log("✅ Budget created:", budget._id);
    }

    // Send success response
    res.status(200).json({
      success: true,
      message: "Budget set successfully! 🎉",
      notification: {
        type: "success",
        title: "Budget Set",
        message: `Your monthly budget of ₹${totalBudget.toLocaleString()} has been set successfully.`,
        timestamp: new Date().toISOString(),
      },
      budget: {
        id: budget._id,
        totalBudget: budget.totalBudget,
        categories: budget.categories,
        month: budget.month,
        createdAt: budget.createdAt,
        updatedAt: budget.updatedAt,
      },
    });
  } catch (error) {
    console.error("❌ Set budget error:", error);

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Budget for this month already exists",
      });
    }

    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        success: false,
        message: messages.join(", "),
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to set budget. Please try again.",
    });
  }
});

// Get Current Budget
app.get("/api/budget/current", protect, async (req, res) => {
  try {
    console.log("\n📊 GET CURRENT BUDGET REQUEST");
    console.log("User ID:", req.userId);

    const currentMonth = new Date().toISOString().slice(0, 7);
    const budget = await Budget.findOne({
      userId: req.userId,
      month: currentMonth,
      isActive: true,
    });

    if (!budget) {
      return res.status(404).json({
        success: false,
        message: "No budget set for current month",
        hasBudget: false,
        notification: {
          type: "info",
          title: "No Budget Found",
          message:
            'You have not set a budget for this month. Click "Set Budget" to create one.',
          timestamp: new Date().toISOString(),
        },
      });
    }

    res.json({
      success: true,
      hasBudget: true,
      message: "Budget found for current month",
      budget: {
        id: budget._id,
        totalBudget: budget.totalBudget,
        categories: budget.categories,
        month: budget.month,
        createdAt: budget.createdAt,
        updatedAt: budget.updatedAt,
      },
    });
  } catch (error) {
    console.error("Get current budget error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch budget",
    });
  }
});

// Get Budget by Month
app.get("/api/budget/:month", protect, async (req, res) => {
  try {
    const { month } = req.params;
    const userId = req.userId;

    // Validate month format
    const monthRegex = /^\d{4}-\d{2}$/;
    if (!monthRegex.test(month)) {
      return res.status(400).json({
        success: false,
        message: "Month must be in YYYY-MM format",
      });
    }

    const budget = await Budget.findOne({
      userId,
      month,
      isActive: true,
    });

    if (!budget) {
      return res.status(404).json({
        success: false,
        message: `No budget found for ${month}`,
        hasBudget: false,
      });
    }

    res.json({
      success: true,
      hasBudget: true,
      budget: budget,
    });
  } catch (error) {
    console.error("Get budget by month error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch budget",
    });
  }
});

// Get All User Budgets
app.get("/api/budget", protect, async (req, res) => {
  try {
    const userId = req.userId;
    const budgets = await Budget.find({
      userId,
      isActive: true,
    }).sort({ month: -1 });

    res.json({
      success: true,
      count: budgets.length,
      budgets: budgets.map((budget) => ({
        id: budget._id,
        totalBudget: budget.totalBudget,
        categories: budget.categories,
        month: budget.month,
        createdAt: budget.createdAt,
        updatedAt: budget.updatedAt,
      })),
    });
  } catch (error) {
    console.error("Get all budgets error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch budgets",
    });
  }
});

// Copy Previous Month's Budget
app.post("/api/budget/copy-previous", protect, async (req, res) => {
  try {
    console.log("\n📋 COPY PREVIOUS MONTH BUDGET REQUEST");
    console.log("User ID:", req.userId);

    const currentDate = new Date();
    const previousMonth = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() - 1,
      1,
    )
      .toISOString()
      .slice(0, 7);

    const previousBudget = await Budget.findOne({
      userId: req.userId,
      month: previousMonth,
      isActive: true,
    });

    if (!previousBudget) {
      return res.status(404).json({
        success: false,
        message: "No previous month budget found to copy",
      });
    }

    const currentMonth = currentDate.toISOString().slice(0, 7);

    // Check if current month budget already exists
    const existingBudget = await Budget.findOne({
      userId: req.userId,
      month: currentMonth,
      isActive: true,
    });

    if (existingBudget) {
      return res.status(400).json({
        success: false,
        message: "Budget for current month already exists",
      });
    }

    // Create new budget for current month
    const newBudget = new Budget({
      userId: previousBudget.userId,
      totalBudget: previousBudget.totalBudget,
      categories: previousBudget.categories.map((cat) => ({
        name: cat.name,
        amount: cat.amount,
        percentage: cat.percentage,
        color: cat.color,
      })),
      month: currentMonth,
      isActive: true,
    });

    await newBudget.save();

    res.status(201).json({
      success: true,
      message: "Previous month budget copied successfully!",
      notification: {
        type: "success",
        title: "Budget Copied",
        message: `Budget of ₹${newBudget.totalBudget.toLocaleString()} has been copied from previous month.`,
        timestamp: new Date().toISOString(),
      },
      budget: {
        id: newBudget._id,
        totalBudget: newBudget.totalBudget,
        categories: newBudget.categories,
        month: newBudget.month,
        createdAt: newBudget.createdAt,
      },
    });
  } catch (error) {
    console.error("Copy previous budget error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to copy previous month budget",
    });
  }
});

// Delete/Deactivate Budget
app.delete("/api/budget/:id", protect, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const budget = await Budget.findOne({
      _id: id,
      userId,
    });

    if (!budget) {
      return res.status(404).json({
        success: false,
        message: "Budget not found",
      });
    }

    // Soft delete by setting isActive to false
    budget.isActive = false;
    await budget.save();

    res.json({
      success: true,
      message: "Budget deleted successfully",
    });
  } catch (error) {
    console.error("Delete budget error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete budget",
    });
  }
});

// Update Budget
app.put("/api/budget/:id", protect, sanitizeInput, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;
    const updates = req.body;

    const budget = await Budget.findOne({
      _id: id,
      userId,
      isActive: true,
    });

    if (!budget) {
      return res.status(404).json({
        success: false,
        message: "Budget not found",
      });
    }

    // Validate if updating
    if (updates.categories) {
      const totalPercentage = updates.categories.reduce(
        (sum, cat) => sum + cat.percentage,
        0,
      );
      if (Math.abs(totalPercentage - 100) > 0.01) {
        return res.status(400).json({
          success: false,
          message: `Total percentage must be 100%. Currently ${totalPercentage.toFixed(2)}%`,
        });
      }
    }

    // Update fields
    Object.keys(updates).forEach((key) => {
      if (key !== "_id" && key !== "userId" && key !== "month") {
        budget[key] = updates[key];
      }
    });

    await budget.save();

    res.json({
      success: true,
      message: "Budget updated successfully",
      notification: {
        type: "success",
        title: "Budget Updated",
        message: `Your budget has been updated successfully.`,
        timestamp: new Date().toISOString(),
      },
      budget: budget,
    });
  } catch (error) {
    console.error("Update budget error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update budget",
    });
  }
});

// Budget Summary/Statistics
app.get("/api/budget/stats/summary", protect, async (req, res) => {
  try {
    const userId = req.userId;
    const currentMonth = new Date().toISOString().slice(0, 7);
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const budget = await Budget.findOne({
      userId,
      month: currentMonth,
      isActive: true,
    });

    const monthlyExpenses = await Transaction.find({
      userId,
      type: "expense",
      date: { $gte: startOfMonth },
    });

    const totalSpent = monthlyExpenses.reduce((sum, tx) => sum + tx.amount, 0);

    if (!budget) {
      return res.json({
        success: true,
        hasBudget: false,
        message: "No budget set for current month",
        summary: {
          totalBudget: 0,
          categories: [],
          spent: totalSpent,
          remaining: 0,
          utilization: 0,
        },
      });
    }

    const normalize = (value) =>
      String(value || "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "");

    const categoryAliases = {
      food: ["food", "grocery", "grocer", "dining", "restaurant"],
      transport: [
        "transport",
        "travel",
        "fuel",
        "gas",
        "uber",
        "taxi",
        "bus",
        "train",
      ],
      shopping: ["shopping", "shop", "clothes", "apparel"],
      entertainment: ["entertain", "movie", "game", "fun", "subscription"],
      education: ["education", "school", "tuition", "course", "book"],
      healthcare: ["health", "medical", "doctor", "pharmacy"],
      housing: ["housing", "rent", "utility", "utilities", "home"],
      other: ["other", "misc"],
    };

    const spentByCategory = new Map();
    monthlyExpenses.forEach((tx) => {
      const key = normalize(tx.category);
      spentByCategory.set(key, (spentByCategory.get(key) || 0) + tx.amount);
    });

    const matchTransactionCategories = (categoryName) => {
      const normalized = normalize(categoryName);
      if (!normalized) return [];

      const directMatch = Object.keys(categoryAliases).find(
        (key) => key === normalized,
      );
      if (directMatch) return [directMatch];

      return Object.entries(categoryAliases)
        .filter(([, aliases]) =>
          aliases.some((alias) => normalized.includes(normalize(alias))),
        )
        .map(([key]) => key);
    };

    const categoriesWithSpend = budget.categories.map((category) => {
      const matches = matchTransactionCategories(category.name);
      const spent = matches.reduce(
        (sum, key) => sum + (spentByCategory.get(key) || 0),
        0,
      );
      return {
        ...category.toObject(),
        spent,
      };
    });

    const utilization =
      budget.totalBudget > 0
        ? Math.min((totalSpent / budget.totalBudget) * 100, 100)
        : 0;

    res.json({
      success: true,
      hasBudget: true,
      summary: {
        totalBudget: budget.totalBudget,
        categories: categoriesWithSpend.map((cat) => ({
          name: cat.name,
          allocated: cat.amount,
          spent: cat.spent,
          remaining: Math.max(cat.amount - cat.spent, 0),
          utilization:
            cat.amount > 0 ? Math.min((cat.spent / cat.amount) * 100, 100) : 0,
          color: cat.color,
        })),
        spent: totalSpent,
        remaining: Math.max(budget.totalBudget - totalSpent, 0),
        utilization,
      },
    });
  } catch (error) {
    console.error("Budget summary error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get budget summary",
    });
  }
});

// ==================== SAVINGS GOALS ROUTES ====================

// Create Savings Goal - SIMPLIFIED
app.post("/api/savings-goals", sanitizeInput, protect, async (req, res) => {
  try {
    console.log("\n🎯 CREATE SAVINGS GOAL REQUEST");
    console.log("User ID:", req.userId);
    console.log("Request body:", req.body);

    const {
      name,
      description = "",
      targetAmount,
      currentAmount = 0,
      targetDate,
      category = "Other",
      priority = "Medium",
      monthlyContribution = 0,
    } = req.body;

    // Basic validation
    if (!name || !targetAmount || !targetDate) {
      return res.status(400).json({
        success: false,
        message: "Name, target amount, and target date are required",
      });
    }

    // Parse amounts
    const parsedTarget = parseFloat(targetAmount);
    const parsedCurrent = parseFloat(currentAmount) || 0;
    const parsedMonthly = parseFloat(monthlyContribution) || 0;

    if (isNaN(parsedTarget) || parsedTarget <= 0) {
      return res.status(400).json({
        success: false,
        message: "Valid target amount is required",
      });
    }

    // Create goal
    const savingsGoal = new SavingsGoal({
      userId: req.userId,
      name: name.trim(),
      description: description.trim(),
      targetAmount: parsedTarget,
      currentAmount: parsedCurrent,
      targetDate: new Date(targetDate),
      category,
      priority,
      monthlyContribution: parsedMonthly,
      isActive: true,
    });

    console.log("Saving goal to database...");
    await savingsGoal.save();
    console.log("✅ Goal saved with ID:", savingsGoal._id);

    res.status(201).json({
      success: true,
      message: "Savings goal created successfully",
      goal: {
        id: savingsGoal._id,
        name: savingsGoal.name,
        targetAmount: savingsGoal.targetAmount,
        currentAmount: savingsGoal.currentAmount,
        targetDate: savingsGoal.targetDate,
        progress: savingsGoal.progress,
      },
    });
  } catch (error) {
    console.error("❌ Create savings goal error:", error);
    console.error("Error stack:", error.stack);

    let errorMessage = "Failed to create savings goal";

    if (error.name === "ValidationError") {
      errorMessage = Object.values(error.errors)
        .map((e) => e.message)
        .join(", ");
    } else if (error.code === 11000) {
      errorMessage = "Duplicate goal detected";
    }

    res.status(500).json({
      success: false,
      message: errorMessage,
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

// Get all savings goals
app.get("/api/savings-goals", protect, async (req, res) => {
  try {
    const goals = await SavingsGoal.find({
      userId: req.userId,
      isActive: true,
    });

    res.json({
      success: true,
      goals: goals.map((g) => ({
        id: g._id,
        name: g.name,
        targetAmount: g.targetAmount,
        currentAmount: g.currentAmount,
        targetDate: g.targetDate,
        progress: g.progress,
      })),
      count: goals.length,
    });
  } catch (error) {
    console.error("Get goals error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch goals" });
  }
});

// Add amount to a savings goal
app.patch(
  "/api/savings-goals/:id/add",
  sanitizeInput,
  protect,
  async (req, res) => {
    try {
      const goalId = req.params.id;
      const amount = parseFloat(req.body?.amount);

      if (!amount || isNaN(amount) || amount <= 0) {
        return res.status(400).json({
          success: false,
          message: "Valid amount is required",
        });
      }

      const goal = await SavingsGoal.findOne({
        _id: goalId,
        userId: req.userId,
        isActive: true,
      });

      if (!goal) {
        return res.status(404).json({
          success: false,
          message: "Goal not found",
        });
      }

      const nextAmount = Math.min(
        goal.targetAmount,
        goal.currentAmount + amount,
      );
      goal.currentAmount = nextAmount;
      await goal.save();

      res.json({
        success: true,
        message: "Amount added successfully",
        goal: {
          id: goal._id,
          name: goal.name,
          targetAmount: goal.targetAmount,
          currentAmount: goal.currentAmount,
          targetDate: goal.targetDate,
          progress: goal.progress,
          category: goal.category,
          isActive: goal.isActive,
        },
      });
    } catch (error) {
      console.error("Add amount error:", error);
      res.status(500).json({ success: false, message: "Failed to add amount" });
    }
  },
);

// ==================== TRANSACTION ROUTES ====================

// Add Transaction
app.post("/api/transactions", sanitizeInput, protect, async (req, res) => {
  try {
    const userId = req.userId;
    const { type, amount, category, description, paymentMethod, mood } =
      req.body;

    if (!type || !amount || !category) {
      return res.status(400).json({
        success: false,
        message: "Type, amount, and category are required",
      });
    }

    if (amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Amount must be greater than 0",
      });
    }

    const transaction = new Transaction({
      userId,
      type,
      amount,
      category,
      description,
      paymentMethod: paymentMethod || "cash",
      mood: mood || "neutral",
    });

    await transaction.save();

    res.status(201).json({
      success: true,
      message: "Transaction added successfully",
      transaction: {
        id: transaction._id,
        type: transaction.type,
        amount: transaction.amount,
        category: transaction.category,
        description: transaction.description,
        date: transaction.date,
        paymentMethod: transaction.paymentMethod,
        mood: transaction.mood,
      },
    });
  } catch (error) {
    console.error("Add transaction error:", error);
    res.status(500).json({
      success: false,
      message: "Error adding transaction",
    });
  }
});

// Get all transactions
app.get("/api/transactions", protect, async (req, res) => {
  try {
    const userId = req.userId;
    const transactions = await Transaction.find({ userId }).sort({ date: -1 });

    res.json({
      success: true,
      transactions: transactions.map((t) => ({
        id: t._id,
        type: t.type,
        amount: t.amount,
        category: t.category,
        description: t.description,
        date: t.date,
        paymentMethod: t.paymentMethod,
        mood: t.mood,
      })),
    });
  } catch (error) {
    console.error("Get transactions error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching transactions",
    });
  }
});

// ==================== DASHBOARD ROUTES ====================

// Dashboard Summary
app.get("/api/dashboard/summary", protect, async (req, res) => {
  try {
    const userId = req.userId;
    const currentDate = new Date();
    const startOfMonth = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      1,
    );
    const startOfPrevMonth = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() - 1,
      1,
    );
    const endOfPrevMonth = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      0,
      23,
      59,
      59,
      999,
    );

    // Get all data in parallel
    const [transactions, budget, savingsGoals, user] = await Promise.all([
      Transaction.find({ userId }),
      Budget.findOne({ userId, isActive: true }),
      SavingsGoal.find({ userId, isActive: true }),
      User.findById(userId).select("-passwordHash -refreshTokenHash"),
    ]);

    // Calculate monthly expenses and income
    const monthlyTransactions = transactions.filter(
      (t) => t.date >= startOfMonth,
    );
    const prevMonthTransactions = transactions.filter(
      (t) => t.date >= startOfPrevMonth && t.date <= endOfPrevMonth,
    );

    const monthlyExpenses = monthlyTransactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0);

    const monthlyIncome = monthlyTransactions
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0);

    const prevMonthExpenses = prevMonthTransactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0);

    // Calculate total savings
    const totalSavings = savingsGoals.reduce(
      (sum, goal) => sum + goal.currentAmount,
      0,
    );

    // Get recent transactions (last 10)
    const recentTransactions = transactions
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 10)
      .map((t) => ({
        id: t._id,
        type: t.type,
        amount: t.amount,
        category: t.category,
        description: t.description,
        date: t.date,
        paymentMethod: t.paymentMethod,
        mood: t.mood,
      }));

    // Calculate budget data
    const monthlyBudget = budget?.totalBudget || 0;
    const budgetUsedPercentage =
      monthlyBudget > 0
        ? Math.min((monthlyExpenses / monthlyBudget) * 100, 100)
        : 0;
    const budgetLeft = Math.max(0, monthlyBudget - monthlyExpenses);

    // Calculate total balance
    const totalBalance = monthlyIncome - monthlyExpenses + totalSavings;

    // Category spending (current month)
    const categoryMap = new Map();
    monthlyTransactions
      .filter((t) => t.type === "expense")
      .forEach((t) => {
        const key = t.category || "Other";
        const current = categoryMap.get(key) || 0;
        categoryMap.set(key, current + t.amount);
      });

    const categorySpending = Array.from(categoryMap.entries())
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount);

    // Weekly expenses (last 7 days)
    const dayBuckets = [];
    for (let i = 6; i >= 0; i -= 1) {
      const day = new Date();
      day.setHours(0, 0, 0, 0);
      day.setDate(day.getDate() - i);
      const nextDay = new Date(day);
      nextDay.setDate(day.getDate() + 1);

      const amount = transactions
        .filter(
          (t) => t.type === "expense" && t.date >= day && t.date < nextDay,
        )
        .reduce((sum, t) => sum + t.amount, 0);

      dayBuckets.push({
        day: day.toLocaleDateString("en-US", { weekday: "short" }),
        amount,
      });
    }

    const expenseTrend =
      prevMonthExpenses > 0
        ? ((monthlyExpenses - prevMonthExpenses) / prevMonthExpenses) * 100
        : monthlyExpenses > 0
          ? 100
          : 0;

    res.json({
      success: true,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        studentId: user.studentId,
      },
      stats: {
        totalBalance,
        monthlyExpenses,
        monthlyIncome,
        budgetLeft,
        totalSavings,
        monthlyBudget,
        budgetUsedPercentage,
      },
      recentTransactions,
      categorySpending,
      weeklyExpenses: dayBuckets,
      expenseTrend: Number(expenseTrend.toFixed(2)),
      savingsGoals: savingsGoals.map((g) => ({
        id: g._id,
        name: g.name,
        targetAmount: g.targetAmount,
        currentAmount: g.currentAmount,
        targetDate: g.targetDate,
        category: g.category,
        priority: g.priority,
        progress: g.progress,
        monthlyContribution: g.monthlyContribution,
      })),
      notifications: 0,
    });
  } catch (error) {
    console.error("Dashboard summary error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching dashboard data",
    });
  }
});

// ==================== UTILITY ROUTES ====================

// Health check route
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    status: "OK",
    timestamp: new Date().toISOString(),
    database:
      mongoose.connection.readyState === 1 ? "Connected" : "Disconnected",
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || "development",
    endpoints: {
      auth: {
        register: "POST /api/auth/register",
        login: "POST /api/auth/login",
        logout: "POST /api/auth/logout",
        profile: "GET /api/auth/me",
      },
      budget: {
        set: "POST /api/budget",
        get: "GET /api/budget",
        getCurrent: "GET /api/budget/current",
        copyPrevious: "POST /api/budget/copy-previous",
        summary: "GET /api/budget/stats/summary",
      },
      savings_goals: {
        create: "POST /api/savings-goals",
        list: "GET /api/savings-goals",
      },
      transactions: {
        add: "POST /api/transactions",
        list: "GET /api/transactions",
      },
      dashboard: {
        summary: "GET /api/dashboard/summary",
      },
    },
  });
});

// Test route
app.get("/", (req, res) => {
  res.json({
    message: "WalletWise Backend API is running",
    version: "1.0.0",
    database:
      mongoose.connection.readyState === 1 ? "Connected" : "Disconnected",
    endpoints: {
      auth: {
        register: "POST /api/auth/register",
        login: "POST /api/auth/login",
        profile: "GET /api/auth/me (requires token)",
      },
      budget: {
        set: "POST /api/budget (requires token)",
        get: "GET /api/budget (requires token)",
        getCurrent: "GET /api/budget/current (requires token)",
        copyPrevious: "POST /api/budget/copy-previous (requires token)",
        summary: "GET /api/budget/stats/summary (requires token)",
      },
      savings_goals: {
        create: "POST /api/savings-goals (requires token)",
        list: "GET /api/savings-goals (requires token)",
      },
      transactions: {
        add: "POST /api/transactions (requires token)",
        list: "GET /api/transactions (requires token)",
      },
      dashboard: {
        summary: "GET /api/dashboard/summary (requires token)",
      },
      utility: {
        health: "GET /api/health",
      },
    },
  });
});

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    message: "Endpoint not found",
    requestedUrl: req.originalUrl,
    timestamp: new Date().toISOString(),
  });
});

// ==================== START SERVER ====================
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  const resolvedFrontendUrl =
    process.env.FRONTEND_URL || "http://localhost:3000";
  const nodeEnv = process.env.NODE_ENV || "development";

  console.log(`\n🚀 Server running on port ${PORT}`);
  console.log(`\n=================================`);
  console.log(`       ENVIRONMENT INFO`);
  console.log(`=================================`);
  console.log(`NODE_ENV:     ${nodeEnv}`);
  console.log(`PORT:         ${PORT}`);
  console.log(`FRONTEND_URL: ${resolvedFrontendUrl}`);
  console.log(
    `DB URI:       ${process.env.MONGODB_URI ? "Set (Hidden)" : "Not Set (Using Local Default)"}`,
  );
  console.log(`=================================\n`);

  console.log(`🔗 API Base URL: http://localhost:${PORT}`);
  console.log(`🌐 CORS enabled for: ${resolvedFrontendUrl}`);
  console.log(`🔐 Environment: ${nodeEnv}`);

  console.log(`\n📋 AVAILABLE ENDPOINTS:`);
  console.log(`\n🔐 AUTH:`);
  console.log(`  POST /api/auth/register       - Register user`);
  console.log(`  POST /api/auth/login          - Login user`);
  console.log(
    `  GET  /api/auth/me             - Get current user (requires token)`,
  );

  console.log(`\n💰 BUDGET:`);
  console.log(
    `  POST /api/budget              - Set/update budget (requires token)`,
  );
  console.log(
    `  GET  /api/budget              - Get all budgets (requires token)`,
  );
  console.log(
    `  GET  /api/budget/current      - Get current month budget (requires token)`,
  );
  console.log(
    `  POST /api/budget/copy-previous - Copy previous month budget (requires token)`,
  );
  console.log(
    `  GET  /api/budget/stats/summary - Budget statistics (requires token)`,
  );
  console.log(
    `  PUT  /api/budget/:id          - Update budget (requires token)`,
  );
  console.log(
    `  DELETE /api/budget/:id        - Delete budget (requires token)`,
  );

  console.log(`\n🎯 SAVINGS GOALS:`);
  console.log(
    `  POST /api/savings-goals       - Create savings goal (requires token)`,
  );
  console.log(
    `  GET  /api/savings-goals       - List savings goals (requires token)`,
  );

  console.log(`\n💳 TRANSACTIONS:`);
  console.log(
    `  POST /api/transactions        - Add transaction (requires token)`,
  );
  console.log(
    `  GET  /api/transactions        - List transactions (requires token)`,
  );

  console.log(`\n📊 DASHBOARD:`);
  console.log(
    `  GET  /api/dashboard/summary   - Dashboard data (requires token)`,
  );

  console.log(`\n🔧 UTILITY:`);
  console.log(`  GET  /api/health              - Health check`);
  console.log(`  GET  /                        - API documentation`);

  console.log(`\n💡 IMPORTANT: Budget endpoints now include notifications!`);
  console.log("   Use this format for budget data:");
  console.log("   {");
  console.log('     "totalBudget": 15000,');
  console.log('     "categories": [');
  console.log(
    '       {"name": "Food", "amount": 4500, "percentage": 30, "color": "#FF6B6B"}',
  );
  console.log("     ]");
  console.log("   }");
  console.log("📊 Waiting for requests...");
});
