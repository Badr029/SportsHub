using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SportHub.Api.Data;
using SportHub.Api.DTOs.Admin;
using SportHub.Api.Models;

namespace SportHub.Api.Controllers;

[ApiController]
[Route("api/admin/facilities")]
[Authorize(Roles = "Admin")]
public class AdminFacilitiesController : ControllerBase
{
    private readonly AppDbContext _context;

    public AdminFacilitiesController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetFacilities()
    {
        var facilities = await _context.Facilities
            .Include(facility => facility.Sport)
            .OrderBy(facility => facility.Name)
            .Select(facility => new
            {
                facility.Id,
                facility.Name,
                facility.PricePerHour,
                Sport = new
                {
                    facility.Sport!.Id,
                    facility.Sport.Name
                }
            })
            .ToListAsync();

        return Ok(facilities);
    }

    [HttpPost]
    public async Task<IActionResult> CreateFacility(FacilityDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name))
        {
            return BadRequest("Facility name is required.");
        }

        if (dto.PricePerHour <= 0)
        {
            return BadRequest("Price per hour must be greater than zero.");
        }

        var sportExists = await _context.Sports.AnyAsync(sport => sport.Id == dto.SportId);

        if (!sportExists)
        {
            return BadRequest("Sport not found.");
        }

        var facility = new Facility
        {
            SportId = dto.SportId,
            Name = dto.Name,
            PricePerHour = dto.PricePerHour
        };

        _context.Facilities.Add(facility);
        await _context.SaveChangesAsync();

        return Ok(facility);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateFacility(int id, FacilityDto dto)
    {
        var facility = await _context.Facilities.FindAsync(id);

        if (facility == null)
        {
            return NotFound("Facility not found.");
        }

        if (string.IsNullOrWhiteSpace(dto.Name))
        {
            return BadRequest("Facility name is required.");
        }

        if (dto.PricePerHour <= 0)
        {
            return BadRequest("Price per hour must be greater than zero.");
        }

        var sportExists = await _context.Sports.AnyAsync(sport => sport.Id == dto.SportId);

        if (!sportExists)
        {
            return BadRequest("Sport not found.");
        }

        facility.SportId = dto.SportId;
        facility.Name = dto.Name;
        facility.PricePerHour = dto.PricePerHour;

        await _context.SaveChangesAsync();

        return Ok(facility);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteFacility(int id)
    {
        var facility = await _context.Facilities.FindAsync(id);

        if (facility == null)
        {
            return NotFound("Facility not found.");
        }

        var hasBookings = await _context.Bookings.AnyAsync(booking => booking.FacilityId == id);

        if (hasBookings)
        {
            return BadRequest("Cannot delete facility with existing bookings.");
        }

        _context.Facilities.Remove(facility);
        await _context.SaveChangesAsync();

        return Ok("Facility deleted.");
    }
}