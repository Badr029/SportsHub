using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SportHub.Api.Migrations
{
    /// <inheritdoc />
    public partial class SeedAdminAccount : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                INSERT INTO Users (Name, Email, PhoneNumber, PasswordHash, Role)
                SELECT 'SportHub Admin',
                       'admin@sporthub.com',
                       '01000000000',
                       '$2a$11$g4Pj1YnNtg4YkEDajgwStem6EFsNcaHD.xdvwRjc7O8JUQH2PUEhm',
                       'Admin'
                WHERE NOT EXISTS (
                    SELECT 1 FROM Users WHERE Email = 'admin@sporthub.com'
                );
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                DELETE FROM Users
                WHERE Email = 'admin@sporthub.com';
                """);
        }
    }
}
