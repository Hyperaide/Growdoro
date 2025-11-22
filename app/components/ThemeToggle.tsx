"use client";

import React from "react";
import { SunIcon, MoonIcon } from "@phosphor-icons/react";
import { useTheme } from "../contexts/theme-context";
import { trackThemeToggled } from "@/lib/events";

const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  const handleToggle = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    trackThemeToggled(newTheme);
    toggleTheme();
  };

  return (
    <button
      onClick={handleToggle}
      className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
      aria-label={
        theme === "light" ? "Switch to dark mode" : "Switch to light mode"
      }
    >
      {theme === "light" ? (
        <MoonIcon size={20} className="text-slate-700" weight="fill" />
      ) : (
        <SunIcon size={20} className="text-yellow-400" weight="fill" />
      )}
    </button>
  );
};

export default ThemeToggle;
