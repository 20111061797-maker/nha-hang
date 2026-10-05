"use client";

import { useMemo, useState } from "react";
import type { MenuProduct, MenuResponse } from "@/types/pos";
import { ProductOptionModal } from "./product-option-modal";
import { Search, Sparkles, Plus, Utensils, Coffee, X } from "lucide-react";

type Props = {
  menu: MenuResponse;
  onAddItem: (params: {
    productId: string;
    variantId?: string | null;
    modifierIds: string[];
    quantity: number;
    notes?: string;
  }) => void;
};

export function MenuSelector({ menu, onAddItem }: Props) {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [modalProduct, setModalProduct] = useState<MenuProduct | null>(null);

  const categories = menu.categories;

  const allProducts = useMemo(() => {
    const list: (MenuProduct & { categoryName: string })[] = [];
    for (const cat of categories) {
      for (const prod of cat.products) {
        list.push({ ...prod, categoryName: cat.name });
      }
    }
    return list;
  }, [categories]);

  const filteredProducts = useMemo(() => {
    let prods = allProducts;
    if (selectedCategoryId !== "all") {
      const cat = categories.find((c) => c.id === selectedCategoryId);
      prods = cat ? cat.products.map((p) => ({ ...p, categoryName: cat.name })) : [];
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      prods = prods.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          (p.shortDescription && p.shortDescription.toLowerCase().includes(q))
      );
    }
    return prods;
  }, [allProducts, categories, selectedCategoryId, searchQuery]);

  const handleProductClick = (product: MenuProduct) => {
    if (product.variants.length > 0 || product.modifierGroups.length > 0) {
      setModalProduct(product);
    } else {
      onAddItem({
        productId: product.id,
        variantId: null,
        modifierIds: [],
        quantity: 1,
      });
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4 rounded-2xl bg-[#141822] border border-[#252b3b] shadow-xl">
      {/* Search and Category header */}
      <div className="flex flex-col gap-3">
        {/* Search Input */}
        <div className="relative w-full">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            className="w-full bg-[#11141c] border border-[#272e3e] text-sm text-gray-100 placeholder:text-gray-500 rounded-xl pl-10 pr-9 py-2.5 focus:outline-none focus:border-orange-500 transition-colors"
            placeholder="Tìm kiếm món ăn, đồ uống, mã SKU..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white p-0.5 rounded cursor-pointer"
              onClick={() => setSearchQuery("")}
              type="button"
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            type="button"
            className={`shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
              selectedCategoryId === "all"
                ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white border-orange-400/60 shadow-md shadow-orange-500/25"
                : "bg-[#181c26] text-gray-300 hover:text-white hover:bg-[#202534] border-[#293042]"
            }`}
            onClick={() => setSelectedCategoryId("all")}
          >
            <span>Tất cả</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                selectedCategoryId === "all" ? "bg-white/25 text-white" : "bg-white/10 text-gray-400"
              }`}
            >
              {allProducts.length}
            </span>
          </button>

          {categories.map((cat) => {
            const isSelected = selectedCategoryId === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                className={`shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                  isSelected
                    ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white border-orange-400/60 shadow-md shadow-orange-500/25"
                    : "bg-[#181c26] text-gray-300 hover:text-white hover:bg-[#202534] border-[#293042]"
                }`}
                onClick={() => setSelectedCategoryId(cat.id)}
              >
                <span>{cat.name}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                    isSelected ? "bg-white/25 text-white" : "bg-white/10 text-gray-400"
                  }`}
                >
                  {cat.products.length}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Product List Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3.5 min-h-[380px] max-h-[calc(100vh-270px)] overflow-y-auto p-1">
        {filteredProducts.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center py-16 text-center text-gray-500">
            <Utensils size={32} className="opacity-40 mb-2" />
            <p className="text-sm font-semibold text-gray-400">Không tìm thấy món ăn nào phù hợp</p>
            <p className="text-xs text-gray-500 mt-0.5">Thử tìm kiếm với từ khóa khác hoặc chuyển danh mục</p>
          </div>
        ) : (
          filteredProducts.map((product) => {
            const hasOptions = product.variants.length > 0 || product.modifierGroups.length > 0;
            return (
              <div
                key={product.id}
                className="group relative flex flex-col justify-between p-4 rounded-2xl bg-[#181c27] hover:bg-[#1f2533] border border-[#282f42] hover:border-orange-500/50 shadow-md hover:shadow-xl hover:shadow-black/40 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer overflow-hidden"
                onClick={() => handleProductClick(product)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") handleProductClick(product);
                }}
              >
                {/* Dish image banner */}
                <div className="relative w-full h-28 mb-2.5 rounded-xl overflow-hidden bg-[#11141c] border border-white/5">
                  {product.imageUrl ? (
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-[#1a1f2c] to-[#12151e] flex items-center justify-center text-gray-600">
                      <Utensils size={24} className="opacity-40" />
                    </div>
                  )}

                  {/* SKU badge overlay */}
                  <span className="absolute top-2 left-2 text-[10px] font-mono text-gray-300 bg-black/70 backdrop-blur-md px-2 py-0.5 rounded-md border border-white/10 font-bold">
                    {product.sku}
                  </span>

                  {/* Option indicator overlay */}
                  {hasOptions && (
                    <span className="absolute top-2 right-2 inline-flex items-center gap-1 text-[10px] font-bold text-sky-300 bg-black/75 backdrop-blur-md px-2 py-0.5 rounded-full border border-sky-400/40">
                      <Sparkles size={10} className="text-sky-400" /> Tùy chọn
                    </span>
                  )}
                </div>

                {/* Body: Product Name & Description */}
                <div className="flex-1 flex flex-col justify-start mb-3">
                  <h4 className="font-bold text-gray-100 text-sm group-hover:text-amber-300 transition-colors line-clamp-2 leading-snug">
                    {product.name}
                  </h4>
                  {product.shortDescription && (
                    <p className="text-xs text-gray-400 mt-1 line-clamp-2 leading-relaxed">
                      {product.shortDescription}
                    </p>
                  )}
                </div>

                {/* Footer: Price & Quick Add Button */}
                <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-white/5">
                  <div>
                    <span className="text-base font-black font-mono text-amber-400 tracking-tight">
                      {product.price.toLocaleString("vi-VN")} ₫
                    </span>
                  </div>

                  <button
                    type="button"
                    className="w-9 h-9 rounded-xl bg-orange-500/15 group-hover:bg-gradient-to-r group-hover:from-orange-500 group-hover:to-amber-500 text-orange-400 group-hover:text-white border border-orange-500/30 group-hover:border-transparent flex items-center justify-center transition-all active:scale-90 shadow-sm"
                    title="Thêm vào đơn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleProductClick(product);
                    }}
                  >
                    <Plus size={18} className="stroke-[2.5]" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Product Option Modal */}
      {modalProduct && (
        <ProductOptionModal
          product={modalProduct}
          onClose={() => setModalProduct(null)}
          onAdd={onAddItem}
        />
      )}
    </div>
  );
}
