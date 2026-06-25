using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SportHub.Api.Data;
using SportHub.Api.DTOs.Admin;
using SportHub.Api.Models;

namespace SportHub.Api.Controllers;

[ApiController]
[Route("api/admin/sports")]
[Authorize(Roles = "Admin")]
public class AdminSportsController : ControllerBase
{
    private readonly AppDbContext _context;

    public AdminSportsController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetSports()
    {
        var sports = await _context.Sports
            .OrderBy(sport => sport.Name)
            .ToListAsync();

        return Ok(sports);
    }

    [HttpPost]
    public async Task<IActionResult> CreateSport(SportDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name))
        {
            return BadRequest("Sport name is required.");
        }

        var sport = new Sport
        {
            Name = dto.Name,
            Description = dto.Description,
            ImageUrl = dto.ImageUrl
        };

        _context.Sports.Add(sport);
        await _context.SaveChangesAsync();

        return Ok(sport);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateSport(int id, SportDto dto)
    {
        var sport = await _context.Sports.FindAsync(id);

        if (sport == null)
        {
            return NotFound("Sport not found.");
        }

        if (string.IsNullOrWhiteSpace(dto.Name))
        {
            return BadRequest("Sport name is required.");
        }

        sport.Name = dto.Name;
        sport.Description = dto.Description;
        sport.ImageUrl = dto.ImageUrl;

        await _context.SaveChangesAsync();

        return Ok(sport);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteSport(int id)
    {
        var sport = await _context.Sports.FindAsync(id);

        if (sport == null)
        {
            return NotFound("Sport not found.");
        }

        var hasFacilities = await _context.Facilities.AnyAsync(facility => facility.SportId == id);
        var hasEquipment = await _context.Equipment.AnyAsync(equipment => equipment.SportId == id);

        if (hasFacilities || hasEquipment)
        {
            return BadRequest("Cannot delete sport with existing facilities or equipment.");
        }

        _context.Sports.Remove(sport);
        await _context.SaveChangesAsync();

        return Ok("Sport deleted.");
    }
}