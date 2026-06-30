namespace SportHub.Api.DTOs.Bookings;

public class EquipmentAvailabilityDto
{
    public int EquipmentId { get; set; }

    public int TotalQuantity { get; set; }

    public int ReservedQuantity { get; set; }

    public int AvailableQuantity { get; set; }
}