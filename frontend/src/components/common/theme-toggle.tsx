"use client";

import { useTheme } from "@/features/theme/theme-provider";
import { Sun, Moon } from "lucide-react";
import { useEffect, useState } from "react";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(false);
    const t = setTimeout(() => setMounted(true), 10);
    return () => clearTimeout(t);
  }, []);

  const isLight = theme === "light";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={isLight ? "Chuyển sang giao diện Tối (Dark mode)" : "Chuyển sang giao diện Sáng (Light mode)"}
      aria-label={isLight ? "Chuyển sang giao diện Tối" : "Chuyển sang giao diện Sáng"}
      className={`relative inline-flex items-center justify-center p-2 rounded-xl transition-all duration-300 border cursor-pointer select-none group shadow-sm ${
        isLight
          ? "bg-amber-50 hover:bg-amber-100/80 border-amber-200/80 text-amber-700 shadow-amber-900/5"
          : "bg-[#20232a] hover:bg-[#282c35] border-[#383d47] text-amber-400 hover:text-amber-300 shadow-black/20"
      } ${className}`}
    >
      <div className="relative w-5 h-5 flex items-center justify-center">
        {mounted && isLight ? (
          <Sun
            size={18}
            className="text-amber-600 transition-all duration-300 transform rotate-0 scale-100 group-hover:rotate-45"
          />
        ) : (
          <Moon
            size={17}
            className="text-amber-400 transition-all duration-300 transform rotate-0 scale-100 group-hover:-rotate-12"
          />
        )}
      </div>
      <span className="sr-only">
        {isLight ? "Giao diện Sáng" : "Giao diện Tối"}
      </span>
    </button>
  );
}
