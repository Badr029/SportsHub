namespace SportHub.Api.Models;

public class Equipment
{
    public int Id { get; set; }

    public int SportId { get; set; }

    public Sport? Sport { get; set; }

    public string Name { get; set; } = string.Empty;

    public int Quantity { get; set; }

    public decimal RentalPrice { get; set; }

    public ICollection<BookingEquipment> BookingEquipment { get; set; } = new List<BookingEquipment>();
}