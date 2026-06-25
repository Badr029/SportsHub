namespace SportHub.Api.Models;

public class Sport
{
    public int Id { get; set; }

    public string Name { get; set; } = string.Empty;

    public string Description { get; set; } = string.Empty;

    public string? ImageUrl { get; set; }

    public ICollection<Facility> Facilities { get; set; } = new List<Facility>();

    public ICollection<Equipment> Equipment { get; set; } = new List<Equipment>();
}