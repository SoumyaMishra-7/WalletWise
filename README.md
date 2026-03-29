# 💳 WalletWise

<div align="center">

**An Intelligent, Behaviour-Aware Personal Finance Platform**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)

*Finance should not just be tracked — it should be understood.*

</div>

---

## 📖 Overview

WalletWise is a next-generation personal finance platform designed to **teach, guide, and protect** users—especially students and young professionals—from poor financial decisions.

Unlike traditional finance apps that merely record transactions, WalletWise **actively interprets behaviour**, **predicts future obligations**, and **assists users in making smarter financial decisions** in real time.

---

### 🎯 Core Philosophy

> **Finance should not just be tracked — it should be understood.**

WalletWise transforms raw financial data into actionable intelligence, helping users develop lasting financial literacy and discipline.

---

⚠️ **Current Status:** WalletWise is under active development. Core transaction tracking and monthly budgeting features are implemented. Predictive budgeting, AI behaviour analysis, and the decision helper module are planned and currently in progress.

---

## 🚀 Why WalletWise Exists

Most financial tools fail at one crucial point:

> **They tell users what they spent, but never *why* — and never *what to do next*.**

### The WalletWise Difference

WalletWise closes this gap by combining:

- ✅ **Structured financial tracking**
- 📊 **Predictive planning**
- 🧠 **Behavioural analysis**
- 🤖 **Decision intelligence**

This results in a system that **educates users financially**, not just records data.

---

## 🧠 Design Principle: Behaviour-Aware Finance

WalletWise is built around the concept of **Behaviour-Aware Finance**, where financial data is:

| Stage | Action |
|-------|--------|
| 📥 **Tracked** | Capture all transactions |
| 📂 **Structured** | Organize into categories & budgets |
| 🔮 **Predicted** | Anticipate future obligations |
| 🔍 **Interpreted** | Analyze behaviour patterns |
| 💡 **Advised upon** | Provide real-time decision support |

**Result:** Financial awareness, not financial anxiety.

---

## 🏗️ Architectural Overview

WalletWise follows a **layered functional architecture**, where each layer builds meaningfully on the previous one:

```
┌─────────────────────────┐
│   Decision Intelligence │  ← AI-powered spending advisor
├─────────────────────────┤
│   Behaviour Analysis    │  ← Pattern detection & insights
├─────────────────────────┤
│   Future Planning       │  ← Predictive budgeting
├─────────────────────────┤
│   Budget Control        │  ← Proactive spending limits
├─────────────────────────┤
│   Data Collection       │  ← Transaction foundation
└─────────────────────────┘
```

### Architecture Benefits

- ✅ **Logical scalability** — Add features without breaking existing functionality
- ✅ **Clear separation of concerns** — Each layer has a distinct purpose
- ✅ **Smooth learning curve** — Users progress naturally from basic to advanced features

---

## 🔩 Core Functional Components

### 1️⃣ Core Transaction Engine
**Foundational Financial Data Layer**

#### 🎯 Purpose
To act as a **single source of financial truth**, ensuring all analytics and insights are reliable.

#### ✨ Features

**Income Tracking**
- Multiple sources: stipend, allowance, freelance work, salary
- Date-stamped entries with detailed descriptions

**Expense Tracking**
- Daily entries with amount, date, and description
- Automatic balance calculations

**Category-Based Classification**

Predefined categories include:
- 🍔 **Food** — Groceries, dining, snacks
- 🚗 **Travel** — Fuel, transit, ride-sharing
- 🏠 **Rent** — Housing costs
- 💡 **Utilities** — Electricity, water, internet
- 🎬 **Entertainment** — Movies, games, hobbies
- 📚 **Education** — Books, courses, supplies
- 🏥 **Healthcare** — Medical expenses
- 🛍️ **Shopping** — Clothing, electronics, misc.

#### 🧩 Why It Matters

> Raw transactions are meaningless without structure.

Categorization converts data into **insight-ready information**, enabling budgeting and AI analysis.

---

### 2️⃣ Monthly Budget Controller
**Proactive Financial Discipline Layer**

#### 🎯 Purpose
To move users from **reactive expense tracking** to **proactive spending control**.

#### ✨ Features

**Monthly Budget Setup**
- Total budget limits
- Optional category-wise budgets
- Customizable spending thresholds

**Live Budget Monitoring**
- Real-time comparison: **Planned budget** vs **Actual spending**
- Category-wise breakdown
- Daily spending averages

**Visual Feedback**
- 📊 Progress indicators (progress bars, percentages)
- ⚠️ Alerts when approaching limits (e.g., 80% threshold)
- 🚨 Warnings when limits are crossed

#### 🧩 Why It Matters

> Most people realize financial mistakes **after** money is gone.

This layer helps users **correct behaviour before damage occurs**.

---

### 3️⃣ Predictive Budgeting Engine
**Future-Focused Financial Planning**

#### 🎯 Purpose
To eliminate **last-minute financial stress** by helping users prepare ahead of time.

#### ✨ Features

**Upcoming Event Planning**
- 🎂 Birthdays
- ✈️ Trips & vacations
- 🎓 Academic or personal milestones
- 🎁 Gift planning

**Recurring Expense Tracking**
- 📺 Subscriptions (OTT platforms, SaaS tools, memberships)
- 📅 Due date reminders
- Automatic renewal alerts

**Due-Date-Driven Savings Logic**

The system calculates:
- ⏰ **Time remaining** until the event/due date
- 💰 **Required daily/weekly savings** to meet the goal
- 📈 **Savings progress** tracking

**Savings Readiness Indicator**

| Status | Meaning |
|--------|---------|
| ✅ **On track** | Savings are sufficient |
| ⚠️ **Lagging** | Need to accelerate savings |
| ❌ **Not prepared** | Insufficient time/funds |

#### 🧩 Why It Matters

> Future expenses are predictable — **financial stress doesn't have to be**.

---

### 4️⃣ Behaviour Awareness & Finance Intelligence
**AI-Driven Insight Layer**

#### 🎯 Purpose
To explain the **root causes** of financial instability — not just visualize them.

#### ✨ Features

**AI Behaviour Diagnostics**

The system detects:
- 💸 **Overspending patterns** (which categories, when, why)
- 🔄 **Category misuse** (misclassification affecting budgets)
- 😢 **Emotional/impulsive spending** (correlation with mood/stress)

**Insight-Based Feedback**

Example insights:
- *"Weekend food spending spikes consistently by 40%."*
- *"Impulse purchases increase after budget exhaustion."*
- *"Entertainment expenses triple during exam weeks."*

**Root Cause Analysis**

Converts charts into **human-readable explanations**:
- Why did you overspend this month?
- What triggers your impulse purchases?
- Which days of the week are financially riskiest?

#### 🧩 Why It Matters

> Users often know **what** they spend — but not **why**.

Understanding behaviour is the key to **sustainable financial improvement**.

---

### 5️⃣ Decision Helper
**Real-Time Spending Advisor**

#### 🎯 Purpose
To act as a **financial checkpoint** before a purchase is made.

#### 🔍 Decision Inputs

**The system evaluates:**

| Factor | Assessment |
|--------|------------|
| 💵 **Purchase cost** | How much you want to spend |
| 😊 **User's emotional state** | Happy, stressed, impulsive, calm |
| 📊 **Current monthly budget status** | Remaining budget & category limits |
| 💰 **Available savings** | Emergency funds & goal savings |
| 📅 **Upcoming obligations** | Pending bills, events, dues |

#### ✅ Decision Output

**Clear recommendation:**

| Status | Meaning |
|--------|---------|
| ✔️ **Affordable** | Go ahead, purchase aligns with budget |
| ⚠️ **Risky** | Proceed with caution, may impact goals |
| ❌ **Not Recommended** | High risk, likely to cause financial stress |

**Reasoned explanation:**
- Not just *yes/no*, but **why**
- Specific impact on budget and goals
- Alternative suggestions when applicable

#### 🧩 Why It Matters

> This transforms WalletWise from an app into a **personal financial advisor**, reducing emotional and impulsive spending.

---

## 💡 Value Proposition

WalletWise empowers users by:

| Benefit | Impact |
|---------|--------|
| 🧠 **Teaching financial discipline** | Build lasting money management skills |
| 🚫 **Reducing impulse-driven spending** | Make rational, not emotional, decisions |
| 📅 **Encouraging future-ready planning** | Eliminate last-minute financial panic |
| 🤖 **Delivering AI-backed behavioural insights** | Understand the "why" behind spending |
| 💪 **Enabling confident, informed decisions** | Spend with clarity and control |

---

## 🎯 Target Audience

WalletWise is designed for:

- 🎓 **Students** — Learning to manage allowances and part-time income
- 💼 **Young professionals** — First-time salary earners building financial habits
- 💰 **First-time income earners** — Anyone new to financial independence
- 🤔 **Anyone struggling with financial awareness** — Those who want to understand their money better

---

## 🛠️ Tech Stack

<div align="center">

| Layer | Technology |
|-------|-----------|
| **Frontend** | React.js, TailwindCSS |
| **Backend** | Node.js, Express.js |
| **Database** | MongoDB |
| **Authentication** | JWT, OAuth 2.0 |
| **Deployment** | Docker, AWS/Vercel |

</div>

---
## 🚀 Getting Started

### Prerequisites
- Node.js (v16+)
- npm or yarn

---

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/SoumyaMishra-7/WalletWise.git
cd WalletWise
```
---

### 2. Backend Setup

The backend serves the API and connects to MongoDB.

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Configure Environment Variables
# Create a .env file in the backend directory based on .env.example
cp .env.example .env

# Edit .env and add your MongoDB URI, JWT secrets, and Google OAuth credentials
# nano .env

# Start the backend server
# For development (using nodemon):
npm run dev

# For production:
# npm start
```

The server will start on `http://localhost:5000` by default.

---

### 3. Frontend Setup

The frontend application is built with React.

```bash
# Navigate to frontend directory (from root)
cd ../frontend

# Install dependencies
npm install

# Start the development server
npm start
```

The application will open at `http://localhost:3000`.


---

## 📊 Roadmap

### Phase 1: Foundation ✅
- [x] Core transaction tracking
- [x] Category-based classification
- [x] Monthly budget controller

---

### Phase 2: Intelligence 🚧
- [ ] Predictive budgeting engine
- [ ] AI behaviour analysis
- [x] Decision helper module

---

### Phase 3: Advanced Features 📅
- [ ] Multi-user support (family accounts)
- [ ] Investment tracking
- [ ] Bill splitting & group expenses
- [ ] Mobile app (iOS/Android)

---

## 🤝 Contributing

Contributions are what make the open-source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---

## 📧 Contact

**Soumya Mishra**

- GitHub: [@SoumyaMishra-7](https://github.com/SoumyaMishra-7)
- Project Link: [https://github.com/SoumyaMishra-7/WalletWise](https://github.com/SoumyaMishra-7/WalletWise)

---

## 🌟 Acknowledgments

- Inspired by the need for financial literacy among students
- Built with the belief that technology can democratize financial wisdom
- Dedicated to everyone learning to manage money independently

---

<div align="center">

**Made with ❤️ for financial empowerment**

⭐ Star this repo if you find it helpful!

</div>
