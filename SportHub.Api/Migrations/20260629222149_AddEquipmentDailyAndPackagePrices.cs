using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SportHub.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddEquipmentDailyAndPackagePrices : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "RentalPrice",
                table: "Equipment",
                newName: "PackageHourlyPrice");

            migrationBuilder.AddColumn<decimal>(
                name: "DailyRentalPrice",
                table: "Equipment",
                type: "decimal(65,30)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.UpdateData(
                table: "Equipment",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "DailyRentalPrice", "PackageHourlyPrice" },
                values: new object[] { 30m, 10m });

            migrationBuilder.UpdateData(
                table: "Equipment",
                keyColumn: "Id",
                keyValue: 2,
                columns: new[] { "DailyRentalPrice", "PackageHourlyPrice" },
                values: new object[] { 50m, 15m });

            migrationBuilder.UpdateData(
                table: "Equipment",
                keyColumn: "Id",
                keyValue: 3,
                columns: new[] { "DailyRentalPrice", "PackageHourlyPrice" },
                values: new object[] { 70m, 20m });

            migrationBuilder.UpdateData(
                table: "Equipment",
                keyColumn: "Id",
                keyValue: 4,
                columns: new[] { "DailyRentalPrice", "PackageHourlyPrice", "Quantity" },
                values: new object[] { 35m, 10m, 0 });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DailyRentalPrice",
                table: "Equipment");

            migrationBuilder.RenameColumn(
                name: "PackageHourlyPrice",
                table: "Equipment",
                newName: "RentalPrice");

            migrationBuilder.UpdateData(
                table: "Equipment",
                keyColumn: "Id",
                keyValue: 1,
                column: "RentalPrice",
                value: 30m);

            migrationBuilder.UpdateData(
                table: "Equipment",
                keyColumn: "Id",
                keyValue: 2,
                column: "RentalPrice",
                value: 50m);

            migrationBuilder.UpdateData(
                table: "Equipment",
                keyColumn: "Id",
                keyValue: 3,
                column: "RentalPrice",
                value: 70m);

            migrationBuilder.UpdateData(
                table: "Equipment",
                keyColumn: "Id",
                keyValue: 4,
                columns: new[] { "Quantity", "RentalPrice" },
                values: new object[] { 15, 35m });
        }
    }
}
