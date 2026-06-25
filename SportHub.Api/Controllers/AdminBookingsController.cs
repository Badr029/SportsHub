using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SportHub.Api.Data;
using SportHub.Api.Models.Enums;

namespace SportHub.Api.Controllers;

[ApiController]
[Route("api/admin/bookings")]
[Authorize(Roles = "Admin")]
public class AdminBookingsController : ControllerBase
{
    private readonly AppDbContext _context;

    public AdminBookingsController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetAllBookings()
    {
        var bookings = await _context.Bookings
            .Include(booking => booking.User)
            .Include(booking => booking.Facility)
            .Include(booking => booking.BookingEquipment)
                .ThenInclude(item => item.Equipment)
            .OrderByDescending(booking => booking.CreatedAt)
            .Select(booking => new
            {
                booking.Id,
                User = new
                {
                    booking.User!.Id,
                    booking.User.Name,
                    booking.User.Email,
                    booking.User.PhoneNumber
                },
                Facility = booking.Facility == null ? null : new
                {
                    booking.Facility.Id,
                    booking.Facility.Name
                },
                BookingType = booking.BookingType.ToString(),
                Status = booking.Status.ToString(),
                RentalStatus = booking.RentalStatus == null ? null : booking.RentalStatus.ToString(),
                booking.StartDate,
                booking.EndDate,
                booking.TotalPrice,
                Equipment = booking.BookingEquipment.Select(item => new
                {
                    item.EquipmentId,
                    item.Equipment!.Name,
                    item.Quantity
                })
            })
            .ToListAsync();

        if (bookings.Count == 0)
        {
            return NotFound("No bookings found.");
        }

        return Ok(bookings);
    }

    [HttpPost("{id}/confirm")]
    public async Task<IActionResult> ConfirmBooking(int id)
    {
        var booking = await _context.Bookings.FindAsync(id);

        if (booking == null)
        {
            return NotFound("Booking not found.");
        }

        if (booking.Status != BookingStatus.Pending)
        {
            return BadRequest("Only pending bookings can be confirmed.");
        }

        booking.Status = BookingStatus.Confirmed;

        await _context.SaveChangesAsync();

        return Ok("Booking confirmed.");
    }

    [HttpPost("{id}/pickup")]
    public async Task<IActionResult> MarkPickedUp(int id)
    {
        var booking = await _context.Bookings.FindAsync(id);

        if (booking == null)
        {
            return NotFound("Booking not found.");
        }

        if (booking.RentalStatus != RentalStatus.PendingPickup)
        {
            return BadRequest("Only pending pickup rentals can be picked up.");
        }

        booking.RentalStatus = RentalStatus.Active;

        await _context.SaveChangesAsync();

        return Ok("Equipment marked as picked up.");
    }

    [HttpPost("{id}/return")]
    public async Task<IActionResult> MarkReturned(int id)
    {
        var booking = await _context.Bookings.FindAsync(id);

        if (booking == null)
        {
            return NotFound("Booking not found.");
        }

        if (booking.RentalStatus != RentalStatus.Active)
        {
            return BadRequest("Only active rentals can be returned.");
        }

        booking.RentalStatus = RentalStatus.Returned;
        booking.ReturnedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return Ok("Equipment marked as returned.");
    }

    [HttpPost("{id}/complete")]
    public async Task<IActionResult> CompleteBooking(int id)
    {
        var booking = await _context.Bookings.FindAsync(id);

        if (booking == null)
        {
            return NotFound("Booking not found.");
        }

        if (booking.Status != BookingStatus.Confirmed)
        {
            return BadRequest("Only confirmed bookings can be completed.");
        }

        booking.Status = BookingStatus.Completed;

        await _context.SaveChangesAsync();

        return Ok("Booking completed.");
    }
}