using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RestaurantManagement.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddCategoryProductMenuManagement : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "ix_product_categories_category_id",
                schema: "public",
                table: "product_categories");

            migrationBuilder.AddColumn<int>(
                name: "display_order",
                schema: "public",
                table: "products",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "short_description",
                schema: "public",
                table: "products",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "alt_text",
                schema: "public",
                table: "product_images",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "is_active",
                schema: "public",
                table: "product_images",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "is_primary",
                schema: "public",
                table: "product_images",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "description",
                schema: "public",
                table: "categories",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "is_active",
                schema: "public",
                table: "branch_products",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateIndex(
                name: "ix_products_is_active",
                schema: "public",
                table: "products",
                column: "is_active");

            migrationBuilder.CreateIndex(
                name: "ix_product_variants_product_id_is_active",
                schema: "public",
                table: "product_variants",
                columns: new[] { "product_id", "is_active" });

            migrationBuilder.CreateIndex(
                name: "ix_product_variants_sku",
                schema: "public",
                table: "product_variants",
                column: "sku",
                unique: true);

            migrationBuilder.AddCheckConstraint(
                name: "ck_product_variants_default_price_non_negative",
                schema: "public",
                table: "product_variants",
                sql: "default_price IS NULL OR default_price >= 0");

            migrationBuilder.CreateIndex(
                name: "ix_product_categories_category_id_product_id",
                schema: "public",
                table: "product_categories",
                columns: new[] { "category_id", "product_id" });

            migrationBuilder.CreateIndex(
                name: "ix_categories_is_active_display_order",
                schema: "public",
                table: "categories",
                columns: new[] { "is_active", "display_order" });

            migrationBuilder.CreateIndex(
                name: "ix_branch_products_branch_id_is_active",
                schema: "public",
                table: "branch_products",
                columns: new[] { "branch_id", "is_active" });

            migrationBuilder.CreateIndex(
                name: "ix_branch_products_is_available",
                schema: "public",
                table: "branch_products",
                column: "is_available");

            migrationBuilder.AddCheckConstraint(
                name: "ck_branch_products_price_non_negative",
                schema: "public",
                table: "branch_products",
                sql: "price_override IS NULL OR price_override >= 0");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "ix_products_is_active",
                schema: "public",
                table: "products");

            migrationBuilder.DropIndex(
                name: "ix_product_variants_product_id_is_active",
                schema: "public",
                table: "product_variants");

            migrationBuilder.DropIndex(
                name: "ix_product_variants_sku",
                schema: "public",
                table: "product_variants");

            migrationBuilder.DropCheckConstraint(
                name: "ck_product_variants_default_price_non_negative",
                schema: "public",
                table: "product_variants");

            migrationBuilder.DropIndex(
                name: "ix_product_categories_category_id_product_id",
                schema: "public",
                table: "product_categories");

            migrationBuilder.DropIndex(
                name: "ix_categories_is_active_display_order",
                schema: "public",
                table: "categories");

            migrationBuilder.DropIndex(
                name: "ix_branch_products_branch_id_is_active",
                schema: "public",
                table: "branch_products");

            migrationBuilder.DropIndex(
                name: "ix_branch_products_is_available",
                schema: "public",
                table: "branch_products");

            migrationBuilder.DropCheckConstraint(
                name: "ck_branch_products_price_non_negative",
                schema: "public",
                table: "branch_products");

            migrationBuilder.DropColumn(
                name: "display_order",
                schema: "public",
                table: "products");

            migrationBuilder.DropColumn(
                name: "short_description",
                schema: "public",
                table: "products");

            migrationBuilder.DropColumn(
                name: "alt_text",
                schema: "public",
                table: "product_images");

            migrationBuilder.DropColumn(
                name: "is_active",
                schema: "public",
                table: "product_images");

            migrationBuilder.DropColumn(
                name: "is_primary",
                schema: "public",
                table: "product_images");

            migrationBuilder.DropColumn(
                name: "description",
                schema: "public",
                table: "categories");

            migrationBuilder.DropColumn(
                name: "is_active",
                schema: "public",
                table: "branch_products");

            migrationBuilder.CreateIndex(
                name: "ix_product_categories_category_id",
                schema: "public",
                table: "product_categories",
                column: "category_id");
        }
    }
}
