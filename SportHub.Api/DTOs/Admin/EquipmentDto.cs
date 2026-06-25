namespace SportHub.Api.DTOs.Admin;

public class EquipmentDto
{
    public int SportId { get; set; }

    public string Name { get; set; } = string.Empty;

    public int Quantity { get; set; }

    public decimal RentalPrice { get; set; }
}