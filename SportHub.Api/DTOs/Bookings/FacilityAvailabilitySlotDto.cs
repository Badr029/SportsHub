namespace SportHub.Api.DTOs.Bookings;

public class FacilityAvailabilitySlotDto
{
    public string Time { get; set; } = string.Empty;

    public string Label { get; set; } = string.Empty;

    public bool Available { get; set; }
}
