using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SportHub.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddHiddenFromCustomerToBookings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "HiddenFromCustomer",
                table: "Bookings",
                type: "tinyint(1)",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "HiddenFromCustomer",
                table: "Bookings");
        }
    }
}
