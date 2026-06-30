using Microsoft.EntityFrameworkCore;
using SportHub.Api.Models;
using SportHub.Api.Models.Enums;

namespace SportHub.Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<User> Users { get; set; }

    public DbSet<Sport> Sports { get; set; }

    public DbSet<Facility> Facilities { get; set; }

    public DbSet<Equipment> Equipment { get; set; }

    public DbSet<Booking> Bookings { get; set; }

    public DbSet<BookingEquipment> BookingEquipment { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<User>()
            .HasIndex(user => user.Email)
            .IsUnique();

        modelBuilder.Entity<User>()
            .Property(user => user.Role)
            .HasConversion<string>();

        modelBuilder.Entity<Booking>()
            .Property(booking => booking.BookingType)
            .HasConversion<string>();

        modelBuilder.Entity<Booking>()
            .Property(booking => booking.Status)
            .HasConversion<string>();

        modelBuilder.Entity<Booking>()
            .Property(booking => booking.RentalStatus)
            .HasConversion<string>();

        modelBuilder.Entity<Sport>().HasData(
            new Sport { Id = 1, Name = "Football", Description = "Football fields for 5-a-side, 7-a-side, and full matches with training equipment.", ImageUrl = "/uploads/seed/football/sport-image.png" },
            new Sport { Id = 2, Name = "Tennis", Description = "Tennis courts with rackets, balls, carts, and training equipment.", ImageUrl = "/uploads/seed/tennis/sport-image.png" },
            new Sport { Id = 3, Name = "Padel", Description = "Padel courts with rackets, balls, scoreboards, and training gear.", ImageUrl = "/uploads/seed/padel/sport-image.png" },
            new Sport { Id = 4, Name = "Basketball", Description = "Indoor and outdoor basketball courts with balls and training equipment.", ImageUrl = "/uploads/seed/basketball/sport-image.png" },
            new Sport { Id = 5, Name = "Boxing", Description = "Boxing ring and training equipment for strength, speed, and reflex practice.", ImageUrl = "/uploads/seed/boxing/sport-image.png" },
            new Sport { Id = 6, Name = "Archery", Description = "Archery range with bows, arrows, safety gear, and target stands.", ImageUrl = "/uploads/seed/archery/sport-image.png" }
        );

        modelBuilder.Entity<Facility>().HasData(
            new Facility { Id = 1, SportId = 1, Name = "5-a-side Football Field", PricePerHour = 350, ImageUrl = "/uploads/seed/football/5-a-side-football-field.png", IsOutOfService = false },
            new Facility { Id = 2, SportId = 2, Name = "Tennis Court 1", PricePerHour = 250, ImageUrl = "/uploads/seed/tennis/tennis-court-facility.png", IsOutOfService = false },
            new Facility { Id = 3, SportId = 3, Name = "Padel Court 1", PricePerHour = 400, ImageUrl = "/uploads/seed/padel/padel-court-facility.png", IsOutOfService = false },
            new Facility { Id = 4, SportId = 4, Name = "Indoor Basketball Court", PricePerHour = 300, ImageUrl = "/uploads/seed/basketball/indoor-basketball-court.png", IsOutOfService = false },
            new Facility { Id = 5, SportId = 1, Name = "7-a-side Football Field", PricePerHour = 500, ImageUrl = "/uploads/seed/football/7-a-side-football-field.png", IsOutOfService = false },
            new Facility { Id = 6, SportId = 1, Name = "11-a-side Full Football Field", PricePerHour = 800, ImageUrl = "/uploads/seed/football/11-a-side-full-football-field.png", IsOutOfService = false },
            new Facility { Id = 7, SportId = 4, Name = "Outdoor Basketball Court", PricePerHour = 220, ImageUrl = "/uploads/seed/basketball/outdoor-basketball-court.png", IsOutOfService = false },
            new Facility { Id = 8, SportId = 5, Name = "Boxing Ring", PricePerHour = 280, ImageUrl = "/uploads/seed/boxing/boxing-ring-facility.png", IsOutOfService = false },
            new Facility { Id = 9, SportId = 6, Name = "Archery Range", PricePerHour = 240, ImageUrl = "/uploads/seed/archery/archry-facility.png", IsOutOfService = false }
        );

        modelBuilder.Entity<Equipment>().HasData(
            new Equipment { Id = 1, SportId = 1, Name = "Football", Quantity = 30, ImageUrl = "/uploads/seed/football/football-ball.png", DailyRentalPrice = 30, PackageHourlyPrice = 10 },
            new Equipment { Id = 2, SportId = 2, Name = "Tennis Racket", Quantity = 12, ImageUrl = "/uploads/seed/tennis/tennis-racket.png", DailyRentalPrice = 50, PackageHourlyPrice = 15 },
            new Equipment { Id = 3, SportId = 3, Name = "Padel Racket", Quantity = 10, ImageUrl = "/uploads/seed/padel/padel-racket.png", DailyRentalPrice = 70, PackageHourlyPrice = 20 },
            new Equipment { Id = 4, SportId = 4, Name = "Basketball", Quantity = 25, ImageUrl = "/uploads/seed/basketball/basketball-ball.png", DailyRentalPrice = 35, PackageHourlyPrice = 10 },
            new Equipment { Id = 5, SportId = 1, Name = "Football Training Cones", Quantity = 60, ImageUrl = "/uploads/seed/football/training-cones.png", DailyRentalPrice = 20, PackageHourlyPrice = 5 },
            new Equipment { Id = 6, SportId = 1, Name = "Football Training Hurdles", Quantity = 24, ImageUrl = "/uploads/seed/football/training-hurdles.png", DailyRentalPrice = 25, PackageHourlyPrice = 8 },
            new Equipment { Id = 7, SportId = 1, Name = "Football Agility Ladder", Quantity = 15, ImageUrl = "/uploads/seed/football/agility-ladder.png", DailyRentalPrice = 25, PackageHourlyPrice = 8 },
            new Equipment { Id = 8, SportId = 1, Name = "Away Vest", Quantity = 40, ImageUrl = "/uploads/seed/football/away-vest.png", DailyRentalPrice = 15, PackageHourlyPrice = 5 },
            new Equipment { Id = 9, SportId = 2, Name = "Tennis Ball", Quantity = 80, ImageUrl = "/uploads/seed/tennis/tennis-ball.png", DailyRentalPrice = 20, PackageHourlyPrice = 5 },
            new Equipment { Id = 10, SportId = 2, Name = "Tennis Ball Machine", Quantity = 4, ImageUrl = "/uploads/seed/tennis/tennis-ball-machine.png", DailyRentalPrice = 120, PackageHourlyPrice = 45 },
            new Equipment { Id = 11, SportId = 2, Name = "Tennis Ball Cart", Quantity = 8, ImageUrl = "/uploads/seed/tennis/ball-cart.png", DailyRentalPrice = 35, PackageHourlyPrice = 10 },
            new Equipment { Id = 12, SportId = 2, Name = "Tennis Scoreboard", Quantity = 6, ImageUrl = "/uploads/seed/tennis/scoreboard.png", DailyRentalPrice = 25, PackageHourlyPrice = 8 },
            new Equipment { Id = 13, SportId = 3, Name = "Padel Ball", Quantity = 60, ImageUrl = "/uploads/seed/padel/padel-ball.png", DailyRentalPrice = 25, PackageHourlyPrice = 8 },
            new Equipment { Id = 14, SportId = 3, Name = "Padel Ball Basket Cart", Quantity = 8, ImageUrl = "/uploads/seed/padel/ball-basket-cart.png", DailyRentalPrice = 35, PackageHourlyPrice = 10 },
            new Equipment { Id = 15, SportId = 3, Name = "Padel Scoreboard", Quantity = 6, ImageUrl = "/uploads/seed/padel/scoreboard.png", DailyRentalPrice = 25, PackageHourlyPrice = 8 },
            new Equipment { Id = 16, SportId = 3, Name = "Target Rebounder Net", Quantity = 5, ImageUrl = "/uploads/seed/padel/target-rebounder-net.png", DailyRentalPrice = 60, PackageHourlyPrice = 20 },
            new Equipment { Id = 17, SportId = 4, Name = "Basketball Ball Rack", Quantity = 5, ImageUrl = "/uploads/seed/basketball/basketball-ball-rack.png", DailyRentalPrice = 40, PackageHourlyPrice = 12 },
            new Equipment { Id = 18, SportId = 4, Name = "Basketball Training Cones", Quantity = 60, ImageUrl = "/uploads/seed/basketball/training-cones.png", DailyRentalPrice = 20, PackageHourlyPrice = 5 },
            new Equipment { Id = 19, SportId = 4, Name = "Basketball Training Hurdles", Quantity = 24, ImageUrl = "/uploads/seed/basketball/training-hurdles.png", DailyRentalPrice = 25, PackageHourlyPrice = 8 },
            new Equipment { Id = 20, SportId = 4, Name = "Basketball Agility Ladder", Quantity = 15, ImageUrl = "/uploads/seed/basketball/agility-ladder.png", DailyRentalPrice = 25, PackageHourlyPrice = 8 },
            new Equipment { Id = 21, SportId = 5, Name = "Heavy Punching Bag", Quantity = 8, ImageUrl = "/uploads/seed/boxing/heavy-punching-bag.png", DailyRentalPrice = 80, PackageHourlyPrice = 25 },
            new Equipment { Id = 22, SportId = 5, Name = "Double-end Punching Bag", Quantity = 6, ImageUrl = "/uploads/seed/boxing/double-end-punching-bag.png", DailyRentalPrice = 60, PackageHourlyPrice = 20 },
            new Equipment { Id = 23, SportId = 5, Name = "Reflex Punching Ball", Quantity = 6, ImageUrl = "/uploads/seed/boxing/reflex-punching-ball.png", DailyRentalPrice = 50, PackageHourlyPrice = 18 },
            new Equipment { Id = 24, SportId = 5, Name = "Speed Bag", Quantity = 6, ImageUrl = "/uploads/seed/boxing/speed-bag.png", DailyRentalPrice = 45, PackageHourlyPrice = 15 },
            new Equipment { Id = 25, SportId = 5, Name = "Jump Rope", Quantity = 25, ImageUrl = "/uploads/seed/boxing/jump-rope.png", DailyRentalPrice = 15, PackageHourlyPrice = 5 },
            new Equipment { Id = 26, SportId = 5, Name = "Medicine Ball", Quantity = 12, ImageUrl = "/uploads/seed/boxing/medicine-ball.png", DailyRentalPrice = 30, PackageHourlyPrice = 10 },
            new Equipment { Id = 27, SportId = 6, Name = "Bow", Quantity = 12, ImageUrl = "/uploads/seed/archery/bow-equipment.png", DailyRentalPrice = 70, PackageHourlyPrice = 20 },
            new Equipment { Id = 28, SportId = 6, Name = "Arrows", Quantity = 120, ImageUrl = "/uploads/seed/archery/arrows-equipment.png", DailyRentalPrice = 25, PackageHourlyPrice = 8 },
            new Equipment { Id = 29, SportId = 6, Name = "Arrow Holder", Quantity = 20, ImageUrl = "/uploads/seed/archery/arrow-holder-equipment.png", DailyRentalPrice = 20, PackageHourlyPrice = 6 },
            new Equipment { Id = 30, SportId = 6, Name = "Arm Guard", Quantity = 25, ImageUrl = "/uploads/seed/archery/arm-guard.png", DailyRentalPrice = 15, PackageHourlyPrice = 5 },
            new Equipment { Id = 31, SportId = 6, Name = "Finger Tab", Quantity = 25, ImageUrl = "/uploads/seed/archery/finger-tab.png", DailyRentalPrice = 15, PackageHourlyPrice = 5 },
            new Equipment { Id = 32, SportId = 6, Name = "Archery Target Stand", Quantity = 10, ImageUrl = "/uploads/seed/archery/archery-target-target-stand.png", DailyRentalPrice = 45, PackageHourlyPrice = 15 }
        );
    }
}
