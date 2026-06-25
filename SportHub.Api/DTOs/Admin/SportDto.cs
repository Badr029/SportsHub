namespace SportHub.Api.DTOs.Admin;

public class SportDto
{
    public string Name { get; set; } = string.Empty;

    public string Description { get; set; } = string.Empty;

    public string? ImageUrl { get; set; }
}