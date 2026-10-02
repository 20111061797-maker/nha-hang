using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RestaurantManagement.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddOrderPosManagement : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "ix_order_status_histories_order_id",
                schema: "public",
                table: "order_status_histories");

            migrationBuilder.DropCheckConstraint(
                name: "ck_order_items_quantity_positive",
                schema: "public",
                table: "order_items");

            migrationBuilder.RenameColumn(
                name: "status",
                schema: "public",
                table: "order_status_histories",
                newName: "old_status");

            migrationBuilder.AddColumn<Guid>(
                name: "created_by",
                schema: "public",
                table: "orders",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "delivery_address_snapshot",
                schema: "public",
                table: "orders",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "dining_table_id",
                schema: "public",
                table: "orders",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "order_number",
                schema: "public",
                table: "orders",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<long>(
                name: "version",
                schema: "public",
                table: "orders",
                type: "bigint",
                nullable: false,
                defaultValue: 0L);

            migrationBuilder.AddColumn<string>(
                name: "new_status",
                schema: "public",
                table: "order_status_histories",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<Guid>(
                name: "combo_id",
                schema: "public",
                table: "order_items",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "combo_name_snapshot",
                schema: "public",
                table: "order_items",
                type: "text",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "ix_orders_dining_table_id_status",
                schema: "public",
                table: "orders",
                columns: new[] { "dining_table_id", "status" });

            migrationBuilder.CreateIndex(
                name: "ix_orders_order_number",
                schema: "public",
                table: "orders",
                column: "order_number",
                unique: true);

            migrationBuilder.AddCheckConstraint(
                name: "ck_orders_amounts_non_negative",
                schema: "public",
                table: "orders",
                sql: "subtotal >= 0 AND discount_amount >= 0 AND tax_amount >= 0 AND total_amount >= 0");

            migrationBuilder.CreateIndex(
                name: "ix_order_status_histories_order_id_created_at",
                schema: "public",
                table: "order_status_histories",
                columns: new[] { "order_id", "created_at" });

            migrationBuilder.CreateIndex(
                name: "ix_order_items_combo_id",
                schema: "public",
                table: "order_items",
                column: "combo_id");

            migrationBuilder.AddCheckConstraint(
                name: "ck_order_items_line_values_valid",
                schema: "public",
                table: "order_items",
                sql: "quantity > 0 AND unit_price >= 0 AND line_total >= 0");

            migrationBuilder.AddCheckConstraint(
                name: "ck_order_item_modifiers_values_valid",
                schema: "public",
                table: "order_item_modifiers",
                sql: "quantity > 0 AND unit_price >= 0 AND total_price >= 0");

            migrationBuilder.AddForeignKey(
                name: "fk_order_items_combos_combo_id",
                schema: "public",
                table: "order_items",
                column: "combo_id",
                principalSchema: "public",
                principalTable: "combos",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "fk_orders_dining_tables_dining_table_id",
                schema: "public",
                table: "orders",
                column: "dining_table_id",
                principalSchema: "public",
                principalTable: "dining_tables",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "fk_order_items_combos_combo_id",
                schema: "public",
                table: "order_items");

            migrationBuilder.DropForeignKey(
                name: "fk_orders_dining_tables_dining_table_id",
                schema: "public",
                table: "orders");

            migrationBuilder.DropIndex(
                name: "ix_orders_dining_table_id_status",
                schema: "public",
                table: "orders");

            migrationBuilder.DropIndex(
                name: "ix_orders_order_number",
                schema: "public",
                table: "orders");

            migrationBuilder.DropCheckConstraint(
                name: "ck_orders_amounts_non_negative",
                schema: "public",
                table: "orders");

            migrationBuilder.DropIndex(
                name: "ix_order_status_histories_order_id_created_at",
                schema: "public",
                table: "order_status_histories");

            migrationBuilder.DropIndex(
                name: "ix_order_items_combo_id",
                schema: "public",
                table: "order_items");

            migrationBuilder.DropCheckConstraint(
                name: "ck_order_items_line_values_valid",
                schema: "public",
                table: "order_items");

            migrationBuilder.DropCheckConstraint(
                name: "ck_order_item_modifiers_values_valid",
                schema: "public",
                table: "order_item_modifiers");

            migrationBuilder.DropColumn(
                name: "created_by",
                schema: "public",
                table: "orders");

            migrationBuilder.DropColumn(
                name: "delivery_address_snapshot",
                schema: "public",
                table: "orders");

            migrationBuilder.DropColumn(
                name: "dining_table_id",
                schema: "public",
                table: "orders");

            migrationBuilder.DropColumn(
                name: "order_number",
                schema: "public",
                table: "orders");

            migrationBuilder.DropColumn(
                name: "version",
                schema: "public",
                table: "orders");

            migrationBuilder.DropColumn(
                name: "new_status",
                schema: "public",
                table: "order_status_histories");

            migrationBuilder.DropColumn(
                name: "combo_id",
                schema: "public",
                table: "order_items");

            migrationBuilder.DropColumn(
                name: "combo_name_snapshot",
                schema: "public",
                table: "order_items");

            migrationBuilder.RenameColumn(
                name: "old_status",
                schema: "public",
                table: "order_status_histories",
                newName: "status");

            migrationBuilder.CreateIndex(
                name: "ix_order_status_histories_order_id",
                schema: "public",
                table: "order_status_histories",
                column: "order_id");

            migrationBuilder.AddCheckConstraint(
                name: "ck_order_items_quantity_positive",
                schema: "public",
                table: "order_items",
                sql: "quantity > 0");
        }
    }
}
