# PR Description: [UI] Add "Scroll to Top" Button for Long Pages (#186)

## 📋 Summary
Added a premium, floating "Scroll to Top" button to improve navigation on long pages like the Transactions list and Dashboard. The button stays hidden until the user scrolls down 300px, then fades in with a smooth glassmorphism effect.

## 🛠️ Changes Made

### 🎨 Components
- **`ScrollToTop` Component**: Created a reusable component in `frontend/src/components/ScrollToTop/` that monitors scroll position and triggers smooth scrolling to the top.
- **Premium Styling**: 
    - **Glassmorphism**: Semi-transparent background with backdrop blur.
    - **Animations**: Smooth fade-in/out and hover-scaling effects.
    - **Responsive**: Adjusts size and position for mobile devices.

### 🔄 Integration
- **Global Setup**: Integrated into `App.jsx` to ensure the button is available throughout the entire application.

## ✅ Verification
- **Manual Testing**: 
    - Verified on **Transactions** page: Button appears after scrolling.
    - Verified **Smooth Scroll**: Clicking correctly returns the user to the top with a smooth transition.
    - Verified **Responsive**: Button remains accessible and styled correctly on mobile viewports.

---
Fixes #186
