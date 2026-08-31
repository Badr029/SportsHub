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
            .Include(booking => booking.Payment)
            .AsQueryable();

        if (!string.Equals(status, "All", StringComparison.OrdinalIgnoreCase))
        {
            if (!Enum.TryParse<BookingStatus>(status, true, out var parsedStatus))
            {
                return BadRequest("Invalid booking status.");
            }

            query = query.Where(booking => booking.Status == parsedStatus);
        }

        var bookingsToUpdate = await query.ToListAsync();
        await UpdateExpiredBookings(bookingsToUpdate);

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
                // Equipment rentals gate pickup/complete on these, so the
                // client needs them to mirror the same rules.
                booking.PickupDate,
                booking.ReturnDate,
                booking.TotalPrice,
                PaymentMethod = booking.PaymentMethod.ToString(),
                PaymentStatus = booking.PaymentStatus.ToString(),
                PaymentId = booking.Payment == null ? null : (int?)booking.Payment.Id,
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

    /// <summary>
    /// How early staff may hand equipment over, relative to the booked
    /// pickup time. Change this in one place if the venue's policy differs.
    /// </summary>
    private const int PickupGraceMinutes = 60;

    [HttpPost("{id}/confirm")]
    public async Task<IActionResult> ConfirmBooking(int id)
    {
        var booking = await _context.Bookings.FindAsync(id);

        if (booking == null)
        {
            return NotFound("Booking not found.");
        }

        var expiryDate = booking.BookingType == BookingType.Equipment
            ? booking.ReturnDate
            : booking.EndDate;

        if (expiryDate <= DateTime.Now)
        {
            booking.Status = BookingStatus.Completed;
            await _context.SaveChangesAsync();

            return BadRequest("This booking has already ended and cannot be confirmed.");
        }

        if (booking.Status != BookingStatus.Pending)
        {
            return BadRequest("Only pending bookings can be confirmed.");
        }

        if (booking.PaymentMethod == PaymentMethod.Online && booking.PaymentStatus != PaymentStatus.Paid)
        {
            return BadRequest("Online booking must be paid before confirmation.");
        }

        booking.Status = BookingStatus.Confirmed;

        await _context.SaveChangesAsync();

        return Ok("Booking confirmed.");
    }

    [HttpPost("{id}/pickup")]
    public async Task<IActionResult> MarkPickedUp(int id)
    {
        var booking = await _context.Bookings
            .Include(item => item.Payment)
            .FirstOrDefaultAsync(item => item.Id == id);

        if (booking == null)
        {
            return NotFound("Booking not found.");
        }

        if (booking.RentalStatus != RentalStatus.PendingPickup)
        {
            return BadRequest("Only pending pickup rentals can be picked up.");
        }

        // Cancelling a booking leaves RentalStatus at PendingPickup, and a
        // booking that was never confirmed also sits there. Without this check
        // the gear could be handed over for a reservation the venue has already
        // released or never accepted.
        if (booking.Status != BookingStatus.Confirmed)
        {
            return BadRequest($"Only confirmed bookings can be picked up. This booking is {booking.Status}.");
        }

        // Equipment cannot leave the counter well before the customer is due.
        // A short grace window keeps this workable for customers who arrive
        // early without letting staff hand gear over days in advance.
        var pickupDue = booking.PickupDate ?? booking.StartDate;

        if (DateTime.Now < pickupDue.AddMinutes(-PickupGraceMinutes))
        {
            return BadRequest(
                $"This rental is not due for pickup until {pickupDue:ddd d MMM, h:mm tt}. " +
                $"Pickup opens {PickupGraceMinutes} minutes before that.");
        }

        if (booking.PaymentMethod == PaymentMethod.Online && booking.PaymentStatus != PaymentStatus.Paid)
        {
            return BadRequest("Online booking must be paid before pickup.");
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
        booking.ReturnedAt = DateTime.Now;

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

        // A booking is not "complete" until the time it reserved has passed.
        // Completing early would free the slot while the customer is still
        // entitled to it.
        var endsAt = booking.BookingType == BookingType.Equipment
            ? booking.ReturnDate ?? booking.EndDate
            : booking.EndDate;

        if (DateTime.Now < endsAt)
        {
            return BadRequest(
                $"This booking runs until {endsAt:ddd d MMM, h:mm tt} and cannot be completed before then.");
        }

        // Gear still in the customer's hands means the rental is not finished,
        // whatever the clock says.
        if (booking.BookingType == BookingType.Equipment &&
            booking.RentalStatus != RentalStatus.Returned)
        {
            return BadRequest("Mark the equipment as returned before completing this rental.");
        }

        booking.Status = BookingStatus.Completed;

        await _context.SaveChangesAsync();

        return Ok("Booking completed.");
    }

    private async Task UpdateExpiredBookings(List<SportHub.Api.Models.Booking> bookings)
    {
        // Booking times are stored as local wall clock (see CreateBooking),
        // so they must be compared against local now, not UTC.
        var now = DateTime.Now;
        var changed = false;

        foreach (var booking in bookings)
        {
            if (booking.Status == BookingStatus.Cancelled ||
                booking.Status == BookingStatus.Completed)
            {
                continue;
            }

            var expiryDate = booking.BookingType == BookingType.Equipment
                ? booking.ReturnDate
                : booking.EndDate;

            if (expiryDate <= now)
            {
                booking.Status = BookingStatus.Completed;
                changed = true;
            }
        }

        if (changed)
        {
            await _context.SaveChangesAsync();
        }
    }

    [HttpPost("{id}/cancel")]
    public async Task<IActionResult> CancelBooking(int id)
    {
        var booking = await _context.Bookings
            .Include(item => item.Payment)
            .FirstOrDefaultAsync(item => item.Id == id);

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

        if (booking.Payment != null)
        {
            booking.Payment.Status = booking.Payment.Status == PaymentStatus.Paid
                ? PaymentStatus.Refunded
                : PaymentStatus.Cancelled;
            booking.PaymentStatus = booking.Payment.Status;
            booking.Payment.UpdatedAt = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync();

        return Ok("Booking cancelled.");
    }
}



