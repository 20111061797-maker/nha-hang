using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RestaurantManagement.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddPaymentManagement : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "branch_id",
                schema: "public",
                table: "payments",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddColumn<decimal>(
                name: "change_amount",
                schema: "public",
                table: "payments",
                type: "numeric(19,4)",
                precision: 19,
                scale: 4,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "currency_code",
                schema: "public",
                table: "payments",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "idempotency_key",
                schema: "public",
                table: "payments",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "note",
                schema: "public",
                table: "payments",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "payment_date",
                schema: "public",
                table: "payments",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTimeOffset(new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)));

            migrationBuilder.AddColumn<string>(
                name: "payment_number",
                schema: "public",
                table: "payments",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "provider",
                schema: "public",
                table: "payments",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "provider_transaction_id",
                schema: "public",
                table: "payments",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "tendered_amount",
                schema: "public",
                table: "payments",
                type: "numeric(19,4)",
                precision: 19,
                scale: 4,
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "version",
                schema: "public",
                table: "payments",
                type: "bigint",
                nullable: false,
                defaultValue: 0L);

            migrationBuilder.Sql("UPDATE public.payments AS p SET branch_id = o.branch_id, currency_code = COALESCE(NULLIF(o.currency_code, ''), 'VND'), payment_date = p.created_at, payment_number = 'PAY-LEGACY-' || replace(p.id::text, '-', '') FROM public.orders AS o WHERE o.id = p.order_id;");

            migrationBuilder.AlterColumn<string>(
                name: "reference_type",
                schema: "public",
                table: "inventory_transactions",
                type: "text",
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "text",
                oldNullable: true);

            migrationBuilder.CreateTable(
                name: "payment_refunds",
                schema: "public",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    payment_id = table.Column<Guid>(type: "uuid", nullable: false),
                    amount = table.Column<decimal>(type: "numeric(19,4)", precision: 19, scale: 4, nullable: false),
                    reason = table.Column<string>(type: "text", nullable: false),
                    status = table.Column<string>(type: "text", nullable: false),
                    refund_reference = table.Column<string>(type: "text", nullable: true),
                    provider_refund_id = table.Column<string>(type: "text", nullable: true),
                    created_by = table.Column<Guid>(type: "uuid", nullable: true),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_payment_refunds", x => x.id);
                    table.CheckConstraint("ck_payment_refunds_amount_positive", "amount > 0");
                    table.ForeignKey(
                        name: "fk_payment_refunds_payments_payment_id",
                        column: x => x.payment_id,
                        principalSchema: "public",
                        principalTable: "payments",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "ix_payments_branch_id_payment_date",
                schema: "public",
                table: "payments",
                columns: new[] { "branch_id", "payment_date" });

            migrationBuilder.CreateIndex(
                name: "ix_payments_order_id_idempotency_key",
                schema: "public",
                table: "payments",
                columns: new[] { "order_id", "idempotency_key" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_payments_payment_number",
                schema: "public",
                table: "payments",
                column: "payment_number",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_payments_provider_transaction_id",
                schema: "public",
                table: "payments",
                column: "provider_transaction_id");

            migrationBuilder.CreateIndex(
                name: "ix_payments_transaction_reference",
                schema: "public",
                table: "payments",
                column: "transaction_reference");

            migrationBuilder.CreateIndex(
                name: "ix_payment_refunds_payment_id_created_at",
                schema: "public",
                table: "payment_refunds",
                columns: new[] { "payment_id", "created_at" });

            migrationBuilder.AddForeignKey(
                name: "fk_payments_branches_branch_id",
                schema: "public",
                table: "payments",
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
                name: "fk_payments_branches_branch_id",
                schema: "public",
                table: "payments");

            migrationBuilder.DropTable(
                name: "payment_refunds",
                schema: "public");

            migrationBuilder.DropIndex(
                name: "ix_payments_branch_id_payment_date",
                schema: "public",
                table: "payments");

            migrationBuilder.DropIndex(
                name: "ix_payments_order_id_idempotency_key",
                schema: "public",
                table: "payments");

            migrationBuilder.DropIndex(
                name: "ix_payments_payment_number",
                schema: "public",
                table: "payments");

            migrationBuilder.DropIndex(
                name: "ix_payments_provider_transaction_id",
                schema: "public",
                table: "payments");

            migrationBuilder.DropIndex(
                name: "ix_payments_transaction_reference",
                schema: "public",
                table: "payments");

            migrationBuilder.DropColumn(
                name: "branch_id",
                schema: "public",
                table: "payments");

            migrationBuilder.DropColumn(
                name: "change_amount",
                schema: "public",
                table: "payments");

            migrationBuilder.DropColumn(
                name: "currency_code",
                schema: "public",
                table: "payments");

            migrationBuilder.DropColumn(
                name: "idempotency_key",
                schema: "public",
                table: "payments");

            migrationBuilder.DropColumn(
                name: "note",
                schema: "public",
                table: "payments");

            migrationBuilder.DropColumn(
                name: "payment_date",
                schema: "public",
                table: "payments");

            migrationBuilder.DropColumn(
                name: "payment_number",
                schema: "public",
                table: "payments");

            migrationBuilder.DropColumn(
                name: "provider",
                schema: "public",
                table: "payments");

            migrationBuilder.DropColumn(
                name: "provider_transaction_id",
                schema: "public",
                table: "payments");

            migrationBuilder.DropColumn(
                name: "tendered_amount",
                schema: "public",
                table: "payments");

            migrationBuilder.DropColumn(
                name: "version",
                schema: "public",
                table: "payments");

            migrationBuilder.AlterColumn<string>(
                name: "reference_type",
                schema: "public",
                table: "inventory_transactions",
                type: "text",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "text");
        }
    }
}
