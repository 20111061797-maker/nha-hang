using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RestaurantManagement.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddBranchAreaTableManagement : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "ix_table_status_histories_table_id",
                schema: "public",
                table: "table_status_histories");

            migrationBuilder.DropIndex(
                name: "ix_dining_tables_area_id",
                schema: "public",
                table: "dining_tables");

            migrationBuilder.RenameColumn(
                name: "status",
                schema: "public",
                table: "table_status_histories",
                newName: "old_status");

            migrationBuilder.AddColumn<string>(
                name: "new_status",
                schema: "public",
                table: "table_status_histories",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "reason",
                schema: "public",
                table: "table_status_histories",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "display_order",
                schema: "public",
                table: "dining_tables",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "description",
                schema: "public",
                table: "branches",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "email",
                schema: "public",
                table: "branches",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "description",
                schema: "public",
                table: "areas",
                type: "text",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "user_branch_accesses",
                schema: "public",
                columns: table => new
                {
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    branch_id = table.Column<Guid>(type: "uuid", nullable: false),
                    is_active = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_user_branch_accesses", x => new { x.user_id, x.branch_id });
                    table.ForeignKey(
                        name: "fk_user_branch_accesses_branches_branch_id",
                        column: x => x.branch_id,
                        principalSchema: "public",
                        principalTable: "branches",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_user_branch_accesses_users_user_id",
                        column: x => x.user_id,
                        principalSchema: "public",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_table_status_histories_table_id_created_at",
                schema: "public",
                table: "table_status_histories",
                columns: new[] { "table_id", "created_at" });

            migrationBuilder.CreateIndex(
                name: "ix_dining_tables_area_id_is_active",
                schema: "public",
                table: "dining_tables",
                columns: new[] { "area_id", "is_active" });

            migrationBuilder.CreateIndex(
                name: "ix_dining_tables_branch_id_is_active",
                schema: "public",
                table: "dining_tables",
                columns: new[] { "branch_id", "is_active" });

            migrationBuilder.CreateIndex(
                name: "ix_dining_tables_qr_code_identifier",
                schema: "public",
                table: "dining_tables",
                column: "qr_code_identifier",
                unique: true);

            migrationBuilder.AddCheckConstraint(
                name: "ck_branches_code_not_empty",
                schema: "public",
                table: "branches",
                sql: "length(trim(code)) > 0");

            migrationBuilder.CreateIndex(
                name: "ix_areas_branch_id_is_active",
                schema: "public",
                table: "areas",
                columns: new[] { "branch_id", "is_active" });

            migrationBuilder.AddCheckConstraint(
                name: "ck_areas_name_not_empty",
                schema: "public",
                table: "areas",
                sql: "length(trim(name)) > 0");

            migrationBuilder.CreateIndex(
                name: "ix_user_branch_accesses_branch_id",
                schema: "public",
                table: "user_branch_accesses",
                column: "branch_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "user_branch_accesses",
                schema: "public");

            migrationBuilder.DropIndex(
                name: "ix_table_status_histories_table_id_created_at",
                schema: "public",
                table: "table_status_histories");

            migrationBuilder.DropIndex(
                name: "ix_dining_tables_area_id_is_active",
                schema: "public",
                table: "dining_tables");

            migrationBuilder.DropIndex(
                name: "ix_dining_tables_branch_id_is_active",
                schema: "public",
                table: "dining_tables");

            migrationBuilder.DropIndex(
                name: "ix_dining_tables_qr_code_identifier",
                schema: "public",
                table: "dining_tables");

            migrationBuilder.DropCheckConstraint(
                name: "ck_branches_code_not_empty",
                schema: "public",
                table: "branches");

            migrationBuilder.DropIndex(
                name: "ix_areas_branch_id_is_active",
                schema: "public",
                table: "areas");

            migrationBuilder.DropCheckConstraint(
                name: "ck_areas_name_not_empty",
                schema: "public",
                table: "areas");

            migrationBuilder.DropColumn(
                name: "new_status",
                schema: "public",
                table: "table_status_histories");

            migrationBuilder.DropColumn(
                name: "reason",
                schema: "public",
                table: "table_status_histories");

            migrationBuilder.DropColumn(
                name: "display_order",
                schema: "public",
                table: "dining_tables");

            migrationBuilder.DropColumn(
                name: "description",
                schema: "public",
                table: "branches");

            migrationBuilder.DropColumn(
                name: "email",
                schema: "public",
                table: "branches");

            migrationBuilder.DropColumn(
                name: "description",
                schema: "public",
                table: "areas");

            migrationBuilder.RenameColumn(
                name: "old_status",
                schema: "public",
                table: "table_status_histories",
                newName: "status");

            migrationBuilder.CreateIndex(
                name: "ix_table_status_histories_table_id",
                schema: "public",
                table: "table_status_histories",
                column: "table_id");

            migrationBuilder.CreateIndex(
                name: "ix_dining_tables_area_id",
                schema: "public",
                table: "dining_tables",
                column: "area_id");
        }
    }
}
