using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SportHub.Api.Data;


namespace SportHub.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SportsController : ControllerBase
{
    private readonly AppDbContext _context;

    public SportsController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetSports()
    {
        var sports = await _context.Sports
            .Select(s => new
            {
                s.Id,
                s.Name,
                s.Description,
                s.ImageUrl
            })
            .ToListAsync();

        return Ok(sports);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetSport(int id)
    {
        var sport = await _context.Sports
            .Where(s => s.Id == id)
            .Select(s => new
            {
                s.Id,
                s.Name,
                s.Description,
                s.ImageUrl,
                Facilities = s.Facilities.Select(f => new
                {
                    f.Id,
                    f.Name,
                    f.PricePerHour,
                }),
                Equipment = s.Equipment.Select(e => new
                {
                    e.Id,
                    e.Name,
                    e.Quantity,
                    e.DailyRentalPrice,
                    e.PackageHourlyPrice
                })
            })
            .FirstOrDefaultAsync();
        if (sport == null)
        {
            return NotFound("Sport not found.");
        }
        return Ok(sport);
    }
            
}