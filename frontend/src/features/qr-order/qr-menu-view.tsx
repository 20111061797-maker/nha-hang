"use client";

import { useMemo, useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { qrOrderApi } from "@/lib/api/qr-order-api";
import type { CartItem } from "@/types/qr-order";
import type { MenuProduct, MenuModifier } from "@/types/pos";
import {
  Search,
  Plus,
  Minus,
  Trash2,
  ShoppingBag,
  Flame,
  CheckCircle2,
  X,
  Beer,
  ArrowRight,
  AlertCircle,
  ChefHat,
  UtensilsCrossed,
  Sparkles,
  RefreshCw,
  Phone,
  User,
  MessageSquare,
  Receipt,
  QrCode,
  Loader2,
} from "lucide-react";
import { submitSepayCheckout } from "@/lib/sepay/checkout-redirect";
import { announcePaymentSuccess } from "@/lib/audio/payment-sound";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount);
}

const QUICK_NOTES = ["Ít cay", "Không hành", "Nhiều đá", "Để riêng sốt", "Lên món nhanh"];

type Props = {
  tableIdentifier: string;
};

export function QrMenuView({ tableIdentifier }: Props) {
  const queryClient = useQueryClient();
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [billDrawerOpen, setBillDrawerOpen] = useState(false);
  const [productModal, setProductModal] = useState<MenuProduct | null>(null);

  // Product selection modal state
  const [modalQty, setModalQty] = useState(1);
  const [modalNotes, setModalNotes] = useState("");
  const [selectedModifiers, setSelectedModifiers] = useState<MenuModifier[]>([]);

  // Guest order info
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [orderNotes, setOrderNotes] = useState("");
  const [placedOrder, setPlacedOrder] = useState<{
    orderNumber: string;
    totalAmount: number;
    tableNumber: string;
    createdAt: string;
    pointsEarned?: number | null;
    totalPoints?: number | null;
    customerName?: string | null;
    membershipLevelName?: string | null;
  } | null>(null);

  const [isSepayLoading, setIsSepayLoading] = useState(false);
  const [toastError, setToastError] = useState<string | null>(null);
  const [toastSuccess, setToastSuccess] = useState<string | null>(null);

  const showError = (msg: string) => {
    setToastError(msg);
    setTimeout(() => setToastError(null), 4000);
  };

  const showSuccess = (msg: string) => {
    setToastSuccess(msg);
    setTimeout(() => setToastSuccess(null), 5000);
  };

  const handlePaySepay = async (amount: number, orderNum: string, desc: string) => {
    try {
      setIsSepayLoading(true);
      await submitSepayCheckout({
        orderId: `DH-${orderNum}`,
        orderNumber: orderNum,
        amount,
        orderDescription: desc,
      });
    } catch (err: unknown) {
      setIsSepayLoading(false);
      showError(err instanceof Error ? err.message : "Không thể chuyển tới cổng SePay.");
    }
  };

  // 1. Fetch Table & Branch Info
  const { data: tableInfo, isLoading: tableLoading, error: tableError } = useQuery({
    queryKey: ["public-table", tableIdentifier],
    queryFn: () => qrOrderApi.getTableInfo(tableIdentifier),
    retry: 1,
  });

  // 2. Fetch Active Bill for Table (running total of all rounds)
  const tableId = tableInfo?.tableId;
  const { data: activeBill, refetch: refetchBill } = useQuery({
    queryKey: ["public-table-bill", tableId],
    queryFn: () => (tableId ? qrOrderApi.getActiveBill(tableId) : Promise.resolve(null)),
    enabled: Boolean(tableId),
    refetchInterval: 8000,
  });

  // Pre-fill customer details from active bill if already on table
  useEffect(() => {
    if (activeBill?.customerName && !guestName) {
      setGuestName(activeBill.customerName);
    }
    if (activeBill?.customerPhone && !guestPhone) {
      setGuestPhone(activeBill.customerPhone);
    }
  }, [activeBill, guestName, guestPhone]);

  // Lắng nghe kết quả thanh toán SePay khi redirect về
  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    const sepaySuccess = url.searchParams.get("sepay_success");
    const amountStr = url.searchParams.get("amount");

    if (sepaySuccess === "true") {
      const amount = Number(amountStr) || 0;
      announcePaymentSuccess(amount);
      showSuccess(`Thanh toán thành công ${formatCurrency(amount)} qua SePay! Cảm ơn quý khách.`);

      if (tableInfo?.tableId) {
        qrOrderApi
          .completeTablePayment(tableInfo.tableId)
          .then(() => {
            refetchBill();
            queryClient.invalidateQueries({ queryKey: ["public-table-bill", tableInfo.tableId] });
          })
          .catch(() => {
            refetchBill();
          });
      } else {
        refetchBill();
      }

      url.searchParams.delete("sepay_success");
      url.searchParams.delete("order_id");
      url.searchParams.delete("amount");
      window.history.replaceState({}, "", url.pathname + url.search);
    }
  }, [refetchBill, tableInfo?.tableId, queryClient]);

  // 3. Fetch Public Menu for Branch
  const branchId = tableInfo?.branchId;
  const { data: menu, isLoading: menuLoading } = useQuery({
    queryKey: ["public-menu", branchId],
    queryFn: () => (branchId ? qrOrderApi.getPublicMenu(branchId) : Promise.resolve(null)),
    enabled: Boolean(branchId),
  });

  // 4. Submit Order Mutation
  const placeOrderMutation = useMutation({
    mutationFn: qrOrderApi.placeOrder,
    onSuccess: (res) => {
      setCart([]);
      setCartOpen(false);
      setPlacedOrder({
        orderNumber: res.orderNumber,
        totalAmount: res.totalAmount,
        tableNumber: res.tableNumber,
        createdAt: res.createdAt,
        pointsEarned: res.pointsEarned,
        totalPoints: res.totalPoints,
        customerName: res.customerName,
        membershipLevelName: res.membershipLevelName,
      });
      if (tableId) {
        queryClient.invalidateQueries({ queryKey: ["public-table-bill", tableId] });
      }
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Không thể đặt món. Vui lòng thử lại.";
      showError(msg);
    },
  });

  // Filter products
  const categories = useMemo(() => menu?.categories ?? [], [menu?.categories]);
  const filteredProducts = useMemo(() => {
    let prods = categories.flatMap((c) =>
      c.products.map((p) => ({ ...p, categoryId: c.id, categoryName: c.name }))
    );

    if (selectedCategoryId !== "all") {
      prods = prods.filter((p) => p.categoryId === selectedCategoryId);
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      prods = prods.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          (p.description && p.description.toLowerCase().includes(q))
      );
    }

    return prods;
  }, [categories, selectedCategoryId, search]);

  // Cart total calculations
  const totalItemsCount = useMemo(() => cart.reduce((sum, i) => sum + i.quantity, 0), [cart]);
  const cartSubtotal = useMemo(() => cart.reduce((sum, i) => sum + i.lineTotal, 0), [cart]);

  const getProductCartCount = (productId: string) => {
    return cart
      .filter((c) => c.productId === productId)
      .reduce((sum, item) => sum + item.quantity, 0);
  };

  const handleOpenProduct = (product: MenuProduct) => {
    setProductModal(product);
    setModalQty(1);
    setModalNotes("");
    setSelectedModifiers([]);
  };

  const handleToggleModifier = (mod: MenuModifier) => {
    setSelectedModifiers((prev) =>
      prev.some((m) => m.id === mod.id) ? prev.filter((m) => m.id !== mod.id) : [...prev, mod]
    );
  };

  const addQuickNote = (note: string) => {
    setModalNotes((prev) => {
      if (!prev.trim()) return note;
      if (prev.includes(note)) return prev;
      return `${prev}, ${note}`;
    });
  };

  const handleAddToCart = () => {
    if (!productModal) return;
    const modTotal = selectedModifiers.reduce((sum, m) => sum + m.price, 0);
    const unitPrice = productModal.price + modTotal;
    const lineTotal = unitPrice * modalQty;

    const newItem: CartItem = {
      cartItemId: `${productModal.id}-${Date.now()}-${Math.random()}`,
      productId: productModal.id,
      productName: productModal.name,
      unitPrice,
      quantity: modalQty,
      selectedModifiers: selectedModifiers.map((m) => ({
        id: m.id,
        name: m.name,
        price: m.price,
      })),
      notes: modalNotes.trim() || undefined,
      lineTotal,
      imageUrl: productModal.imageUrl,
    };

    setCart((prev) => [...prev, newItem]);
    setProductModal(null);
  };

  const handleQuickAdd = (product: MenuProduct) => {
    const hasModifiers =
      (product.modifierGroups && product.modifierGroups.length > 0) ||
      (product.variants && product.variants.length > 0);
    if (hasModifiers) {
      handleOpenProduct(product);
      return;
    }

    const existing = cart.find(
      (c) => c.productId === product.id && c.selectedModifiers.length === 0 && !c.notes
    );
    if (existing) {
      handleUpdateQty(existing.cartItemId, 1);
    } else {
      const newItem: CartItem = {
        cartItemId: `${product.id}-${Date.now()}-${Math.random()}`,
        productId: product.id,
        productName: product.name,
        unitPrice: product.price,
        quantity: 1,
        selectedModifiers: [],
        lineTotal: product.price,
        imageUrl: product.imageUrl,
      };
      setCart((prev) => [...prev, newItem]);
    }
  };

  const handleQuickMinus = (product: MenuProduct) => {
    const existing = cart.find(
      (c) => c.productId === product.id && c.selectedModifiers.length === 0 && !c.notes
    );
    if (existing) {
      handleUpdateQty(existing.cartItemId, -1);
    }
  };

  const handleUpdateQty = (cartItemId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.cartItemId === cartItemId) {
            const newQty = item.quantity + delta;
            return newQty > 0
              ? { ...item, quantity: newQty, lineTotal: item.unitPrice * newQty }
              : null;
          }
          return item;
        })
        .filter((item): item is CartItem => item !== null)
    );
  };

  const handleConfirmOrder = () => {
    if (!tableInfo || cart.length === 0) return;

    placeOrderMutation.mutate({
      branchId: tableInfo.branchId,
      tableId: tableInfo.tableId,
      customerName: guestName.trim() || undefined,
      customerPhone: guestPhone.trim() || undefined,
      notes: orderNotes.trim() || undefined,
      items: cart.map((c) => ({
        productId: c.productId,
        productVariantId: c.variantId,
        modifierIds: c.selectedModifiers.map((m) => m.id),
        quantity: c.quantity,
        notes: c.notes,
      })),
    });
  };

  if (tableLoading || menuLoading) {
    return (
      <div className="min-h-screen bg-[#101216] flex flex-col items-center justify-center text-gray-400 p-6">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500/20 to-amber-500/10 border border-orange-500/30 flex items-center justify-center mb-4 shadow-xl">
          <Beer className="text-orange-400 animate-spin" size={32} />
        </div>
        <p className="text-base font-bold text-gray-100">Đang tải thực đơn Quán Bếp Nhậu...</p>
        <p className="text-xs text-gray-500 mt-1">Chuẩn bị không gian gọi món cho quý khách</p>
      </div>
    );
  }

  if (tableError || !tableInfo) {
    return (
      <div className="min-h-screen bg-[#101216] flex flex-col items-center justify-center text-center p-6">
        <div className="w-20 h-20 rounded-3xl bg-red-950/60 border border-red-500/40 text-rose-400 flex items-center justify-center mb-4 shadow-2xl">
          <AlertCircle size={38} />
        </div>
        <h2 className="text-xl font-black text-white">Mã QR không hợp lệ</h2>
        <p className="text-xs text-gray-400 mt-2 max-w-sm">
          Không tìm thấy bàn ăn tương ứng hoặc bàn đã được tắt hoạt động. Vui lòng liên hệ nhân viên phục vụ tại quán.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-6 px-6 py-2.5 rounded-xl bg-[#202532] hover:bg-[#2b3243] text-gray-200 text-xs font-bold border border-white/10 transition-colors cursor-pointer"
        >
          Tải lại trang
        </button>
      </div>
    );
  }

  // Success view
  if (placedOrder) {
    return (
      <div className="min-h-screen bg-[#101216] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-emerald-600 to-green-400 flex items-center justify-center text-white shadow-2xl shadow-emerald-950/60 mb-5 animate-in zoom-in-75">
          <CheckCircle2 size={44} className="stroke-[2.5]" />
        </div>

        <span className="px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono shadow-sm">
          Bàn {placedOrder.tableNumber}
        </span>

        <h1 className="text-2xl sm:text-3xl font-black text-white mt-3 font-heading">
          Đã gửi đơn vào Bếp!
        </h1>

        <p className="text-xs sm:text-sm text-gray-300 mt-2 max-w-sm leading-relaxed">
          Đơn gọi món của bạn đã chuyển tới màn hình Bếp KDS. Các đầu bếp đang khẩn trương chuẩn bị món ngon nóng hổi!
        </p>

        <div className="bg-[#181c25] border border-[#2a3140] rounded-2xl p-4.5 w-full max-w-sm my-6 text-left space-y-2.5 shadow-2xl">
          <div className="flex justify-between items-center text-xs text-gray-400">
            <span>Mã đơn hàng:</span>
            <span className="font-mono text-amber-300 font-bold">{placedOrder.orderNumber}</span>
          </div>
          <div className="flex justify-between items-center text-xs text-gray-400">
            <span>Thời gian đặt:</span>
            <span className="text-gray-200 font-mono">
              {new Date(placedOrder.createdAt).toLocaleTimeString("vi-VN", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
          <div className="flex justify-between items-center text-sm font-extrabold text-white pt-2.5 border-t border-[#282f3e]">
            <div>
              <span>Tổng hóa đơn bàn hiện tại:</span>
              <span className="block text-[10px] text-emerald-400 font-normal">Đã tự động cộng dồn tất cả các món</span>
            </div>
            <span className="text-lg font-black text-amber-400 font-mono">
              {formatCurrency(placedOrder.totalAmount)}
            </span>
          </div>

          {placedOrder.pointsEarned ? (
            <div className="pt-2.5 border-t border-[#282f3e] flex items-center justify-between bg-amber-500/10 -mx-4.5 -mb-4.5 p-3 rounded-b-2xl border-t border-amber-500/20">
              <div className="flex items-center gap-2">
                <Sparkles size={18} className="text-amber-400 shrink-0 animate-pulse" />
                <div>
                  <span className="text-xs font-bold text-amber-300">Tích lũy điểm thành công!</span>
                  <span className="block text-[10px] text-gray-400">
                    {placedOrder.customerName ? `Khách: ${placedOrder.customerName}` : "Thành viên"}
                    {placedOrder.membershipLevelName ? ` • ${placedOrder.membershipLevelName}` : ""}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-sm font-black text-amber-400 font-mono">
                  +{placedOrder.pointsEarned} điểm
                </span>
                {placedOrder.totalPoints !== undefined && placedOrder.totalPoints !== null && (
                  <span className="block text-[10px] text-amber-300/80 font-mono">
                    (Tổng: {placedOrder.totalPoints} đ)
                  </span>
                )}
              </div>
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-2.5 w-full max-w-sm">
          {placedOrder.totalAmount > 0 && (
            <button
              type="button"
              disabled={isSepayLoading}
              onClick={() =>
                handlePaySepay(
                  placedOrder.totalAmount,
                  placedOrder.orderNumber || "ORDER",
                  `Thanh toan don #${placedOrder.orderNumber} - Ban ${placedOrder.tableNumber}`
                )
              }
              className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-500 disabled:opacity-60 text-white font-extrabold text-sm shadow-xl shadow-orange-950/50 active:scale-95 transition-all cursor-pointer"
            >
              {isSepayLoading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <QrCode size={18} />
              )}
              <span>
                {isSepayLoading
                  ? "Đang chuyển tới SePay..."
                  : "Thanh toán ngay qua SePay (VietQR / Thẻ)"}
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setPlacedOrder(null);
              refetchBill();
            }}
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-[#202636] hover:bg-[#2b3346] text-white font-bold text-xs transition-colors cursor-pointer"
          >
            <span>Xem thực đơn &amp; Gọi thêm món</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f1115] text-gray-100 pb-32">
      {/* Toast Messages */}
      {toastError && (
        <div className="fixed top-4 left-4 right-4 z-50 max-w-md mx-auto p-3.5 rounded-2xl bg-rose-950/90 border border-rose-500/50 text-rose-200 text-xs font-bold shadow-2xl flex items-center gap-2.5 backdrop-blur-md animate-in slide-in-from-top-4">
          <AlertCircle size={18} className="shrink-0 text-rose-400" />
          <span>{toastError}</span>
        </div>
      )}
      {toastSuccess && (
        <div className="fixed top-4 left-4 right-4 z-50 max-w-md mx-auto p-3.5 rounded-2xl bg-emerald-950/90 border border-emerald-500/50 text-emerald-200 text-xs font-bold shadow-2xl flex items-center gap-2.5 backdrop-blur-md animate-in slide-in-from-top-4">
          <CheckCircle2 size={18} className="shrink-0 text-emerald-400" />
          <span>{toastSuccess}</span>
        </div>
      )}

      {/* Hero Brand Header */}
      <header className="sticky top-0 z-30 bg-[#141720]/95 backdrop-blur-xl border-b border-[#252b3a] px-4 py-3 shadow-lg shadow-black/30">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative w-11 h-11 shrink-0 rounded-2xl bg-gradient-to-br from-amber-500 via-orange-600 to-rose-600 flex items-center justify-center text-white shadow-lg shadow-orange-950/50 border border-white/20">
              <Flame size={22} className="fill-white/20 stroke-[2.5]" />
              <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-[#141720]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base font-black text-white tracking-tight truncate font-heading">
                  {tableInfo.branchName}
                </h1>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black font-mono bg-gradient-to-r from-amber-400 to-orange-500 text-black shadow-sm">
                  BÀN {tableInfo.tableNumber}
                </span>
              </div>
              <p className="text-[11px] text-gray-400 truncate mt-0.5 flex items-center gap-1.5">
                <span className="text-amber-400 font-semibold">{tableInfo.areaName}</span>
                <span>•</span>
                <span>Quét mã gọi món trực tiếp</span>
              </p>
            </div>
          </div>

          <div className="shrink-0 flex items-center gap-1.5 text-[11px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-3 py-1.5 rounded-full shadow-inner">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="hidden sm:inline">KDS Bếp sẵn sàng</span>
            <span className="sm:hidden">Bếp sẵn sàng</span>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 pt-4 space-y-4">
        {/* Active Running Bill for this table */}
        {activeBill?.hasActiveOrder && (
          <div className="bg-gradient-to-r from-amber-950/70 via-[#1b202c] to-[#141720] border border-amber-500/40 rounded-2xl p-3.5 flex items-center justify-between gap-3 shadow-xl">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0">
                <Receipt size={20} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-black text-amber-300 uppercase tracking-wider">
                    Hóa đơn Bàn {tableInfo?.tableNumber}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-500/30 font-bold">
                    {activeBill.items.reduce((s, i) => s + i.quantity, 0)} món đã gọi
                  </span>
                </div>
                <div className="text-base font-black text-white font-mono mt-0.5">
                  {formatCurrency(activeBill.totalAmount)}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setBillDrawerOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-black shadow-md shadow-amber-950/40 transition-all shrink-0 cursor-pointer"
            >
              Xem chi tiết
            </button>
          </div>
        )}

        {/* Search Input with modern styling */}
        <div className="relative">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm món nhậu, lẩu, nướng, bia mát lạnh..."
            className="w-full bg-[#181c25] border border-[#2a3140] rounded-2xl pl-10 pr-10 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/50 transition-all shadow-inner"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white p-1 rounded-full hover:bg-white/10"
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* Categories Tab Scroll */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar scrollbar-none">
          <button
            type="button"
            onClick={() => setSelectedCategoryId("all")}
            className={`shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
              selectedCategoryId === "all"
                ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white border-orange-400/60 shadow-lg shadow-orange-500/25 scale-[1.02]"
                : "bg-[#181c25] text-gray-300 hover:text-white hover:bg-[#202634] border-[#293040]"
            }`}
          >
            <span>Tất cả món</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                selectedCategoryId === "all" ? "bg-black/30 text-white" : "bg-white/10 text-gray-400"
              }`}
            >
              {categories.flatMap((c) => c.products).length}
            </span>
          </button>
          {categories.map((cat) => {
            const isSelected = selectedCategoryId === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategoryId(cat.id)}
                className={`shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                  isSelected
                    ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white border-orange-400/60 shadow-lg shadow-orange-500/25 scale-[1.02]"
                    : "bg-[#181c25] text-gray-300 hover:text-white hover:bg-[#202634] border-[#293040]"
                }`}
              >
                <span>{cat.name}</span>
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                    isSelected ? "bg-black/30 text-white" : "bg-white/10 text-gray-400"
                  }`}
                >
                  {cat.products.length}
                </span>
              </button>
            );
          })}
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filteredProducts.length === 0 ? (
            <div className="col-span-full py-16 text-center text-gray-500 flex flex-col items-center gap-3 bg-[#141720] rounded-3xl border border-[#232836] p-8">
              <UtensilsCrossed size={40} className="text-gray-600" />
              <p className="text-base font-bold text-gray-300">Không tìm thấy món ăn nào phù hợp</p>
              <p className="text-xs text-gray-500 max-w-xs">
                Quý khách vui lòng thử tìm với từ khóa khác hoặc chọn danh mục khác.
              </p>
            </div>
          ) : (
            filteredProducts.map((product) => {
              const hasModifiers =
                (product.modifierGroups && product.modifierGroups.length > 0) ||
                (product.variants && product.variants.length > 0);
              const inCartQty = getProductCartCount(product.id);

              return (
                <div
                  key={product.id}
                  className="group relative flex flex-col justify-between rounded-2xl bg-[#181c25] border border-[#282f3e] hover:border-orange-500/50 shadow-lg hover:shadow-2xl hover:shadow-orange-950/20 transition-all duration-300 overflow-hidden"
                >
                  {/* Product Image Banner */}
                  <div
                    className="relative w-full h-44 bg-[#111318] overflow-hidden cursor-pointer"
                    onClick={() => handleOpenProduct(product)}
                  >
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = "none";
                        }}
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-[#1a1f2b] to-[#12151d] flex flex-col items-center justify-center gap-1.5 text-gray-500">
                        <ChefHat size={32} className="text-gray-600" />
                        <span className="text-[11px] text-gray-500 font-medium">Quán Bếp Nhậu</span>
                      </div>
                    )}

                    <div className="absolute inset-0 bg-gradient-to-t from-[#181c25] via-transparent to-black/30" />

                    {/* Badges on top */}
                    <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-1 pointer-events-none">
                      <span className="text-[10px] font-mono font-bold text-gray-200 bg-black/70 backdrop-blur-md px-2 py-0.5 rounded-lg border border-white/10">
                        {product.categoryName}
                      </span>

                      {hasModifiers && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-300 bg-black/75 backdrop-blur-md px-2 py-0.5 rounded-full border border-amber-500/40">
                          <Sparkles size={10} className="text-amber-400" /> Tùy chọn
                        </span>
                      )}
                    </div>

                    {/* Quantity In Cart Badge */}
                    {inCartQty > 0 && (
                      <div className="absolute bottom-2.5 left-2.5 px-2.5 py-0.5 rounded-full bg-emerald-500 text-black text-[11px] font-black shadow-md flex items-center gap-1 animate-in zoom-in-50">
                        <span>Đã chọn:</span>
                        <span className="font-mono text-xs">{inCartQty}</span>
                      </div>
                    )}
                  </div>

                  {/* Card Body */}
                  <div
                    className="p-3.5 flex-1 flex flex-col justify-between cursor-pointer"
                    onClick={() => handleOpenProduct(product)}
                  >
                    <div>
                      <h3 className="font-bold text-white text-base group-hover:text-amber-300 transition-colors line-clamp-1 leading-snug">
                        {product.name}
                      </h3>

                      {product.description ? (
                        <p className="text-xs text-gray-400 mt-1 line-clamp-2 leading-relaxed min-h-[32px]">
                          {product.description}
                        </p>
                      ) : (
                        <p className="text-xs text-gray-600 italic mt-1 line-clamp-2 min-h-[32px]">
                          Món ngon đặc sắc tại Quán Bếp Nhậu.
                        </p>
                      )}
                    </div>

                    {/* Price & Action Button */}
                    <div
                      className="mt-3.5 pt-3 border-t border-[#262c39] flex items-center justify-between gap-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div>
                        <span className="text-[10px] text-gray-500 uppercase tracking-wider block font-semibold">
                          Giá món
                        </span>
                        <span className="text-lg font-black font-mono text-amber-400 tracking-tight">
                          {formatCurrency(product.price)}
                        </span>
                      </div>

                      {/* Direct In-card Stepper or Add button */}
                      {inCartQty > 0 && !hasModifiers ? (
                        <div className="flex items-center gap-2 bg-[#12151d] p-1 rounded-xl border border-[#2e3646]">
                          <button
                            type="button"
                            onClick={() => handleQuickMinus(product)}
                            className="w-8 h-8 rounded-lg bg-[#202533] hover:bg-[#2a3142] text-white flex items-center justify-center active:scale-90 transition-all cursor-pointer"
                          >
                            {inCartQty === 1 ? (
                              <Trash2 size={14} className="text-rose-400" />
                            ) : (
                              <Minus size={14} />
                            )}
                          </button>
                          <span className="w-6 text-center font-mono font-black text-sm text-white">
                            {inCartQty}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleQuickAdd(product)}
                            className="w-8 h-8 rounded-lg bg-gradient-to-r from-orange-500 to-amber-500 text-white flex items-center justify-center active:scale-90 transition-all shadow cursor-pointer"
                          >
                            <Plus size={14} className="stroke-[3]" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            if (hasModifiers) {
                              handleOpenProduct(product);
                            } else {
                              handleQuickAdd(product);
                            }
                          }}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-extrabold text-xs shadow-md shadow-orange-950/40 active:scale-95 transition-all cursor-pointer"
                        >
                          <Plus size={15} className="stroke-[3]" />
                          <span>{hasModifiers ? "Tùy chọn" : "Thêm"}</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>

      {/* Floating Bottom Cart Bar */}
      {totalItemsCount > 0 && (
        <div className="fixed bottom-4 left-4 right-4 z-40 max-w-3xl mx-auto animate-in slide-in-from-bottom-5">
          <div
            onClick={() => setCartOpen(true)}
            className="bg-gradient-to-r from-orange-600 via-amber-600 to-orange-500 text-white p-3.5 rounded-2xl shadow-2xl shadow-black/60 flex items-center justify-between cursor-pointer active:scale-[0.98] transition-all border border-orange-400/40 backdrop-blur-md"
          >
            <div className="flex items-center gap-3">
              <div className="relative w-11 h-11 rounded-xl bg-black/25 backdrop-blur-sm flex items-center justify-center font-bold text-white border border-white/10">
                <ShoppingBag size={22} />
                <span className="absolute -top-1.5 -right-1.5 bg-white text-orange-950 text-xs font-black w-5 h-5 rounded-full flex items-center justify-center shadow-md">
                  {totalItemsCount}
                </span>
              </div>
              <div>
                <span className="text-xs font-bold text-amber-100 flex items-center gap-1.5">
                  <span>Giỏ món Bàn {tableInfo.tableNumber}</span>
                  <span className="text-[10px] bg-white/20 px-1.5 py-0.2 rounded-full font-mono">
                    {totalItemsCount} món
                  </span>
                </span>
                <span className="text-lg font-black text-white font-mono leading-none mt-0.5 block">
                  {formatCurrency(cartSubtotal)}
                </span>
              </div>
            </div>

            <button
              type="button"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-black/80 hover:bg-black text-white font-extrabold text-xs transition-colors shadow-md border border-white/10"
            >
              <span>Xem giỏ &amp; Đặt món</span>
              <ArrowRight size={15} />
            </button>
          </div>
        </div>
      )}

      {/* Product Option Modal */}
      {productModal && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in"
          onClick={() => setProductModal(null)}
        >
          <div
            className="bg-[#181c25] border border-[#2d3546] w-full max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-in slide-in-from-bottom-6 sm:zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header image banner */}
            <div className="relative w-full h-48 bg-[#111318] shrink-0 overflow-hidden">
              {productModal.imageUrl ? (
                <img
                  src={productModal.imageUrl}
                  alt={productModal.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-[#1a1f2b] to-[#12151d] flex flex-col items-center justify-center text-gray-600 gap-1">
                  <ChefHat size={36} className="text-gray-600" />
                  <span className="text-xs text-gray-500 font-medium">Quán Bếp Nhậu</span>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-[#181c25] via-transparent to-black/40" />

              <button
                type="button"
                onClick={() => setProductModal(null)}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/80 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>

              <div className="absolute bottom-3 left-4 right-4">
                <span className="text-[10px] font-mono font-bold text-amber-300 bg-black/70 backdrop-blur-md px-2 py-0.5 rounded-md border border-white/10">
                  {productModal.sku}
                </span>
                <h3 className="text-lg font-black text-white leading-tight mt-1">
                  {productModal.name}
                </h3>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-4 space-y-4 overflow-y-auto flex-1">
              {productModal.description && (
                <p className="text-xs text-gray-300 leading-relaxed bg-[#12151d] p-3 rounded-xl border border-[#252b39]">
                  {productModal.description}
                </p>
              )}

              {/* Modifiers / Options */}
              {productModal.modifierGroups && productModal.modifierGroups.length > 0 && (
                <div className="space-y-3">
                  {productModal.modifierGroups.map((group) => (
                    <div key={group.id} className="space-y-2">
                      <span className="text-xs font-bold text-gray-300 block uppercase tracking-wider">
                        {group.name} {group.isRequired && <span className="text-rose-400">*</span>}
                      </span>
                      <div className="grid grid-cols-1 gap-2">
                        {group.modifiers.map((mod) => {
                          const isSelected = selectedModifiers.some((m) => m.id === mod.id);
                          return (
                            <button
                              key={mod.id}
                              type="button"
                              onClick={() => handleToggleModifier(mod)}
                              className={`p-3 rounded-xl border text-left flex items-center justify-between text-xs transition-all cursor-pointer ${
                                isSelected
                                  ? "bg-amber-500/20 border-amber-500 text-white font-bold"
                                  : "bg-[#12151d] border-[#262c3b] text-gray-300 hover:bg-[#1a1f2b]"
                              }`}
                            >
                              <span>{mod.name}</span>
                              <span className="text-amber-400 font-mono font-bold">
                                +{formatCurrency(mod.price)}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Notes & Quick suggestions */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-300 flex items-center gap-1.5">
                  <MessageSquare size={13} className="text-amber-400" />
                  <span>Ghi chú riêng cho món này</span>
                </label>
                <input
                  type="text"
                  value={modalNotes}
                  onChange={(e) => setModalNotes(e.target.value)}
                  placeholder="Ví dụ: Ít cay, không hành, làm giòn..."
                  className="w-full bg-[#12151d] border border-[#262c3b] rounded-xl px-3 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
                />
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {QUICK_NOTES.map((qn) => (
                    <button
                      key={qn}
                      type="button"
                      onClick={() => addQuickNote(qn)}
                      className="text-[10px] px-2.5 py-1 rounded-lg bg-[#202532] text-gray-300 hover:text-white border border-[#2e3648] hover:border-amber-400 transition-colors cursor-pointer"
                    >
                      + {qn}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quantity Selector */}
              <div className="flex items-center justify-between pt-3 border-t border-[#262c3a]">
                <span className="text-xs font-bold text-gray-300">Số lượng phần ăn:</span>
                <div className="flex items-center gap-3 bg-[#12151d] p-1 rounded-xl border border-[#262c3b]">
                  <button
                    type="button"
                    onClick={() => setModalQty((q) => Math.max(1, q - 1))}
                    className="w-8 h-8 rounded-lg bg-[#202532] hover:bg-[#2c3345] text-white flex items-center justify-center font-bold cursor-pointer"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="text-base font-black text-white w-6 text-center font-mono">
                    {modalQty}
                  </span>
                  <button
                    type="button"
                    onClick={() => setModalQty((q) => q + 1)}
                    className="w-8 h-8 rounded-lg bg-gradient-to-r from-orange-500 to-amber-500 text-white flex items-center justify-center font-bold shadow cursor-pointer"
                  >
                    <Plus size={14} className="stroke-[3]" />
                  </button>
                </div>
              </div>
            </div>

            {/* Bottom Modal CTA */}
            <div className="p-4 bg-[#141720] border-t border-[#262c3a] flex items-center justify-between gap-3">
              <div>
                <span className="text-[10px] text-gray-500 uppercase tracking-wider block font-semibold">
                  Tạm tính ({modalQty} phần)
                </span>
                <span className="text-base font-black text-amber-400 font-mono">
                  {formatCurrency(
                    (productModal.price +
                      selectedModifiers.reduce((sum, m) => sum + m.price, 0)) *
                      modalQty
                  )}
                </span>
              </div>

              <button
                type="button"
                onClick={handleAddToCart}
                className="flex-1 max-w-[200px] py-3 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black text-xs shadow-lg shadow-orange-950/50 active:scale-95 transition-all cursor-pointer text-center"
              >
                Thêm vào giỏ hàng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cart Bottom Sheet / Drawer */}
      {cartOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in"
          onClick={() => setCartOpen(false)}
        >
          <div
            className="bg-[#181c25] border border-[#2d3546] w-full max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[88vh] flex flex-col animate-in slide-in-from-bottom-6 sm:zoom-in-95 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-4 border-b border-[#262c3a] flex items-center justify-between bg-[#141720]">
              <div>
                <h3 className="text-base font-black text-white flex items-center gap-2 font-heading">
                  <ShoppingBag size={18} className="text-orange-400" />
                  <span>Giỏ hàng Bàn {tableInfo.tableNumber}</span>
                </h3>
                <span className="text-[11px] text-gray-400 font-mono">
                  {tableInfo.branchName} • {totalItemsCount} món ăn
                </span>
              </div>
              <button
                type="button"
                onClick={() => setCartOpen(false)}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Cart Items List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {cart.map((item) => (
                <div
                  key={item.cartItemId}
                  className="bg-[#12151d] p-3 rounded-2xl border border-[#262c3b] flex items-center justify-between gap-3 shadow-md"
                >
                  {/* Thumbnail */}
                  <div className="w-14 h-14 shrink-0 rounded-xl overflow-hidden bg-[#0d0f14] border border-[#2a3040]">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.productName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-600">
                        <ChefHat size={18} />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold text-white truncate">
                      {item.productName}
                    </h4>
                    {item.selectedModifiers.length > 0 && (
                      <p className="text-[11px] text-amber-400 truncate">
                        + {item.selectedModifiers.map((m) => m.name).join(", ")}
                      </p>
                    )}
                    {item.notes && (
                      <p className="text-[11px] text-gray-400 italic truncate">
                        Ghi chú: {item.notes}
                      </p>
                    )}
                    <span className="text-xs font-black text-amber-400 font-mono mt-0.5 block">
                      {formatCurrency(item.lineTotal)}
                    </span>
                  </div>

                  {/* Controls */}
                  <div className="flex items-center gap-1.5 shrink-0 bg-[#0d0f14] p-1 rounded-xl border border-[#222735]">
                    <button
                      type="button"
                      onClick={() => handleUpdateQty(item.cartItemId, -1)}
                      className="w-7 h-7 rounded-lg bg-[#181c26] text-white flex items-center justify-center hover:bg-[#232838] active:scale-90 transition-all cursor-pointer"
                    >
                      {item.quantity === 1 ? (
                        <Trash2 size={13} className="text-rose-400" />
                      ) : (
                        <Minus size={13} />
                      )}
                    </button>
                    <span className="text-sm font-black text-white w-5 text-center font-mono">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleUpdateQty(item.cartItemId, 1)}
                      className="w-7 h-7 rounded-lg bg-gradient-to-r from-orange-500 to-amber-500 text-white flex items-center justify-center active:scale-90 transition-all cursor-pointer"
                    >
                      <Plus size={13} className="stroke-[3]" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Guest Details & Confirm Form */}
            <div className="p-4 bg-[#141720] border-t border-[#262c3a] space-y-3">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-gray-300 mb-1 flex items-center gap-1">
                    <User size={12} className="text-amber-400" />
                    <span>Tên quý khách (Tùy chọn)</span>
                  </label>
                  <input
                    type="text"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    placeholder="Ví dụ: Anh Nam"
                    className="w-full bg-[#12151d] border border-[#262c3b] rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-300 mb-1 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Phone size={12} className="text-amber-400" />
                      <span>SĐT tích điểm (Tùy chọn)</span>
                    </span>
                    <span className="text-[10px] text-amber-400 font-normal flex items-center gap-0.5">
                      <Sparkles size={10} /> +10k = 1đ
                    </span>
                  </label>
                  <input
                    type="tel"
                    value={guestPhone}
                    onChange={(e) => setGuestPhone(e.target.value)}
                    placeholder="09xx..."
                    className="w-full bg-[#12151d] border border-[#262c3b] rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 font-mono"
                  />
                  <p className="text-[9.5px] text-gray-400 mt-1">
                    Nhập SĐT để tự động lưu khách hàng &amp; tích điểm nâng hạng thành viên.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-300 mb-1 flex items-center gap-1">
                  <MessageSquare size={12} className="text-amber-400" />
                  <span>Dặn dò Bếp &amp; Phục vụ</span>
                </label>
                <input
                  type="text"
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  placeholder="Ví dụ: Lên bia trước, làm món nóng giòn..."
                  className="w-full bg-[#12151d] border border-[#262c3b] rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <div>
                  <span className="text-[10px] text-gray-500 uppercase tracking-wider block font-semibold">
                    Tổng thanh toán
                  </span>
                  <span className="text-xl font-black text-amber-400 font-mono">
                    {formatCurrency(cartSubtotal)}
                  </span>
                </div>

                <button
                  type="button"
                  disabled={placeOrderMutation.isPending || cart.length === 0}
                  onClick={handleConfirmOrder}
                  className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black text-xs shadow-xl shadow-orange-950/50 disabled:opacity-50 transition-all cursor-pointer flex items-center gap-2"
                >
                  {placeOrderMutation.isPending ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      <span>ĐANG GỬI VÀO BẾP...</span>
                    </>
                  ) : (
                    <>
                      <Flame size={16} className="fill-white stroke-none" />
                      <span>XÁC NHẬN GỌI MÓN</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Active Bill Detail Modal */}
      {billDrawerOpen && activeBill?.hasActiveOrder && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in"
          onClick={() => setBillDrawerOpen(false)}
        >
          <div
            className="w-full max-w-lg bg-[#151822] border border-[#262c3d] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden animate-in slide-in-from-bottom-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-4 bg-gradient-to-r from-[#1c2230] to-[#151822] border-b border-[#252c3c] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  <Receipt size={18} />
                </div>
                <div>
                  <h3 className="text-base font-black text-white font-heading">
                    Hóa đơn Bàn {tableInfo?.tableNumber}
                  </h3>
                  <p className="text-[11px] text-gray-400 font-mono">
                    Mã đơn: #{activeBill.orderNumber ? (activeBill.orderNumber.length > 14 ? activeBill.orderNumber.slice(-8) : activeBill.orderNumber) : ""}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setBillDrawerOpen(false)}
                className="p-1.5 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Items list */}
            <div className="p-4 flex-1 overflow-y-auto space-y-2.5 max-h-[420px]">
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                Danh sách món đã gọi ({activeBill.items.reduce((s, i) => s + i.quantity, 0)} phần)
              </div>
              {activeBill.items.map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-xl bg-[#1b202d] border border-[#272e3f] flex items-start justify-between gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="font-bold text-sm text-gray-100">
                        {item.productNameSnapshot}
                      </span>
                      {item.variantNameSnapshot && (
                        <span className="text-[10px] font-medium text-sky-400 bg-sky-500/10 px-1.5 py-0.5 rounded border border-sky-500/20">
                          {item.variantNameSnapshot}
                        </span>
                      )}
                    </div>
                    {item.notes && (
                      <div className="text-[11px] text-amber-300/80 italic mt-0.5">
                        Ghi chú: {item.notes}
                      </div>
                    )}
                    <div className="text-[11px] text-gray-400 mt-1">
                      {formatCurrency(item.unitPrice)} × <strong className="text-white font-mono">{item.quantity}</strong>
                    </div>
                  </div>
                  <span className="font-mono font-bold text-sm text-amber-300 shrink-0">
                    {formatCurrency(item.lineTotal)}
                  </span>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="p-4 bg-[#12151e] border-t border-[#252c3c] flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">
                    Tổng hóa đơn hiện tại
                  </span>
                  <span className="text-[10px] text-emerald-400">Đã cộng dồn tất cả các đợt gọi món</span>
                </div>
                <span className="text-xl font-black font-mono text-amber-400">
                  {formatCurrency(activeBill.totalAmount)}
                </span>
              </div>
              {activeBill.totalAmount > 0 && (
                <button
                  type="button"
                  disabled={isSepayLoading}
                  onClick={() =>
                    handlePaySepay(
                      activeBill.totalAmount,
                      activeBill.orderNumber || "BILL",
                      `Thanh toan hoa don - Ban ${tableInfo?.tableNumber ?? ""}`
                    )
                  }
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-extrabold text-xs text-white bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-500 disabled:opacity-60 shadow-lg shadow-orange-950/40 transition-all cursor-pointer"
                >
                  {isSepayLoading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <QrCode size={16} />
                  )}
                  <span>
                    {isSepayLoading
                      ? "Đang chuyển tới SePay..."
                      : "Thanh toán hóa đơn qua SePay (VietQR / Thẻ)"}
                  </span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setBillDrawerOpen(false)}
                className="w-full py-2.5 rounded-xl bg-[#202636] hover:bg-[#2b3346] text-white text-xs font-bold transition-colors cursor-pointer"
              >
                Đóng &amp; Tiếp tục gọi món
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
