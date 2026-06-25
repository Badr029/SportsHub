namespace SportHub.Api.Models;

public class Facility
{
    public int Id { get; set; }

    public int SportId { get; set; }

    public Sport? Sport { get; set; }

    public string Name { get; set; } = string.Empty;

    public decimal PricePerHour { get; set; }

    public ICollection<Booking> Bookings { get; set; } = new List<Booking>();
}