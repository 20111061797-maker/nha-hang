using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RestaurantManagement.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddKitchenManagementAndKds : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "ix_kitchen_stations_branch_id",
                schema: "public",
                table: "kitchen_stations");

            migrationBuilder.DropIndex(
                name: "ix_kitchen_orders_order_id",
                schema: "public",
                table: "kitchen_orders");

            migrationBuilder.DropIndex(
                name: "ix_kitchen_order_items_kitchen_order_id",
                schema: "public",
                table: "kitchen_order_items");

            migrationBuilder.AddColumn<string>(
                name: "code",
                schema: "public",
                table: "kitchen_stations",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "description",
                schema: "public",
                table: "kitchen_stations",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "display_order",
                schema: "public",
                table: "kitchen_stations",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "accepted_at",
                schema: "public",
                table: "kitchen_orders",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "branch_id",
                schema: "public",
                table: "kitchen_orders",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "cancelled_at",
                schema: "public",
                table: "kitchen_orders",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "completed_at",
                schema: "public",
                table: "kitchen_orders",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "note",
                schema: "public",
                table: "kitchen_orders",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "order_number_snapshot",
                schema: "public",
                table: "kitchen_orders",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "order_type_snapshot",
                schema: "public",
                table: "kitchen_orders",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "priority",
                schema: "public",
                table: "kitchen_orders",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "table_number_snapshot",
                schema: "public",
                table: "kitchen_orders",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "version",
                schema: "public",
                table: "kitchen_orders",
                type: "bigint",
                nullable: false,
                defaultValue: 0L);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "completed_at",
                schema: "public",
                table: "kitchen_order_items",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "modifier_names_snapshot",
                schema: "public",
                table: "kitchen_order_items",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "notes_snapshot",
                schema: "public",
                table: "kitchen_order_items",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "product_id",
                schema: "public",
                table: "kitchen_order_items",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddColumn<string>(
                name: "product_name_snapshot",
                schema: "public",
                table: "kitchen_order_items",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<Guid>(
                name: "product_variant_id",
                schema: "public",
                table: "kitchen_order_items",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "ready_at",
                schema: "public",
                table: "kitchen_order_items",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "started_at",
                schema: "public",
                table: "kitchen_order_items",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "variant_name_snapshot",
                schema: "public",
                table: "kitchen_order_items",
                type: "text",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "kitchen_station_products",
                schema: "public",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    kitchen_station_id = table.Column<Guid>(type: "uuid", nullable: false),
                    product_id = table.Column<Guid>(type: "uuid", nullable: false),
                    display_order = table.Column<int>(type: "integer", nullable: false),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_kitchen_station_products", x => x.id);
                    table.ForeignKey(
                        name: "fk_kitchen_station_products_kitchen_stations_kitchen_station_id",
                        column: x => x.kitchen_station_id,
                        principalSchema: "public",
                        principalTable: "kitchen_stations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_kitchen_station_products_products_product_id",
                        column: x => x.product_id,
                        principalSchema: "public",
                        principalTable: "products",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "ix_kitchen_stations_branch_id_code",
                schema: "public",
                table: "kitchen_stations",
                columns: new[] { "branch_id", "code" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_kitchen_stations_branch_id_is_active_display_order",
                schema: "public",
                table: "kitchen_stations",
                columns: new[] { "branch_id", "is_active", "display_order" });

            migrationBuilder.CreateIndex(
                name: "ix_kitchen_orders_branch_id_status_created_at",
                schema: "public",
                table: "kitchen_orders",
                columns: new[] { "branch_id", "status", "created_at" });

            migrationBuilder.CreateIndex(
                name: "ix_kitchen_orders_order_id_kitchen_station_id",
                schema: "public",
                table: "kitchen_orders",
                columns: new[] { "order_id", "kitchen_station_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_kitchen_order_items_kitchen_order_id_status",
                schema: "public",
                table: "kitchen_order_items",
                columns: new[] { "kitchen_order_id", "status" });

            migrationBuilder.AddCheckConstraint(
                name: "ck_kitchen_order_items_quantity_positive",
                schema: "public",
                table: "kitchen_order_items",
                sql: "quantity > 0");

            migrationBuilder.CreateIndex(
                name: "ix_kitchen_station_products_kitchen_station_id_product_id",
                schema: "public",
                table: "kitchen_station_products",
                columns: new[] { "kitchen_station_id", "product_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_kitchen_station_products_product_id",
                schema: "public",
                table: "kitchen_station_products",
                column: "product_id");

            migrationBuilder.AddForeignKey(
                name: "fk_kitchen_orders_branches_branch_id",
                schema: "public",
                table: "kitchen_orders",
                column: "branch_id",
                principalSchema: "public",
                principalTable: "branches",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "fk_kitchen_orders_branches_branch_id",
                schema: "public",
                table: "kitchen_orders");

            migrationBuilder.DropTable(
                name: "kitchen_station_products",
                schema: "public");

            migrationBuilder.DropIndex(
                name: "ix_kitchen_stations_branch_id_code",
                schema: "public",
                table: "kitchen_stations");

            migrationBuilder.DropIndex(
                name: "ix_kitchen_stations_branch_id_is_active_display_order",
                schema: "public",
                table: "kitchen_stations");

            migrationBuilder.DropIndex(
                name: "ix_kitchen_orders_branch_id_status_created_at",
                schema: "public",
                table: "kitchen_orders");

            migrationBuilder.DropIndex(
                name: "ix_kitchen_orders_order_id_kitchen_station_id",
                schema: "public",
                table: "kitchen_orders");

            migrationBuilder.DropIndex(
                name: "ix_kitchen_order_items_kitchen_order_id_status",
                schema: "public",
                table: "kitchen_order_items");

            migrationBuilder.DropCheckConstraint(
                name: "ck_kitchen_order_items_quantity_positive",
                schema: "public",
                table: "kitchen_order_items");

            migrationBuilder.DropColumn(
                name: "code",
                schema: "public",
                table: "kitchen_stations");

            migrationBuilder.DropColumn(
                name: "description",
                schema: "public",
                table: "kitchen_stations");

            migrationBuilder.DropColumn(
                name: "display_order",
                schema: "public",
                table: "kitchen_stations");

            migrationBuilder.DropColumn(
                name: "accepted_at",
                schema: "public",
                table: "kitchen_orders");

            migrationBuilder.DropColumn(
                name: "branch_id",
                schema: "public",
                table: "kitchen_orders");

            migrationBuilder.DropColumn(
                name: "cancelled_at",
                schema: "public",
                table: "kitchen_orders");

            migrationBuilder.DropColumn(
                name: "completed_at",
                schema: "public",
                table: "kitchen_orders");

            migrationBuilder.DropColumn(
                name: "note",
                schema: "public",
                table: "kitchen_orders");

            migrationBuilder.DropColumn(
                name: "order_number_snapshot",
                schema: "public",
                table: "kitchen_orders");

            migrationBuilder.DropColumn(
                name: "order_type_snapshot",
                schema: "public",
                table: "kitchen_orders");

            migrationBuilder.DropColumn(
                name: "priority",
                schema: "public",
                table: "kitchen_orders");

            migrationBuilder.DropColumn(
                name: "table_number_snapshot",
                schema: "public",
                table: "kitchen_orders");

            migrationBuilder.DropColumn(
                name: "version",
                schema: "public",
                table: "kitchen_orders");

            migrationBuilder.DropColumn(
                name: "completed_at",
                schema: "public",
                table: "kitchen_order_items");

            migrationBuilder.DropColumn(
                name: "modifier_names_snapshot",
                schema: "public",
                table: "kitchen_order_items");

            migrationBuilder.DropColumn(
                name: "notes_snapshot",
                schema: "public",
                table: "kitchen_order_items");

            migrationBuilder.DropColumn(
                name: "product_id",
                schema: "public",
                table: "kitchen_order_items");

            migrationBuilder.DropColumn(
                name: "product_name_snapshot",
                schema: "public",
                table: "kitchen_order_items");

            migrationBuilder.DropColumn(
                name: "product_variant_id",
                schema: "public",
                table: "kitchen_order_items");

            migrationBuilder.DropColumn(
                name: "ready_at",
                schema: "public",
                table: "kitchen_order_items");

            migrationBuilder.DropColumn(
                name: "started_at",
                schema: "public",
                table: "kitchen_order_items");

            migrationBuilder.DropColumn(
                name: "variant_name_snapshot",
                schema: "public",
                table: "kitchen_order_items");

            migrationBuilder.CreateIndex(
                name: "ix_kitchen_stations_branch_id",
                schema: "public",
                table: "kitchen_stations",
                column: "branch_id");

            migrationBuilder.CreateIndex(
                name: "ix_kitchen_orders_order_id",
                schema: "public",
                table: "kitchen_orders",
                column: "order_id");

            migrationBuilder.CreateIndex(
                name: "ix_kitchen_order_items_kitchen_order_id",
                schema: "public",
                table: "kitchen_order_items",
                column: "kitchen_order_id");
        }
    }
}
