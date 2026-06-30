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
    public async Task<IActionResult> GetAllBookings(int page = 1, int pageSize = 6, string status = "All")
    {
        if (page < 1)
        {
            page = 1;
        }

        if (pageSize < 1 || pageSize > 50)
        {
            pageSize = 6;
        }

        var query = _context.Bookings
            .Include(booking => booking.User)
            .Include(booking => booking.Facility)
            .Include(booking => booking.BookingEquipment)
                .ThenInclude(item => item.Equipment)
            .AsQueryable();

        if (!string.Equals(status, "All", StringComparison.OrdinalIgnoreCase))
        {
            if (!Enum.TryParse<BookingStatus>(status, true, out var parsedStatus))
            {
                return BadRequest("Invalid booking status.");
            }

            query = query.Where(booking => booking.Status == parsedStatus);
        }

        var totalCount = await query.CountAsync();

        var bookings = await query
            .OrderBy(booking => booking.Status == BookingStatus.Pending ? 1 :
                booking.Status == BookingStatus.Confirmed ? 2 :
                booking.Status == BookingStatus.Cancelled ? 3 :
                booking.Status == BookingStatus.Completed ? 4 : 5)
            .ThenByDescending(booking => booking.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
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

        return Ok(new
        {
            Items = bookings,
            Page = page,
            PageSize = pageSize,
            TotalCount = totalCount,
            TotalPages = (int)Math.Ceiling(totalCount / (double)pageSize)
        });
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

    [HttpPost("{id}/cancel")]
    public async Task<IActionResult> CancelBooking(int id)
    {
        var booking = await _context.Bookings.FindAsync(id);

        if (booking == null)
        {
            return NotFound("Booking not found.");
        }

        if (booking.Status == BookingStatus.Cancelled)
        {
            return BadRequest("Booking is already cancelled.");
        }

        if (booking.Status == BookingStatus.Completed)
        {
            return BadRequest("Completed bookings cannot be cancelled.");
        }

        booking.Status = BookingStatus.Cancelled;

        await _context.SaveChangesAsync();

        return Ok("Booking cancelled.");
    }
}
