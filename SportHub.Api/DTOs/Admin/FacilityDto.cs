namespace SportHub.Api.DTOs.Admin;

public class FacilityDto
{
    public int SportId { get; set; }

    public string Name { get; set; } = string.Empty;

    public decimal PricePerHour { get; set; }

    public string? ImageUrl { get; set; }

    public bool IsOutOfService { get; set; }
}
