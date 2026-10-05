"use client";

import { useMemo, useState } from "react";
import {
  TableStatus,
  type DiningArea,
  type DiningTable,
} from "@/types/pos";
import { Users, Plus, ShoppingBag, UtensilsCrossed } from "lucide-react";

type Props = {
  areas: DiningArea[];
  tables: DiningTable[];
  onSelectTable: (table: DiningTable) => void;
  onCreateTakeaway: () => void;
};

export function TableFloorPlan({
  areas,
  tables,
  onSelectTable,
  onCreateTakeaway,
}: Props) {
  const [selectedAreaId, setSelectedAreaId] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filteredTables = useMemo(() => {
    return tables.filter((table) => {
      if (selectedAreaId !== "all" && table.areaId !== selectedAreaId) return false;
      if (statusFilter !== "all") {
        if (statusFilter === "available" && table.status !== TableStatus.Available) return false;
        if (statusFilter === "occupied" && table.status !== TableStatus.Occupied) return false;
        if (statusFilter === "reserved" && table.status !== TableStatus.Reserved) return false;
      }
      return true;
    });
  }, [tables, selectedAreaId, statusFilter]);

  const stats = useMemo(() => {
    const total = tables.length;
    const available = tables.filter((t) => t.status === TableStatus.Available).length;
    const occupied = tables.filter((t) => t.status === TableStatus.Occupied).length;
    const reserved = tables.filter((t) => t.status === TableStatus.Reserved).length;
    return { total, available, occupied, reserved };
  }, [tables]);

  const getTableStatusInfo = (status: TableStatus) => {
    switch (status) {
      case TableStatus.Available:
        return { label: "Trống", badgeClass: "pos-table-available", textClass: "text-green" };
      case TableStatus.Occupied:
        return { label: "Có khách", badgeClass: "pos-table-occupied", textClass: "text-amber" };
      case TableStatus.Reserved:
        return { label: "Đã đặt", badgeClass: "pos-table-reserved", textClass: "text-purple" };
      case TableStatus.Cleaning:
        return { label: "Đang dọn", badgeClass: "pos-table-cleaning", textClass: "text-blue" };
      case TableStatus.OutOfService:
        return { label: "Bảo trì", badgeClass: "pos-table-out", textClass: "text-muted" };
      default:
        return { label: "Không xác định", badgeClass: "", textClass: "" };
    }
  };

  const getAreaName = (areaId: string) => {
    const a = areas.find((x) => x.id === areaId);
    return a ? a.name : "";
  };

  return (
    <div className="pos-floor-plan">
      {/* Top action & stat bar */}
      <div className="pos-floor-header">
        <div className="pos-floor-stats">
          <div className="pos-stat-pill">
            <span>Tổng số bàn:</span> <strong>{stats.total}</strong>
          </div>
          <div className="pos-stat-pill stat-avail">
            <span>Trống:</span> <strong>{stats.available}</strong>
          </div>
          <div className="pos-stat-pill stat-occ">
            <span>Có khách:</span> <strong>{stats.occupied}</strong>
          </div>
          {stats.reserved > 0 && (
            <div className="pos-stat-pill stat-res">
              <span>Đã đặt:</span> <strong>{stats.reserved}</strong>
            </div>
          )}
        </div>

        <div className="pos-floor-actions">
          <button
            type="button"
            className="primary-button pos-takeaway-btn"
            onClick={onCreateTakeaway}
          >
            <ShoppingBag size={17} />
            Tạo đơn Mang về
          </button>
        </div>
      </div>

      {/* Filter bars */}
      <div className="pos-floor-filters">
        {/* Areas tabs */}
        <div className="pos-filter-group">
          <button
            type="button"
            className={`pos-pill-tab ${selectedAreaId === "all" ? "pos-pill-active" : ""}`}
            onClick={() => setSelectedAreaId("all")}
          >
            Tất cả khu vực
          </button>
          {areas.map((area) => (
            <button
              key={area.id}
              type="button"
              className={`pos-pill-tab ${selectedAreaId === area.id ? "pos-pill-active" : ""}`}
              onClick={() => setSelectedAreaId(area.id)}
            >
              {area.name}
            </button>
          ))}
        </div>

        {/* Status filter tabs */}
        <div className="pos-filter-group">
          <button
            type="button"
            className={`pos-pill-filter ${statusFilter === "all" ? "pos-filter-active" : ""}`}
            onClick={() => setStatusFilter("all")}
          >
            Tất cả
          </button>
          <button
            type="button"
            className={`pos-pill-filter ${statusFilter === "available" ? "pos-filter-active" : ""}`}
            onClick={() => setStatusFilter("available")}
          >
            Bàn trống ({stats.available})
          </button>
          <button
            type="button"
            className={`pos-pill-filter ${statusFilter === "occupied" ? "pos-filter-active" : ""}`}
            onClick={() => setStatusFilter("occupied")}
          >
            Có khách ({stats.occupied})
          </button>
        </div>
      </div>

      {/* Tables Grid */}
      <div className="pos-tables-grid">
        {filteredTables.length === 0 ? (
          <div className="pos-empty-tables">
            <UtensilsCrossed size={36} className="muted-icon" />
            <p>Không có bàn nào phù hợp với bộ lọc hiện tại.</p>
          </div>
        ) : (
          filteredTables.map((table) => {
            const statusInfo = getTableStatusInfo(table.status);
            const isOccupied = table.status === TableStatus.Occupied;

            return (
              <div
                key={table.id}
                className={`pos-table-card ${statusInfo.badgeClass}`}
                onClick={() => onSelectTable(table)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") onSelectTable(table);
                }}
              >
                <div className="pos-table-card-top">
                  <span className="pos-table-area-tag">{getAreaName(table.areaId)}</span>
                  <span className={`pos-table-status-pill ${statusInfo.textClass}`}>
                    <span className="pos-table-dot" />
                    {statusInfo.label}
                  </span>
                </div>

                <div className="pos-table-card-body">
                  <div className="pos-table-number">{table.tableNumber}</div>
                  <div className="pos-table-capacity">
                    <Users size={14} />
                    <span>{table.capacity} chỗ</span>
                  </div>
                </div>

                <div className="pos-table-card-footer">
                  {isOccupied ? (
                    <div className="pos-table-action-hint occupied-hint">
                      <span>Đang phục vụ</span>
                      <small>Nhấp xem đơn →</small>
                    </div>
                  ) : (
                    <div className="pos-table-action-hint available-hint">
                      <Plus size={14} />
                      <span>Mở bàn mới</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
