"use client";

import Image from "next/image";

export function BeerSpinner({
  size = 56,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <div
      className={`beer-spinner-container ${className}`}
      style={{ width: size, height: size }}
      role="status"
      aria-label="Đang tải..."
    >
      <div className="beer-spinner-glow" />
      <div className="beer-spinner-orbital" />
      <div className="beer-spinner-mug">
        <Image
          src="/images/beer-mug.png"
          alt="Cốc bia đang tải"
          width={size}
          height={size}
          priority
          className="beer-spinner-img"
        />
      </div>
    </div>
  );
}

export function LoadingState({
  label = "Đang tải dữ liệu...",
  fullscreen = false,
}: {
  label?: string;
  fullscreen?: boolean;
}) {
  return (
    <div className={`beer-loading-screen ${fullscreen ? "beer-loading-fullscreen" : ""}`}>
      <BeerSpinner size={68} />
      <div className="beer-loading-label">
        <span className="beer-loading-text">{label}</span>
        <div className="beer-loading-dots">
          <span />
          <span />
          <span />
        </div>
      </div>
    </div>
  );
}

export function ErrorState({
  message = "Không thể tải dữ liệu.",
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="beer-error-panel">
      <div className="text-3xl mb-2">⚠️</div>
      <strong className="text-sm text-white font-bold">Đã có lỗi xảy ra</strong>
      <span className="text-xs text-gray-400 max-w-sm text-center">{message}</span>
      {onRetry ? (
        <button type="button" className="primary-button text-xs mt-3 px-4 py-1.5" onClick={onRetry}>
          Thử lại
        </button>
      ) : null}
    </div>
  );
}

export function EmptyState({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="beer-empty-panel">
      <div className="text-3xl mb-2">📋</div>
      <strong className="text-sm text-white font-bold">{title}</strong>
      <span className="text-xs text-gray-400 max-w-sm text-center">{detail}</span>
    </div>
  );
}