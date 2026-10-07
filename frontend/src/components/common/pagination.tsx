"use client";

import React from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

export interface PaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
  className?: string;
  itemLabel?: string;
}

export function Pagination({
  currentPage,
  totalItems,
  pageSize = 10,
  onPageChange,
  className = "",
  itemLabel = "bản ghi",
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  if (totalItems <= 0) return null;

  const startIndex = (currentPage - 1) * pageSize + 1;
  const endIndex = Math.min(totalItems, currentPage * pageSize);

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const delta = 1;

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
      return pages;
    }

    pages.push(1);
    const leftBound = Math.max(2, currentPage - delta);
    const rightBound = Math.min(totalPages - 1, currentPage + delta);

    if (leftBound > 2) {
      pages.push("...");
    }

    for (let i = leftBound; i <= rightBound; i++) {
      pages.push(i);
    }

    if (rightBound < totalPages - 1) {
      pages.push("...");
    }

    pages.push(totalPages);
    return pages;
  };

  const pages = getPageNumbers();

  return (
    <div
      className={`flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-[#171920]/90 border-t border-[#2d3138] text-xs ${className}`}
    >
      <div className="text-gray-400 font-mono text-[11px] sm:text-xs">
        Hiển thị <span className="font-bold text-white">{startIndex}</span> -{" "}
        <span className="font-bold text-white">{endIndex}</span> trên tổng số{" "}
        <span className="font-bold text-amber-400">{totalItems}</span> {itemLabel}
      </div>

      <div className="flex items-center gap-1">
        {/* First page button */}
        <button
          type="button"
          onClick={() => onPageChange(1)}
          disabled={currentPage <= 1}
          title="Trang đầu"
          className="p-1.5 rounded-lg border border-[#2d3138] bg-[#1f222a] text-gray-400 hover:text-white hover:bg-[#282c37] hover:border-gray-500 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
        >
          <ChevronsLeft size={14} />
        </button>

        {/* Prev page button */}
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          title="Trang trước"
          className="p-1.5 rounded-lg border border-[#2d3138] bg-[#1f222a] text-gray-400 hover:text-white hover:bg-[#282c37] hover:border-gray-500 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
        >
          <ChevronLeft size={14} />
        </button>

        {/* Page numbers */}
        <div className="flex items-center gap-1 mx-1">
          {pages.map((p, idx) => {
            if (typeof p === "string") {
              return (
                <span key={`ellipsis-${idx}`} className="px-1 text-gray-500 font-bold select-none">
                  ...
                </span>
              );
            }
            const isActive = p === currentPage;
            return (
              <button
                key={`page-${p}`}
                type="button"
                onClick={() => onPageChange(p)}
                className={`min-w-[28px] h-7 px-2 rounded-lg font-mono font-bold text-xs transition-all cursor-pointer ${
                  isActive
                    ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-amber-950/40"
                    : "border border-[#2d3138] bg-[#1f222a] text-gray-300 hover:text-white hover:bg-[#282c37] hover:border-gray-500"
                }`}
              >
                {p}
              </button>
            );
          })}
        </div>

        {/* Next page button */}
        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          title="Trang sau"
          className="p-1.5 rounded-lg border border-[#2d3138] bg-[#1f222a] text-gray-400 hover:text-white hover:bg-[#282c37] hover:border-gray-500 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
        >
          <ChevronRight size={14} />
        </button>

        {/* Last page button */}
        <button
          type="button"
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage >= totalPages}
          title="Trang cuối"
          className="p-1.5 rounded-lg border border-[#2d3138] bg-[#1f222a] text-gray-400 hover:text-white hover:bg-[#282c37] hover:border-gray-500 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
        >
          <ChevronsRight size={14} />
        </button>
      </div>
    </div>
  );
}
