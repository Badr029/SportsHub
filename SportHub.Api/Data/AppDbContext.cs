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
            new Sport
            {
                Id = 1,
                Name = "Football",
                Description = "Football fields and rental equipment.",
                ImageUrl = null
            },
            new Sport
            {
                Id = 2,
                Name = "Tennis",
                Description = "Tennis courts, rackets, and balls.",
                ImageUrl = null
            },
            new Sport
            {
                Id = 3,
                Name = "Padel",
                Description = "Padel courts and racket rentals.",
                ImageUrl = null
            },
            new Sport
            {
                Id = 4,
                Name = "Basketball",
                Description = "Basketball courts and balls.",
                ImageUrl = null
            }
        );

        modelBuilder.Entity<Facility>().HasData(
            new Facility
            {
                Id = 1,
                SportId = 1,
                Name = "5-a-side Football Field",
                PricePerHour = 350
            },
            new Facility
            {
                Id = 2,
                SportId = 2,
                Name = "Tennis Court 1",
                PricePerHour = 250
            },
            new Facility
            {
                Id = 3,
                SportId = 3,
                Name = "Padel Court 1",
                PricePerHour = 400
            },
            new Facility
            {
                Id = 4,
                SportId = 4,
                Name = "Indoor Basketball Court",
                PricePerHour = 300
            }
        );

        modelBuilder.Entity<Equipment>().HasData(
            new Equipment
            {
                Id = 1,
                SportId = 1,
                Name = "Football",
                Quantity = 20,
                DailyRentalPrice = 30,
                PackageHourlyPrice = 10
            },
            new Equipment
            {
                Id = 2,
                SportId = 2,
                Name = "Tennis Racket",
                Quantity = 12,
                DailyRentalPrice = 50,
                PackageHourlyPrice = 15
            },
            new Equipment
            {
                Id = 3,
                SportId = 3,
                Name = "Padel Racket",
                Quantity = 10,
                DailyRentalPrice = 70,
                PackageHourlyPrice = 20
            },
            new Equipment
            {
                Id = 4,
                SportId = 4,
                Name = "Basketball",
                DailyRentalPrice = 35,
                PackageHourlyPrice = 10
            }
        );
    }
}