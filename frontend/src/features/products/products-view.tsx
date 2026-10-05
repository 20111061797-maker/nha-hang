"use client";

import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { productApi } from "@/lib/api/product-api";
import { useBranch } from "@/features/branches/branch-provider";
import { LoadingState, EmptyState } from "@/components/feedback/states";
import type { CategoryListItem } from "@/types/products";
import {
  UtensilsCrossed,
  Search,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  X,
  Layers,
  Sparkles,
  RefreshCw,
  FolderPlus,
  Image as ImageIcon,
} from "lucide-react";

interface ProductWithContext {
  id: string;
  sku: string;
  name: string;
  description?: string | null;
  shortDescription?: string | null;
  price: number;
  categoryId: string;
  categoryName: string;
  variants?: { id: string; name: string; price: number; displayOrder: number }[];
  branchProductId?: string;
  isAvailable?: boolean;
  imageUrl?: string | null;
}

export function ProductsView() {
  const { branchId, currentBranch } = useBranch();
  const queryClient = useQueryClient();

  // Filters & State
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Modals state
  const [productModal, setProductModal] = useState<{
    open: boolean;
    mode: "create" | "edit";
    product?: ProductWithContext;
  }>({ open: false, mode: "create" });

  const [deleteProductModal, setDeleteProductModal] = useState<{
    open: boolean;
    product?: ProductWithContext;
  }>({ open: false });

  const [categoriesModalOpen, setCategoriesModalOpen] = useState(false);

  const [categoryEditModal, setCategoryEditModal] = useState<{
    open: boolean;
    mode: "create" | "edit";
    category?: CategoryListItem;
  }>({ open: false, mode: "create" });

  const [deleteCategoryModal, setDeleteCategoryModal] = useState<{
    open: boolean;
    category?: CategoryListItem;
  }>({ open: false });

  const showToast = (type: "success" | "error", text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Queries
  const { data: menu, isLoading: menuLoading } = useQuery({
    queryKey: ["branch-menu-mgmt", branchId],
    queryFn: () => (branchId ? productApi.getBranchMenu(branchId) : Promise.resolve(null)),
    enabled: Boolean(branchId),
  });

  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ["categories-all"],
    queryFn: () => productApi.getCategories(),
  });

  const { data: branchProducts = [] } = useQuery({
    queryKey: ["branch-products", branchId],
    queryFn: () => (branchId ? productApi.getBranchProducts(branchId) : Promise.resolve([])),
    enabled: Boolean(branchId),
  });

  // Invalidation helper
  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["branch-menu-mgmt", branchId] });
    queryClient.invalidateQueries({ queryKey: ["branch-products", branchId] });
    queryClient.invalidateQueries({ queryKey: ["categories-all"] });
    queryClient.invalidateQueries({ queryKey: ["pos-menu", branchId] });
  };

  // Toggle product availability in branch
  const toggleStatusMutation = useMutation({
    mutationFn: async ({
      branchProductId,
      productId,
      currentPrice,
      isAvailable,
    }: {
      branchProductId?: string;
      productId: string;
      currentPrice: number;
      isAvailable: boolean;
    }) => {
      if (!branchId) return;
      if (branchProductId) {
        // Toggle availability via branch product
        await productApi.setProductStatus(productId, isAvailable);
      } else {
        await productApi.createBranchProduct(branchId, {
          productId,
          price: currentPrice,
          isAvailable: isAvailable,
        });
      }
    },
    onSuccess: () => {
      invalidateAll();
      showToast("success", "Đã cập nhật trạng thái món ăn thành công!");
    },
    onError: (err: unknown) => {
      showToast("error", err instanceof Error ? err.message : "Không thể đổi trạng thái.");
    },
  });

  // Create Product Mutation
  const createProductMutation = useMutation({
    mutationFn: async (payload: {
      name: string;
      sku: string;
      categoryId: string;
      price: number;
      description?: string;
      displayOrder: number;
      imageUrl?: string;
    }) => {
      const product = await productApi.createProduct({
        sku: payload.sku,
        name: payload.name,
        description: payload.description || null,
        shortDescription: null,
        displayOrder: payload.displayOrder,
        categoryIds: [payload.categoryId],
        imageUrl: payload.imageUrl || null,
      });

      if (branchId && payload.price >= 0) {
        await productApi.createBranchProduct(branchId, {
          productId: product.id,
          price: payload.price,
          isAvailable: true,
        });
      }
      return product;
    },
    onSuccess: () => {
      invalidateAll();
      setProductModal({ open: false, mode: "create" });
      showToast("success", "Đã thêm món ăn mới vào thực đơn thành công!");
    },
    onError: (err: unknown) => {
      showToast("error", err instanceof Error ? err.message : "Không thể tạo món mới.");
    },
  });

  // Update Product Mutation
  const updateProductMutation = useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: string;
      payload: {
        name: string;
        sku: string;
        categoryId: string;
        price: number;
        description?: string;
        displayOrder: number;
        branchProductId?: string;
        imageUrl?: string;
      };
    }) => {
      await productApi.updateProduct(id, {
        sku: payload.sku,
        name: payload.name,
        description: payload.description || null,
        shortDescription: null,
        displayOrder: payload.displayOrder,
        categoryIds: [payload.categoryId],
        imageUrl: payload.imageUrl || null,
      });

      if (branchId) {
        if (payload.branchProductId) {
          await productApi.updateBranchProduct(payload.branchProductId, {
            price: payload.price,
          });
        } else {
          await productApi.createBranchProduct(branchId, {
            productId: id,
            price: payload.price,
            isAvailable: true,
          });
        }
      }
    },
    onSuccess: () => {
      invalidateAll();
      setProductModal({ open: false, mode: "create" });
      showToast("success", "Đã cập nhật thông tin món ăn thành công!");
    },
    onError: (err: unknown) => {
      showToast("error", err instanceof Error ? err.message : "Không thể cập nhật món ăn.");
    },
  });

  // Delete Product Mutation
  const deleteProductMutation = useMutation({
    mutationFn: (id: string) => productApi.deleteProduct(id),
    onSuccess: () => {
      invalidateAll();
      setDeleteProductModal({ open: false });
      showToast("success", "Đã xóa món ăn khỏi thực đơn thành công!");
    },
    onError: (err: unknown) => {
      showToast("error", err instanceof Error ? err.message : "Không thể xóa món ăn.");
    },
  });

  // Category Mutations
  const createCategoryMutation = useMutation({
    mutationFn: (payload: { name: string; description?: string; displayOrder: number }) =>
      productApi.createCategory({
        name: payload.name,
        description: payload.description || null,
        displayOrder: payload.displayOrder,
      }),
    onSuccess: () => {
      invalidateAll();
      setCategoryEditModal({ open: false, mode: "create" });
      showToast("success", "Đã tạo nhóm danh mục mới thành công!");
    },
    onError: (err: unknown) => {
      showToast("error", err instanceof Error ? err.message : "Không thể tạo danh mục.");
    },
  });

  const updateCategoryMutation = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: { name: string; description?: string; displayOrder: number };
    }) =>
      productApi.updateCategory(id, {
        name: payload.name,
        description: payload.description || null,
        displayOrder: payload.displayOrder,
      }),
    onSuccess: () => {
      invalidateAll();
      setCategoryEditModal({ open: false, mode: "create" });
      showToast("success", "Đã cập nhật danh mục thành công!");
    },
    onError: (err: unknown) => {
      showToast("error", err instanceof Error ? err.message : "Không thể cập nhật danh mục.");
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: (id: string) => productApi.deleteCategory(id),
    onSuccess: (_, deletedId) => {
      invalidateAll();
      if (selectedCategory === deletedId) setSelectedCategory("all");
      setDeleteCategoryModal({ open: false });
      showToast("success", "Đã xóa danh mục thành công!");
    },
    onError: (err: unknown) => {
      showToast("error", err instanceof Error ? err.message : "Không thể xóa danh mục.");
    },
  });

  // Flatten products with category and branch info
  const allProducts = useMemo(() => {
    if (!menu?.categories) return [];
    return menu.categories.flatMap((cat) =>
      cat.products.map((p) => {
        const bp = branchProducts.find((b) => b.productId === p.id);
        return {
          ...p,
          categoryId: cat.id,
          categoryName: cat.name,
          branchProductId: bp?.id,
          isAvailable: bp ? bp.isAvailable : true,
          imageUrl: p.imageUrl,
        };
      })
    );
  }, [menu, branchProducts]);

  const filteredProducts = useMemo(() => {
    return allProducts.filter((p) => {
      if (selectedCategory !== "all" && p.categoryId !== selectedCategory) return false;
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        return p.name.toLowerCase().includes(term) || p.sku.toLowerCase().includes(term);
      }
      return true;
    });
  }, [allProducts, selectedCategory, searchTerm]);

  const stats = useMemo(() => {
    const total = allProducts.length;
    const categoriesCount = categories.length || (menu?.categories?.length ?? 0);
    return { total, categoriesCount };
  }, [allProducts, categories, menu]);

  if (!branchId) {
    return (
      <EmptyState
        title="Chưa chọn chi nhánh"
        detail="Vui lòng chọn chi nhánh ở thanh trên cùng để xem thực đơn."
      />
    );
  }

  if (menuLoading || categoriesLoading) {
    return <LoadingState fullscreen label="Đang tải dữ liệu thực đơn Quán Bếp Nhậu..." />;
  }

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-16">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed top-4 right-4 z-[100] flex items-center gap-2 px-4 py-3 rounded-xl border shadow-2xl text-xs font-bold transition-all animate-in fade-in slide-in-from-top-4 ${
            toastMessage.type === "success"
              ? "bg-[#0f2e1b] border-emerald-500/60 text-emerald-200"
              : "bg-[#331111] border-rose-500/60 text-rose-200"
          }`}
        >
          {toastMessage.type === "success" ? (
            <CheckCircle2 size={16} className="text-emerald-400" />
          ) : (
            <AlertTriangle size={16} className="text-rose-400" />
          )}
          <span>{toastMessage.text}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="ml-2 text-gray-400 hover:text-white"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Header Info Row & Actions */}
      <div className="bg-[#1c1f26] border border-[#2e333d] p-4 sm:p-6 rounded-2xl flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/10 border border-amber-500/30 flex items-center justify-center text-2xl shadow-inner">
            🍲
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-black text-white uppercase tracking-tight font-heading">
                QUẢN LÝ THỰC ĐƠN &amp; MÓN ĂN
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-orange-950/60 border border-orange-500/40 text-orange-400">
                <Sparkles size={11} /> Thực đơn Bếp Nhậu
              </span>
            </div>
            <p className="text-xs text-gray-400 m-0 mt-0.5">
              Chi nhánh: <strong className="text-amber-400">{currentBranch?.name}</strong> •{" "}
              {stats.categoriesCount} nhóm danh mục • {stats.total} món ăn &amp; đồ uống
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setCategoriesModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-gray-200 bg-[#252a35] hover:bg-[#2f3543] border border-[#384050] transition-all shadow-sm"
          >
            <Layers size={15} className="text-amber-400" />
            <span>Quản Lý Danh Mục</span>
          </button>

          <button
            type="button"
            onClick={() => setProductModal({ open: true, mode: "create" })}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 transition-all shadow-md shadow-orange-950/40"
          >
            <Plus size={16} />
            <span>Thêm Món Mới</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#181a20] border border-[#2a2e38] p-3 sm:p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-md">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 flex-1 min-w-[260px]">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm theo tên món, mã SKU..."
              className="w-full pl-9 pr-3 py-1.5 bg-[#20242c] border border-[#353a47] rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition-colors"
            />
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1 sm:pb-0 scrollbar-thin">
            <button
              type="button"
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                selectedCategory === "all"
                  ? "bg-gradient-to-b from-[#e44d13] to-[#b82d02] text-white shadow-md"
                  : "bg-[#20242c] border border-[#353a47] text-gray-400 hover:text-white"
              }`}
              onClick={() => setSelectedCategory("all")}
            >
              Tất cả ({allProducts.length})
            </button>
            {categories.map((cat) => {
              const count = allProducts.filter((p) => p.categoryId === cat.id).length;
              return (
                <button
                  key={cat.id}
                  type="button"
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                    selectedCategory === cat.id
                      ? "bg-gradient-to-b from-[#e44d13] to-[#b82d02] text-white shadow-md"
                      : "bg-[#20242c] border border-[#353a47] text-gray-400 hover:text-white"
                  }`}
                  onClick={() => setSelectedCategory(cat.id)}
                >
                  <span>{cat.name}</span>
                  <span className="text-[10px] opacity-75 font-mono">({count})</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filteredProducts.length === 0 ? (
          <div className="col-span-full bg-[#1c1f26] border border-[#2e333d] rounded-2xl p-12 text-center text-gray-400 flex flex-col items-center gap-3">
            <UtensilsCrossed size={42} className="text-gray-500 mb-1" />
            <span className="text-sm font-bold text-gray-200">Không tìm thấy món ăn nào</span>
            <span className="text-xs text-gray-500 max-w-sm">
              Chưa có món trong danh mục này hoặc không khớp với từ khóa tìm kiếm.
            </span>
            <button
              type="button"
              onClick={() => setProductModal({ open: true, mode: "create" })}
              className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-orange-600 hover:bg-orange-500 transition-all"
            >
              <Plus size={14} /> Thêm món đầu tiên
            </button>
          </div>
        ) : (
          filteredProducts.map((product) => {
            const hasVariants = product.variants && product.variants.length > 0;
            return (
              <div
                key={product.id}
                className="bg-[#1c1f26] border border-[#2e333d] hover:border-[#434b5c] rounded-2xl p-4 flex flex-col justify-between shadow-lg transition-all group relative overflow-hidden"
              >
                <div className="flex flex-col gap-2">
                  {/* Dish Image Banner */}
                  <div className="relative w-full h-36 rounded-xl overflow-hidden bg-[#14161c] border border-[#2e333d] mb-1">
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
                      <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 text-gray-500 bg-gradient-to-br from-[#1a1e28] to-[#12151d]">
                        <UtensilsCrossed size={26} className="text-gray-600" />
                        <span className="text-[10px] text-gray-500">Chưa có ảnh món</span>
                      </div>
                    )}
                    <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-md border border-white/10 text-amber-300 font-mono text-[10px] font-bold">
                      {product.sku}
                    </span>
                  </div>

                  {/* Category Tag */}
                  <div className="flex justify-between items-center text-[10px] text-gray-400 font-mono">
                    <span className="px-2 py-0.5 rounded-full bg-[#252a35] border border-[#394152] text-amber-400 font-bold truncate max-w-[160px]">
                      {product.categoryName}
                    </span>
                  </div>

                  {/* Product Title */}
                  <h3 className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors line-clamp-1 mt-0.5">
                    {product.name}
                  </h3>

                  {product.description ? (
                    <p className="text-xs text-gray-400 line-clamp-2 m-0 min-h-[32px]">
                      {product.description}
                    </p>
                  ) : (
                    <p className="text-xs text-gray-600 italic line-clamp-2 m-0 min-h-[32px]">
                      Chưa có mô tả món ăn.
                    </p>
                  )}

                  {/* Variants pill list if any */}
                  {hasVariants && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {product.variants!.map((v) => (
                        <span
                          key={v.id}
                          className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#252a34] text-gray-300 border border-[#3a4150]"
                        >
                          {v.name}: {v.price.toLocaleString("vi-VN")} đ
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Price, Status Actions and Edit/Delete */}
                <div className="mt-4 pt-3 border-t border-[#292e3a] flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold block">
                        Giá bán niêm yết
                      </span>
                      <span className="text-base font-black text-[#fef3c7] font-mono">
                        {product.price.toLocaleString("vi-VN")} đ
                      </span>
                    </div>

                    {/* Toggle Status Button */}
                    <button
                      type="button"
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all border ${
                        product.isAvailable !== false
                          ? "bg-emerald-950/40 text-emerald-400 border-emerald-500/40 hover:bg-emerald-900/60"
                          : "bg-rose-950/40 text-rose-400 border-rose-500/40 hover:bg-rose-900/60"
                      }`}
                      onClick={() =>
                        toggleStatusMutation.mutate({
                          branchProductId: product.branchProductId,
                          productId: product.id,
                          currentPrice: product.price,
                          isAvailable: !(product.isAvailable !== false),
                        })
                      }
                      title="Bấm để chuyển trạng thái Còn / Hết món"
                    >
                      <CheckCircle2 size={13} />
                      <span>{product.isAvailable !== false ? "Đang bán" : "Tạm hết"}</span>
                    </button>
                  </div>

                  {/* Card bottom toolbar: Edit & Delete buttons */}
                  <div className="flex items-center justify-end gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => setProductModal({ open: true, mode: "edit", product })}
                      className="p-1.5 rounded-lg border text-xs text-gray-300 hover:text-white bg-[#262b36] hover:bg-[#323947] border-[#394050] transition-all flex items-center gap-1"
                      title="Sửa thông tin món"
                    >
                      <Edit2 size={12} className="text-amber-400" />
                      <span className="text-[11px] font-medium">Sửa</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDeleteProductModal({ open: true, product })}
                      className="p-1.5 rounded-lg border text-xs text-rose-400 bg-rose-950/30 hover:bg-rose-900/50 border-rose-500/30 transition-all flex items-center gap-1"
                      title="Xóa món ăn"
                    >
                      <Trash2 size={12} />
                      <span className="text-[11px] font-medium">Xóa</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* MODAL 1: Thêm / Sửa Món Ăn */}
      {productModal.open && (
        <ProductFormModal
          mode={productModal.mode}
          product={productModal.product}
          categories={categories}
          isSubmitting={createProductMutation.isPending || updateProductMutation.isPending}
          onClose={() => setProductModal({ open: false, mode: "create" })}
          onSubmit={(payload) => {
            if (productModal.mode === "create") {
              createProductMutation.mutate(payload);
            } else if (productModal.product) {
              updateProductMutation.mutate({
                id: productModal.product.id,
                payload: {
                  ...payload,
                  branchProductId: productModal.product.branchProductId,
                },
              });
            }
          }}
        />
      )}

      {/* MODAL 2: Xác nhận Xóa Món Ăn */}
      {deleteProductModal.open && deleteProductModal.product && (
        <DeleteConfirmModal
          title="Xác Nhận Xóa Món Ăn"
          itemName={deleteProductModal.product.name}
          message="Bạn có chắc chắn muốn xóa món này khỏi thực đơn không? Thao tác này sẽ vô hiệu hóa món trên toàn bộ hệ thống POS và Bếp."
          isDeleting={deleteProductMutation.isPending}
          onClose={() => setDeleteProductModal({ open: false })}
          onConfirm={() => deleteProductMutation.mutate(deleteProductModal.product!.id)}
        />
      )}

      {/* MODAL 3: Quản Lý Danh Mục (Categories Management) */}
      {categoriesModalOpen && (
        <CategoriesManagementModal
          categories={categories}
          allProducts={allProducts}
          onClose={() => setCategoriesModalOpen(false)}
          onOpenCreate={() => setCategoryEditModal({ open: true, mode: "create" })}
          onOpenEdit={(cat) => setCategoryEditModal({ open: true, mode: "edit", category: cat })}
          onOpenDelete={(cat) => setDeleteCategoryModal({ open: true, category: cat })}
        />
      )}

      {/* MODAL 4: Thêm / Sửa Danh Mục */}
      {categoryEditModal.open && (
        <CategoryFormModal
          mode={categoryEditModal.mode}
          category={categoryEditModal.category}
          isSubmitting={createCategoryMutation.isPending || updateCategoryMutation.isPending}
          onClose={() => setCategoryEditModal({ open: false, mode: "create" })}
          onSubmit={(payload) => {
            if (categoryEditModal.mode === "create") {
              createCategoryMutation.mutate(payload);
            } else if (categoryEditModal.category) {
              updateCategoryMutation.mutate({
                id: categoryEditModal.category.id,
                payload,
              });
            }
          }}
        />
      )}

      {/* MODAL 5: Xác nhận Xóa Danh Mục */}
      {deleteCategoryModal.open && deleteCategoryModal.category && (
        <DeleteConfirmModal
          title="Xác Nhận Xóa Danh Mục"
          itemName={deleteCategoryModal.category.name}
          message="Bạn có chắc chắn muốn xóa nhóm danh mục này không? Các món ăn thuộc danh mục này sẽ không bị xóa mà có thể chuyển sang danh mục khác."
          isDeleting={deleteCategoryMutation.isPending}
          onClose={() => setDeleteCategoryModal({ open: false })}
          onConfirm={() => deleteCategoryMutation.mutate(deleteCategoryModal.category!.id)}
        />
      )}
    </div>
  );
}

const PRESET_IMAGES = [
  { label: "Lẩu hải sản", url: "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=600&auto=format&fit=crop&q=80" },
  { label: "Bò nướng tảng", url: "https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop&q=80" },
  { label: "Cơm chiên dưa bò", url: "https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=600&auto=format&fit=crop&q=80" },
  { label: "Mực nướng sa tế", url: "https://images.unsplash.com/photo-1559847844-5315695dadae?w=600&auto=format&fit=crop&q=80" },
  { label: "Gà chiên mắm", url: "https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=600&auto=format&fit=crop&q=80" },
  { label: "Khoai tây chiên", url: "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=600&auto=format&fit=crop&q=80" },
  { label: "Bia tươi lạnh", url: "https://images.unsplash.com/photo-1608270586620-248524c67de9?w=600&auto=format&fit=crop&q=80" },
  { label: "Trà đào cam sả", url: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=600&auto=format&fit=crop&q=80" },
];

// Sub-component: Form Thêm / Sửa Món Ăn
function ProductFormModal({
  mode,
  product,
  categories,
  isSubmitting,
  onClose,
  onSubmit,
}: {
  mode: "create" | "edit";
  product?: ProductWithContext;
  categories: CategoryListItem[];
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (payload: {
    name: string;
    sku: string;
    categoryId: string;
    price: number;
    description?: string;
    displayOrder: number;
    imageUrl?: string;
  }) => void;
}) {
  const [name, setName] = useState(product?.name || "");
  const [sku, setSku] = useState(product?.sku || "");
  const [categoryId, setCategoryId] = useState(
    product?.categoryId || (categories[0]?.id ?? "")
  );
  const [price, setPrice] = useState<number>(product?.price || 50000);
  const [description, setDescription] = useState(product?.description || "");
  const [displayOrder, setDisplayOrder] = useState<number>(1);
  const [imageUrl, setImageUrl] = useState(product?.imageUrl || "");
  const [imageError, setImageError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !sku.trim() || !categoryId) return;
    onSubmit({
      name: name.trim(),
      sku: sku.trim().toUpperCase(),
      categoryId,
      price: Number(price) || 0,
      description: description.trim() || undefined,
      displayOrder: Number(displayOrder) || 1,
      imageUrl: imageUrl.trim() || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-[#1c1f26] border border-[#353a47] rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-[#2e333e] pb-3">
          <h3 className="text-base font-black text-white font-heading flex items-center gap-2">
            <UtensilsCrossed size={18} className="text-orange-400" />
            <span>{mode === "create" ? "Thêm Món Ăn Mới" : "Cập Nhật Món Ăn"}</span>
          </h3>
          <button onClick={onClose} disabled={isSubmitting} className="text-gray-400 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-300">Tên món ăn <span className="text-rose-400">*</span></label>
            <input
              type="text"
              required
              placeholder="VD: Bò nướng tảng sốt tiêu đen, Bia Tuborg..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[#14161b] border border-[#353a47] rounded-xl px-3.5 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
            />
          </div>

          {/* Dish Image Section */}
          <div className="space-y-2 p-3 bg-[#151820] rounded-xl border border-[#2d323e]">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-gray-200 flex items-center gap-1.5">
                <ImageIcon size={14} className="text-amber-400" />
                <span>Ảnh đại diện món ăn</span>
              </label>
              {imageUrl && (
                <button
                  type="button"
                  onClick={() => {
                    setImageUrl("");
                    setImageError(false);
                  }}
                  className="text-[11px] text-rose-400 hover:text-rose-300 font-semibold cursor-pointer"
                >
                  Xóa ảnh
                </button>
              )}
            </div>

            <div className="flex gap-3 items-center">
              {/* Thumbnail preview */}
              <div className="w-16 h-16 shrink-0 rounded-lg overflow-hidden bg-[#0d0f14] border border-[#353a47] flex items-center justify-center">
                {imageUrl && !imageError ? (
                  <img
                    src={imageUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                    onError={() => setImageError(true)}
                  />
                ) : (
                  <UtensilsCrossed size={20} className="text-gray-600" />
                )}
              </div>

              {/* URL input */}
              <div className="flex-1 space-y-1">
                <input
                  type="url"
                  placeholder="https://... dán link ảnh món ăn"
                  value={imageUrl}
                  onChange={(e) => {
                    setImageUrl(e.target.value);
                    setImageError(false);
                  }}
                  className="w-full bg-[#14161b] border border-[#353a47] rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
                />
                {imageError && (
                  <p className="text-[10px] text-rose-400">Không tải được link ảnh này, vui lòng kiểm tra lại.</p>
                )}
              </div>
            </div>

            {/* Quick Presets */}
            <div className="space-y-1.5 pt-1 border-t border-[#252934]">
              <span className="text-[10px] text-gray-400 font-medium block">
                Gợi ý ảnh mẫu nhanh:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {PRESET_IMAGES.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => {
                      setImageUrl(preset.url);
                      setImageError(false);
                    }}
                    className={`text-[10px] px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                      imageUrl === preset.url
                        ? "bg-amber-500/20 border-amber-500 text-amber-300 font-bold"
                        : "bg-[#20242e] border-[#353b49] text-gray-300 hover:text-white hover:bg-[#282d3a]"
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-300">Mã SKU <span className="text-rose-400">*</span></label>
              <input
                type="text"
                required
                placeholder="VD: BO-NUONG-01"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                className="w-full bg-[#14161b] border border-[#353a47] rounded-xl px-3.5 py-2 text-xs font-mono text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 uppercase"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-300">Nhóm danh mục <span className="text-rose-400">*</span></label>
              <select
                required
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full bg-[#14161b] border border-[#353a47] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-300">Giá bán (VNĐ) <span className="text-rose-400">*</span></label>
              <input
                type="number"
                required
                min={0}
                step={1000}
                placeholder="50000"
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
                className="w-full bg-[#14161b] border border-[#353a47] rounded-xl px-3.5 py-2 text-xs font-mono font-bold text-amber-300 focus:outline-none focus:border-orange-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-300">Thứ tự hiển thị</label>
              <input
                type="number"
                min={1}
                value={displayOrder}
                onChange={(e) => setDisplayOrder(Number(e.target.value))}
                className="w-full bg-[#14161b] border border-[#353a47] rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-300">Mô tả món ăn</label>
            <textarea
              rows={2}
              placeholder="Nguyên liệu chính, hương vị, khẩu phần..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-[#14161b] border border-[#353a47] rounded-xl p-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-[#2e333e]">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs font-bold text-gray-400 hover:text-white bg-[#262a34] hover:bg-[#303642] transition-all cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 transition-all flex items-center gap-1.5 shadow-md disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>Đang lưu...</span>
                </>
              ) : (
                <span>{mode === "create" ? "Thêm món vào thực đơn" : "Lưu thay đổi"}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Sub-component: Modal Quản Lý Danh Mục
function CategoriesManagementModal({
  categories,
  allProducts,
  onClose,
  onOpenCreate,
  onOpenEdit,
  onOpenDelete,
}: {
  categories: CategoryListItem[];
  allProducts: ProductWithContext[];
  onClose: () => void;
  onOpenCreate: () => void;
  onOpenEdit: (cat: CategoryListItem) => void;
  onOpenDelete: (cat: CategoryListItem) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-[#1c1f26] border border-[#353a47] rounded-2xl w-full max-w-xl p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-[#2e333e] pb-3">
          <div className="flex items-center gap-2">
            <Layers size={20} className="text-amber-400" />
            <h3 className="text-base font-black text-white font-heading">
              Quản Lý Nhóm Danh Mục Món
            </h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <div className="flex justify-between items-center">
          <p className="text-xs text-gray-400">
            Hiện có <strong className="text-amber-400">{categories.length}</strong> nhóm món
          </p>
          <button
            type="button"
            onClick={onOpenCreate}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-orange-600 hover:bg-orange-500 transition-all shadow-sm"
          >
            <FolderPlus size={14} />
            <span>+ Tạo danh mục mới</span>
          </button>
        </div>

        {/* Categories list */}
        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {categories.length === 0 ? (
            <p className="text-xs text-gray-500 italic py-4 text-center">Chưa có danh mục nào.</p>
          ) : (
            categories.map((cat) => {
              const productCount = allProducts.filter((p) => p.categoryId === cat.id).length;
              return (
                <div
                  key={cat.id}
                  className="bg-[#14161b] border border-[#2c313d] hover:border-[#3e4555] p-3 rounded-xl flex items-center justify-between gap-3 transition-colors"
                >
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <span>{cat.name}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#222630] border border-[#363d4d] text-amber-400 font-mono font-normal">
                        {productCount} món
                      </span>
                    </h4>
                    {cat.description && (
                      <p className="text-xs text-gray-400 mt-0.5">{cat.description}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onOpenEdit(cat)}
                      className="p-1.5 rounded-lg border text-xs text-gray-300 hover:text-white bg-[#252a35] hover:bg-[#323947] border-[#384050] transition-all"
                      title="Sửa danh mục"
                    >
                      <Edit2 size={13} className="text-amber-400" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenDelete(cat)}
                      className="p-1.5 rounded-lg border text-xs text-rose-400 bg-rose-950/30 hover:bg-rose-900/50 border-rose-500/30 transition-all"
                      title="Xóa danh mục"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="flex justify-end pt-2 border-t border-[#2e333e]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-gray-300 hover:text-white bg-[#262a34] hover:bg-[#303642] transition-all"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}

// Sub-component: Form Thêm / Sửa Danh Mục
function CategoryFormModal({
  mode,
  category,
  isSubmitting,
  onClose,
  onSubmit,
}: {
  mode: "create" | "edit";
  category?: CategoryListItem;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (payload: { name: string; description?: string; displayOrder: number }) => void;
}) {
  const [name, setName] = useState(category?.name || "");
  const [description, setDescription] = useState(category?.description || "");
  const [displayOrder, setDisplayOrder] = useState<number>(category?.displayOrder || 1);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit({
      name: name.trim(),
      description: description.trim() || undefined,
      displayOrder: Number(displayOrder) || 1,
    });
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-[#1c1f26] border border-[#353a47] rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-[#2e333e] pb-3">
          <h3 className="text-base font-black text-white font-heading flex items-center gap-2">
            <Layers size={18} className="text-amber-400" />
            <span>{mode === "create" ? "Tạo Nhóm Danh Mục Mới" : "Cập Nhật Danh Mục"}</span>
          </h3>
          <button onClick={onClose} disabled={isSubmitting} className="text-gray-400 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-300">Tên danh mục <span className="text-rose-400">*</span></label>
            <input
              type="text"
              required
              placeholder="VD: Món nướng than hoa, Đồ nhúng lẩu, Bia & Đồ uống..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[#14161b] border border-[#353a47] rounded-xl px-3.5 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-300">Thứ tự hiển thị</label>
            <input
              type="number"
              min={1}
              value={displayOrder}
              onChange={(e) => setDisplayOrder(Number(e.target.value))}
              className="w-full bg-[#14161b] border border-[#353a47] rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-300">Mô tả ngắn</label>
            <textarea
              rows={2}
              placeholder="Mô tả nhóm danh mục (tùy chọn)..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-[#14161b] border border-[#353a47] rounded-xl p-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-[#2e333e]">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs font-bold text-gray-400 hover:text-white bg-[#262a34] hover:bg-[#303642] transition-all"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-orange-600 hover:bg-orange-500 transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>Đang lưu...</span>
                </>
              ) : (
                <span>{mode === "create" ? "Tạo danh mục" : "Lưu thay đổi"}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Sub-component: Modal Xác Nhận Xóa Chung (Món ăn / Danh mục)
function DeleteConfirmModal({
  title,
  itemName,
  message,
  isDeleting,
  onClose,
  onConfirm,
}: {
  title: string;
  itemName: string;
  message: string;
  isDeleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[70] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-[#1c1f26] border border-[#353a47] rounded-2xl w-full max-w-sm p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-[#2e333e] pb-3">
          <div className="flex items-center gap-2 text-rose-400">
            <AlertTriangle size={20} />
            <h3 className="text-base font-black text-white font-heading">{title}</h3>
          </div>
          <button onClick={onClose} disabled={isDeleting} className="text-gray-400 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-2">
          <p className="text-xs text-gray-300">
            Bạn có chắc chắn muốn xóa: <strong className="text-white text-sm underline decoration-rose-500">{itemName}</strong>?
          </p>
          <p className="text-[11px] text-gray-500 leading-relaxed">{message}</p>
        </div>

        <div className="flex justify-end gap-2.5 pt-3 border-t border-[#2e333e]">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 rounded-xl text-xs font-bold text-gray-400 hover:text-white bg-[#262a34] hover:bg-[#303642] transition-all"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 transition-all flex items-center gap-1.5 disabled:opacity-50"
          >
            {isDeleting ? (
              <>
                <RefreshCw size={14} className="animate-spin" />
                <span>Đang xóa...</span>
              </>
            ) : (
              <>
                <Trash2 size={14} />
                <span>Xác nhận xóa</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
