using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace SportHub.Api.Migrations
{
    /// <inheritdoc />
    public partial class SeedDocsSports : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.UpdateData(
                table: "Equipment",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "ImageUrl", "Quantity" },
                values: new object[] { "/uploads/seed/football/football-ball.png", 30 });

            migrationBuilder.UpdateData(
                table: "Equipment",
                keyColumn: "Id",
                keyValue: 2,
                column: "ImageUrl",
                value: "/uploads/seed/tennis/tennis-racket.png");

            migrationBuilder.UpdateData(
                table: "Equipment",
                keyColumn: "Id",
                keyValue: 3,
                column: "ImageUrl",
                value: "/uploads/seed/padel/padel-racket.png");

            migrationBuilder.UpdateData(
                table: "Equipment",
                keyColumn: "Id",
                keyValue: 4,
                columns: new[] { "ImageUrl", "Quantity" },
                values: new object[] { "/uploads/seed/basketball/basketball-ball.png", 25 });

            migrationBuilder.InsertData(
                table: "Equipment",
                columns: new[] { "Id", "DailyRentalPrice", "ImageUrl", "Name", "PackageHourlyPrice", "Quantity", "SportId" },
                values: new object[,]
                {
                    { 5, 20m, "/uploads/seed/football/training-cones.png", "Football Training Cones", 5m, 60, 1 },
                    { 6, 25m, "/uploads/seed/football/training-hurdles.png", "Football Training Hurdles", 8m, 24, 1 },
                    { 7, 25m, "/uploads/seed/football/agility-ladder.png", "Football Agility Ladder", 8m, 15, 1 },
                    { 8, 15m, "/uploads/seed/football/away-vest.png", "Away Vest", 5m, 40, 1 },
                    { 9, 20m, "/uploads/seed/tennis/tennis-ball.png", "Tennis Ball", 5m, 80, 2 },
                    { 10, 120m, "/uploads/seed/tennis/tennis-ball-machine.png", "Tennis Ball Machine", 45m, 4, 2 },
                    { 11, 35m, "/uploads/seed/tennis/ball-cart.png", "Tennis Ball Cart", 10m, 8, 2 },
                    { 12, 25m, "/uploads/seed/tennis/scoreboard.png", "Tennis Scoreboard", 8m, 6, 2 },
                    { 13, 25m, "/uploads/seed/padel/padel-ball.png", "Padel Ball", 8m, 60, 3 },
                    { 14, 35m, "/uploads/seed/padel/ball-basket-cart.png", "Padel Ball Basket Cart", 10m, 8, 3 },
                    { 15, 25m, "/uploads/seed/padel/scoreboard.png", "Padel Scoreboard", 8m, 6, 3 },
                    { 16, 60m, "/uploads/seed/padel/target-rebounder-net.png", "Target Rebounder Net", 20m, 5, 3 },
                    { 17, 40m, "/uploads/seed/basketball/basketball-ball-rack.png", "Basketball Ball Rack", 12m, 5, 4 },
                    { 18, 20m, "/uploads/seed/basketball/training-cones.png", "Basketball Training Cones", 5m, 60, 4 },
                    { 19, 25m, "/uploads/seed/basketball/training-hurdles.png", "Basketball Training Hurdles", 8m, 24, 4 },
                    { 20, 25m, "/uploads/seed/basketball/agility-ladder.png", "Basketball Agility Ladder", 8m, 15, 4 }
                });

            migrationBuilder.UpdateData(
                table: "Facilities",
                keyColumn: "Id",
                keyValue: 1,
                column: "ImageUrl",
                value: "/uploads/seed/football/5-a-side-football-field.png");

            migrationBuilder.UpdateData(
                table: "Facilities",
                keyColumn: "Id",
                keyValue: 2,
                column: "ImageUrl",
                value: "/uploads/seed/tennis/tennis-court-facility.png");

            migrationBuilder.UpdateData(
                table: "Facilities",
                keyColumn: "Id",
                keyValue: 3,
                column: "ImageUrl",
                value: "/uploads/seed/padel/padel-court-facility.png");

            migrationBuilder.UpdateData(
                table: "Facilities",
                keyColumn: "Id",
                keyValue: 4,
                column: "ImageUrl",
                value: "/uploads/seed/basketball/indoor-basketball-court.png");

            migrationBuilder.InsertData(
                table: "Facilities",
                columns: new[] { "Id", "ImageUrl", "IsOutOfService", "Name", "PricePerHour", "SportId" },
                values: new object[,]
                {
                    { 5, "/uploads/seed/football/7-a-side-football-field.png", false, "7-a-side Football Field", 500m, 1 },
                    { 6, "/uploads/seed/football/11-a-side-full-football-field.png", false, "11-a-side Full Football Field", 800m, 1 },
                    { 7, "/uploads/seed/basketball/outdoor-basketball-court.png", false, "Outdoor Basketball Court", 220m, 4 }
                });

            migrationBuilder.UpdateData(
                table: "Sports",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "Description", "ImageUrl" },
                values: new object[] { "Football fields for 5-a-side, 7-a-side, and full matches with training equipment.", "/uploads/seed/football/sport-image.png" });

            migrationBuilder.UpdateData(
                table: "Sports",
                keyColumn: "Id",
                keyValue: 2,
                columns: new[] { "Description", "ImageUrl" },
                values: new object[] { "Tennis courts with rackets, balls, carts, and training equipment.", "/uploads/seed/tennis/sport-image.png" });

            migrationBuilder.UpdateData(
                table: "Sports",
                keyColumn: "Id",
                keyValue: 3,
                columns: new[] { "Description", "ImageUrl" },
                values: new object[] { "Padel courts with rackets, balls, scoreboards, and training gear.", "/uploads/seed/padel/sport-image.png" });

            migrationBuilder.UpdateData(
                table: "Sports",
                keyColumn: "Id",
                keyValue: 4,
                columns: new[] { "Description", "ImageUrl" },
                values: new object[] { "Indoor and outdoor basketball courts with balls and training equipment.", "/uploads/seed/basketball/sport-image.png" });

            migrationBuilder.InsertData(
                table: "Sports",
                columns: new[] { "Id", "Description", "ImageUrl", "Name" },
                values: new object[,]
                {
                    { 5, "Boxing ring and training equipment for strength, speed, and reflex practice.", "/uploads/seed/boxing/sport-image.png", "Boxing" },
                    { 6, "Archery range with bows, arrows, safety gear, and target stands.", "/uploads/seed/archery/sport-image.png", "Archery" }
                });

            migrationBuilder.InsertData(
                table: "Equipment",
                columns: new[] { "Id", "DailyRentalPrice", "ImageUrl", "Name", "PackageHourlyPrice", "Quantity", "SportId" },
                values: new object[,]
                {
                    { 21, 80m, "/uploads/seed/boxing/heavy-punching-bag.png", "Heavy Punching Bag", 25m, 8, 5 },
                    { 22, 60m, "/uploads/seed/boxing/double-end-punching-bag.png", "Double-end Punching Bag", 20m, 6, 5 },
                    { 23, 50m, "/uploads/seed/boxing/reflex-punching-ball.png", "Reflex Punching Ball", 18m, 6, 5 },
                    { 24, 45m, "/uploads/seed/boxing/speed-bag.png", "Speed Bag", 15m, 6, 5 },
                    { 25, 15m, "/uploads/seed/boxing/jump-rope.png", "Jump Rope", 5m, 25, 5 },
                    { 26, 30m, "/uploads/seed/boxing/medicine-ball.png", "Medicine Ball", 10m, 12, 5 },
                    { 27, 70m, "/uploads/seed/archery/bow-equipment.png", "Bow", 20m, 12, 6 },
                    { 28, 25m, "/uploads/seed/archery/arrows-equipment.png", "Arrows", 8m, 120, 6 },
                    { 29, 20m, "/uploads/seed/archery/arrow-holder-equipment.png", "Arrow Holder", 6m, 20, 6 },
                    { 30, 15m, "/uploads/seed/archery/arm-guard.png", "Arm Guard", 5m, 25, 6 },
                    { 31, 15m, "/uploads/seed/archery/finger-tab.png", "Finger Tab", 5m, 25, 6 },
                    { 32, 45m, "/uploads/seed/archery/archery-target-target-stand.png", "Archery Target Stand", 15m, 10, 6 }
                });

            migrationBuilder.InsertData(
                table: "Facilities",
                columns: new[] { "Id", "ImageUrl", "IsOutOfService", "Name", "PricePerHour", "SportId" },
                values: new object[,]
                {
                    { 8, "/uploads/seed/boxing/boxing-ring-facility.png", false, "Boxing Ring", 280m, 5 },
                    { 9, "/uploads/seed/archery/archry-facility.png", false, "Archery Range", 240m, 6 }
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                table: "Equipment",
                keyColumn: "Id",
                keyValue: 5);

            migrationBuilder.DeleteData(
                table: "Equipment",
                keyColumn: "Id",
                keyValue: 6);

            migrationBuilder.DeleteData(
                table: "Equipment",
                keyColumn: "Id",
                keyValue: 7);

            migrationBuilder.DeleteData(
                table: "Equipment",
                keyColumn: "Id",
                keyValue: 8);

            migrationBuilder.DeleteData(
                table: "Equipment",
                keyColumn: "Id",
                keyValue: 9);

            migrationBuilder.DeleteData(
                table: "Equipment",
                keyColumn: "Id",
                keyValue: 10);

            migrationBuilder.DeleteData(
                table: "Equipment",
                keyColumn: "Id",
                keyValue: 11);

            migrationBuilder.DeleteData(
                table: "Equipment",
                keyColumn: "Id",
                keyValue: 12);

            migrationBuilder.DeleteData(
                table: "Equipment",
                keyColumn: "Id",
                keyValue: 13);

            migrationBuilder.DeleteData(
                table: "Equipment",
                keyColumn: "Id",
                keyValue: 14);

            migrationBuilder.DeleteData(
                table: "Equipment",
                keyColumn: "Id",
                keyValue: 15);

            migrationBuilder.DeleteData(
                table: "Equipment",
                keyColumn: "Id",
                keyValue: 16);

            migrationBuilder.DeleteData(
                table: "Equipment",
                keyColumn: "Id",
                keyValue: 17);

            migrationBuilder.DeleteData(
                table: "Equipment",
                keyColumn: "Id",
                keyValue: 18);

            migrationBuilder.DeleteData(
                table: "Equipment",
                keyColumn: "Id",
                keyValue: 19);

            migrationBuilder.DeleteData(
                table: "Equipment",
                keyColumn: "Id",
                keyValue: 20);

            migrationBuilder.DeleteData(
                table: "Equipment",
                keyColumn: "Id",
                keyValue: 21);

            migrationBuilder.DeleteData(
                table: "Equipment",
                keyColumn: "Id",
                keyValue: 22);

            migrationBuilder.DeleteData(
                table: "Equipment",
                keyColumn: "Id",
                keyValue: 23);

            migrationBuilder.DeleteData(
                table: "Equipment",
                keyColumn: "Id",
                keyValue: 24);

            migrationBuilder.DeleteData(
                table: "Equipment",
                keyColumn: "Id",
                keyValue: 25);

            migrationBuilder.DeleteData(
                table: "Equipment",
                keyColumn: "Id",
                keyValue: 26);

            migrationBuilder.DeleteData(
                table: "Equipment",
                keyColumn: "Id",
                keyValue: 27);

            migrationBuilder.DeleteData(
                table: "Equipment",
                keyColumn: "Id",
                keyValue: 28);

            migrationBuilder.DeleteData(
                table: "Equipment",
                keyColumn: "Id",
                keyValue: 29);

            migrationBuilder.DeleteData(
                table: "Equipment",
                keyColumn: "Id",
                keyValue: 30);

            migrationBuilder.DeleteData(
                table: "Equipment",
                keyColumn: "Id",
                keyValue: 31);

            migrationBuilder.DeleteData(
                table: "Equipment",
                keyColumn: "Id",
                keyValue: 32);

            migrationBuilder.DeleteData(
                table: "Facilities",
                keyColumn: "Id",
                keyValue: 5);

            migrationBuilder.DeleteData(
                table: "Facilities",
                keyColumn: "Id",
                keyValue: 6);

            migrationBuilder.DeleteData(
                table: "Facilities",
                keyColumn: "Id",
                keyValue: 7);

            migrationBuilder.DeleteData(
                table: "Facilities",
                keyColumn: "Id",
                keyValue: 8);

            migrationBuilder.DeleteData(
                table: "Facilities",
                keyColumn: "Id",
                keyValue: 9);

            migrationBuilder.DeleteData(
                table: "Sports",
                keyColumn: "Id",
                keyValue: 5);

            migrationBuilder.DeleteData(
                table: "Sports",
                keyColumn: "Id",
                keyValue: 6);

            migrationBuilder.UpdateData(
                table: "Equipment",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "ImageUrl", "Quantity" },
                values: new object[] { null, 20 });

            migrationBuilder.UpdateData(
                table: "Equipment",
                keyColumn: "Id",
                keyValue: 2,
                column: "ImageUrl",
                value: null);

            migrationBuilder.UpdateData(
                table: "Equipment",
                keyColumn: "Id",
                keyValue: 3,
                column: "ImageUrl",
                value: null);

            migrationBuilder.UpdateData(
                table: "Equipment",
                keyColumn: "Id",
                keyValue: 4,
                columns: new[] { "ImageUrl", "Quantity" },
                values: new object[] { null, 0 });

            migrationBuilder.UpdateData(
                table: "Facilities",
                keyColumn: "Id",
                keyValue: 1,
                column: "ImageUrl",
                value: null);

            migrationBuilder.UpdateData(
                table: "Facilities",
                keyColumn: "Id",
                keyValue: 2,
                column: "ImageUrl",
                value: null);

            migrationBuilder.UpdateData(
                table: "Facilities",
                keyColumn: "Id",
                keyValue: 3,
                column: "ImageUrl",
                value: null);

            migrationBuilder.UpdateData(
                table: "Facilities",
                keyColumn: "Id",
                keyValue: 4,
                column: "ImageUrl",
                value: null);

            migrationBuilder.UpdateData(
                table: "Sports",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "Description", "ImageUrl" },
                values: new object[] { "Football fields and rental equipment.", null });

            migrationBuilder.UpdateData(
                table: "Sports",
                keyColumn: "Id",
                keyValue: 2,
                columns: new[] { "Description", "ImageUrl" },
                values: new object[] { "Tennis courts, rackets, and balls.", null });

            migrationBuilder.UpdateData(
                table: "Sports",
                keyColumn: "Id",
                keyValue: 3,
                columns: new[] { "Description", "ImageUrl" },
                values: new object[] { "Padel courts and racket rentals.", null });

            migrationBuilder.UpdateData(
                table: "Sports",
                keyColumn: "Id",
                keyValue: 4,
                columns: new[] { "Description", "ImageUrl" },
                values: new object[] { "Basketball courts and balls.", null });
        }
    }
}
