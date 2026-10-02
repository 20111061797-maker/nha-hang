using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RestaurantManagement.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddModifierComboPricingManagement : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "ix_product_modifier_options_product_id",
                schema: "public",
                table: "product_modifier_options");

            migrationBuilder.DropIndex(
                name: "ix_modifiers_modifier_group_id",
                schema: "public",
                table: "modifiers");

            migrationBuilder.DropIndex(
                name: "ix_combo_items_combo_id",
                schema: "public",
                table: "combo_items");

            migrationBuilder.AddColumn<string>(
                name: "description",
                schema: "public",
                table: "modifiers",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "display_order",
                schema: "public",
                table: "modifiers",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "description",
                schema: "public",
                table: "modifier_groups",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "display_order",
                schema: "public",
                table: "modifier_groups",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "selection_type",
                schema: "public",
                table: "modifier_groups",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "description",
                schema: "public",
                table: "combos",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "display_order",
                schema: "public",
                table: "combos",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "display_order",
                schema: "public",
                table: "combo_items",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateIndex(
                name: "ix_product_modifier_options_product_id_modifier_id",
                schema: "public",
                table: "product_modifier_options",
                columns: new[] { "product_id", "modifier_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_product_modifier_groups_product_id",
                schema: "public",
                table: "product_modifier_groups",
                column: "product_id");

            migrationBuilder.CreateIndex(
                name: "ix_modifiers_modifier_group_id_is_active_display_order",
                schema: "public",
                table: "modifiers",
                columns: new[] { "modifier_group_id", "is_active", "display_order" });

            migrationBuilder.AddCheckConstraint(
                name: "ck_modifiers_default_price_non_negative",
                schema: "public",
                table: "modifiers",
                sql: "default_price >= 0");

            migrationBuilder.CreateIndex(
                name: "ix_modifier_groups_is_active_display_order",
                schema: "public",
                table: "modifier_groups",
                columns: new[] { "is_active", "display_order" });

            migrationBuilder.AddCheckConstraint(
                name: "ck_modifier_groups_selection_range",
                schema: "public",
                table: "modifier_groups",
                sql: "minimum_selections >= 0 AND maximum_selections >= minimum_selections");

            migrationBuilder.CreateIndex(
                name: "ix_combos_code",
                schema: "public",
                table: "combos",
                column: "code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_combos_is_active_display_order",
                schema: "public",
                table: "combos",
                columns: new[] { "is_active", "display_order" });

            migrationBuilder.AddCheckConstraint(
                name: "ck_combos_default_price_non_negative",
                schema: "public",
                table: "combos",
                sql: "default_price >= 0");

            migrationBuilder.CreateIndex(
                name: "ix_combo_items_combo_id_display_order",
                schema: "public",
                table: "combo_items",
                columns: new[] { "combo_id", "display_order" });

            migrationBuilder.CreateIndex(
                name: "ix_combo_items_combo_id_product_id_product_variant_id",
                schema: "public",
                table: "combo_items",
                columns: new[] { "combo_id", "product_id", "product_variant_id" },
                unique: true);

            migrationBuilder.AddCheckConstraint(
                name: "ck_combo_items_quantity_positive",
                schema: "public",
                table: "combo_items",
                sql: "quantity > 0");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "ix_product_modifier_options_product_id_modifier_id",
                schema: "public",
                table: "product_modifier_options");

            migrationBuilder.DropIndex(
                name: "ix_product_modifier_groups_product_id",
                schema: "public",
                table: "product_modifier_groups");

            migrationBuilder.DropIndex(
                name: "ix_modifiers_modifier_group_id_is_active_display_order",
                schema: "public",
                table: "modifiers");

            migrationBuilder.DropCheckConstraint(
                name: "ck_modifiers_default_price_non_negative",
                schema: "public",
                table: "modifiers");

            migrationBuilder.DropIndex(
                name: "ix_modifier_groups_is_active_display_order",
                schema: "public",
                table: "modifier_groups");

            migrationBuilder.DropCheckConstraint(
                name: "ck_modifier_groups_selection_range",
                schema: "public",
                table: "modifier_groups");

            migrationBuilder.DropIndex(
                name: "ix_combos_code",
                schema: "public",
                table: "combos");

            migrationBuilder.DropIndex(
                name: "ix_combos_is_active_display_order",
                schema: "public",
                table: "combos");

            migrationBuilder.DropCheckConstraint(
                name: "ck_combos_default_price_non_negative",
                schema: "public",
                table: "combos");

            migrationBuilder.DropIndex(
                name: "ix_combo_items_combo_id_display_order",
                schema: "public",
                table: "combo_items");

            migrationBuilder.DropIndex(
                name: "ix_combo_items_combo_id_product_id_product_variant_id",
                schema: "public",
                table: "combo_items");

            migrationBuilder.DropCheckConstraint(
                name: "ck_combo_items_quantity_positive",
                schema: "public",
                table: "combo_items");

            migrationBuilder.DropColumn(
                name: "description",
                schema: "public",
                table: "modifiers");

            migrationBuilder.DropColumn(
                name: "display_order",
                schema: "public",
                table: "modifiers");

            migrationBuilder.DropColumn(
                name: "description",
                schema: "public",
                table: "modifier_groups");

            migrationBuilder.DropColumn(
                name: "display_order",
                schema: "public",
                table: "modifier_groups");

            migrationBuilder.DropColumn(
                name: "selection_type",
                schema: "public",
                table: "modifier_groups");

            migrationBuilder.DropColumn(
                name: "description",
                schema: "public",
                table: "combos");

            migrationBuilder.DropColumn(
                name: "display_order",
                schema: "public",
                table: "combos");

            migrationBuilder.DropColumn(
                name: "display_order",
                schema: "public",
                table: "combo_items");

            migrationBuilder.CreateIndex(
                name: "ix_product_modifier_options_product_id",
                schema: "public",
                table: "product_modifier_options",
                column: "product_id");

            migrationBuilder.CreateIndex(
                name: "ix_modifiers_modifier_group_id",
                schema: "public",
                table: "modifiers",
                column: "modifier_group_id");

            migrationBuilder.CreateIndex(
                name: "ix_combo_items_combo_id",
                schema: "public",
                table: "combo_items",
                column: "combo_id");
        }
    }
}
