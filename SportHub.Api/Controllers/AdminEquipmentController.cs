using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SportHub.Api.Data;
using SportHub.Api.DTOs.Admin;
using SportHub.Api.Models;

namespace SportHub.Api.Controllers;

[ApiController]
[Route("api/admin/equipment")]
[Authorize(Roles = "Admin")]
public class AdminEquipmentController : ControllerBase
{
    private readonly AppDbContext _context;

    public AdminEquipmentController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetEquipment()
    {
        var equipment = await _context.Equipment
            .Include(equipment => equipment.Sport)
            .OrderBy(equipment => equipment.Name)
            .Select(equipment => new
            {
                equipment.Id,
                equipment.Name,
                equipment.Quantity,
                equipment.DailyRentalPrice,
                equipment.PackageHourlyPrice,
                Sport = new
                {
                    equipment.Sport!.Id,
                    equipment.Sport.Name
                }
            })
            .ToListAsync();

        return Ok(equipment);
    }

    [HttpPost]
    public async Task<IActionResult> CreateEquipment(EquipmentDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name))
        {
            return BadRequest("Equipment name is required.");
        }

        if (dto.Quantity < 0)
        {
            return BadRequest("Quantity cannot be negative.");
        }



        var sportExists = await _context.Sports.AnyAsync(sport => sport.Id == dto.SportId);

        if (!sportExists)
        {
            return BadRequest("Sport not found.");
        }

        var equipment = new Equipment
        {
            SportId = dto.SportId,
            Name = dto.Name,
            Quantity = dto.Quantity,
            DailyRentalPrice = dto.DailyRentalPrice,
            PackageHourlyPrice = dto.PackageHourlyPrice
        };

        _context.Equipment.Add(equipment);
        await _context.SaveChangesAsync();

        return Ok(equipment);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateEquipment(int id, EquipmentDto dto)
    {
        var equipment = await _context.Equipment.FindAsync(id);

        if (equipment == null)
        {
            return NotFound("Equipment not found.");
        }

        if (string.IsNullOrWhiteSpace(dto.Name))
        {
            return BadRequest("Equipment name is required.");
        }

        if (dto.Quantity < 0)
        {
            return BadRequest("Quantity cannot be negative.");
        }

        var sportExists = await _context.Sports.AnyAsync(sport => sport.Id == dto.SportId);

        if (!sportExists)
        {
            return BadRequest("Sport not found.");
        }

        equipment.SportId = dto.SportId;
        equipment.Name = dto.Name;
        equipment.Quantity = dto.Quantity;
        equipment.DailyRentalPrice = dto.DailyRentalPrice;
        equipment.PackageHourlyPrice = dto.PackageHourlyPrice;

        await _context.SaveChangesAsync();

        return Ok(equipment);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteEquipment(int id)
    {
        var equipment = await _context.Equipment.FindAsync(id);

        if (equipment == null)
        {
            return NotFound("Equipment not found.");
        }

        var hasBookings = await _context.BookingEquipment.AnyAsync(item => item.EquipmentId == id);

        if (hasBookings)
        {
            return BadRequest("Cannot delete equipment with existing bookings.");
        }

        _context.Equipment.Remove(equipment);
        await _context.SaveChangesAsync();

        return Ok("Equipment deleted.");
    }
}