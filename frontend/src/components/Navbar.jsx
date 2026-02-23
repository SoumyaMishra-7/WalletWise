import React from "react";
import { Moon, Sun, Wallet } from "lucide-react";
import { useTheme } from "../context/ThemeContext";

const Navbar = ({ isMenuOpen, setIsMenuOpen, navigate }) => {
  const { isDark, toggleTheme } = useTheme();
  return (
    <header className="fixed top-0 left-0 w-full z-50 backdrop-blur-md bg-white/80 dark:bg-slate-900/80 border-b border-zinc-200 dark:border-slate-700">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Logo */}
        <a
          href="#top"
          className="flex items-center gap-2 font-bold text-xl text-zinc-900 dark:text-slate-100 focus:outline-none"
        >
          <Wallet size={24} className="text-black dark:text-slate-100" />
          WalletWise
        </a>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-6">
          <a
            href="#about"
            className="text-zinc-600 dark:text-slate-300 hover:text-black dark:hover:text-white transition relative pb-1 after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-0 after:h-[2px] after:bg-black dark:after:bg-white after:transition-all after:duration-300 hover:after:w-full focus:outline-none"
          >
            About
          </a>

          <a
            href="#features"
            className="text-zinc-600 dark:text-slate-300 hover:text-black dark:hover:text-white transition relative pb-1 after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-0 after:h-[2px] after:bg-black dark:after:bg-white after:transition-all after:duration-300 hover:after:w-full focus:outline-none"
          >
            Features
          </a>

          <button
            onClick={() => navigate("/signup")}
            className="px-5 py-2 rounded-full bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white transition"
          >
            Get Started
          </button>

          <button
            onClick={toggleTheme}
            aria-label={
              isDark ? "Switch to light theme" : "Switch to dark theme"
            }
            className="inline-flex items-center justify-center w-10 h-10 rounded-full border border-zinc-200 dark:border-slate-600 text-zinc-700 dark:text-slate-200 bg-white/70 dark:bg-slate-800/70 hover:bg-zinc-100 dark:hover:bg-slate-700 transition"
            type="button"
          >
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </nav>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden flex flex-col gap-1"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-label="Toggle menu"
        >
          <span className="w-6 h-[2px] bg-black dark:bg-slate-100" />
          <span className="w-6 h-[2px] bg-black dark:bg-slate-100" />
          <span className="w-6 h-[2px] bg-black dark:bg-slate-100" />
        </button>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden bg-white dark:bg-slate-900 border-t border-zinc-200 dark:border-slate-700 px-4 py-4 space-y-4">
          <a
            href="#about"
            onClick={() => setIsMenuOpen(false)}
            className="block w-full text-left text-zinc-700 dark:text-slate-200 focus:outline-none"
          >
            About
          </a>
          <a
            href="#features"
            onClick={() => setIsMenuOpen(false)}
            className="block w-full text-left text-zinc-700 dark:text-slate-200 focus:outline-none"
          >
            Features
          </a>
          <button
            onClick={() => navigate("/signup")}
            className="w-full py-2 rounded-lg bg-zinc-900 text-white dark:bg-slate-100 dark:text-slate-900"
          >
            Get Started
          </button>
          <button
            onClick={toggleTheme}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-zinc-200 dark:border-slate-600 text-zinc-700 dark:text-slate-200 bg-white/80 dark:bg-slate-800/80"
            type="button"
          >
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
            <span>{isDark ? "Light mode" : "Dark mode"}</span>
          </button>
        </div>
      )}
    </header>
  );
};

export default Navbar;
