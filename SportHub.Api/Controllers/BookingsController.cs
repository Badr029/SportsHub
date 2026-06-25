using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

using SportHub.Api.Data;
using SportHub.Api.DTOs.Bookings;
using SportHub.Api.Models;
using SportHub.Api.Models.Enums;

namespace SportHub.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class BookingsController : ControllerBase
    {
        private readonly AppDbContext _context;


        public BookingsController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet("my-bookings")]
        public async Task<IActionResult> GetMyBookings()
        {
            var userId = GetUserId();

            var bookings = await _context.Bookings
                .Where(b => b.UserId == userId)
                .Include(b => b.Facility)
                .Include(b => b.BookingEquipment)
                    .ThenInclude(item => item.Equipment)
                .OrderByDescending(b => b.CreatedAt)
                .Select(b => new
                {
                    b.Id,
                    b.BookingType,
                    b.StartDate,
                    b.EndDate,
                    b.Status,
                    b.RentalStatus,
                    b.TotalPrice,
                    Facility = b.Facility == null ? null : new
                    {
                        b.Facility.Id,
                        b.Facility.Name
                    },
                    Equipment = b.BookingEquipment.Select(item => new
                    {
                        item.EquipmentId,
                        item.Equipment!.Name,
                        item.Quantity,
                    })
                })
                .ToListAsync();

            if (bookings.Count == 0)
            {
                return NotFound("No bookings found.");
            }

            return Ok(bookings);
        }
    
        
        [HttpPost]
        public async Task<IActionResult> CreateBooking(CreateBookingDto dto)
        {
            var userId = GetUserId();

            if (dto.EndDate <= dto.StartDate)
            {
                return BadRequest("End date must be greater than start date.");
            }

            if(dto.BookingType is BookingType.Facility or BookingType.Package)
            {
                if(dto.FacilityId == null)
                {
                    return BadRequest("Facility is required.");
                }
                var facilityExists = await _context.Facilities.AnyAsync(f => f.Id == dto.FacilityId);
                if (!facilityExists)
                {
                    return BadRequest("Facility does not exist.");
                }

                var overlapExists = await _context.Bookings.AnyAsync(b =>
                    b.FacilityId == dto.FacilityId &&
                    b.Status != BookingStatus.Cancelled &&
                    dto.StartDate < b.EndDate &&
                    dto.EndDate > b.StartDate);

                if (overlapExists)
                {
                    return BadRequest("Facility is not available at this time.");
                }
                    
            }

            if (dto.BookingType is BookingType.Equipment or BookingType.Package)
                {
                    if (dto.EquipmentItems.Count == 0)
                    {
                        return BadRequest("You must select at least one piece of equipment.");
                    }

                    foreach (var item in dto.EquipmentItems)
                    {
                        var equipment = await _context.Equipment.FirstOrDefaultAsync(e => e.Id == item.EquipmentId);
                        if (equipment == null)
                        {
                            return BadRequest($"Equipment {item.EquipmentId} not found.");
                        }

                        if (item.Quantity <= 0)
                        {
                            return BadRequest("Quantity for equipment must be greater than 0.");
                        }
                        if (item.Quantity > equipment.Quantity)
                        {
                            return BadRequest($"Only {equipment.Quantity} available for {equipment.Name}.");
                        }
                    }
                }
        
            var totalPrice = await CalculateTotalPrice(dto);
            var booking = new Booking
            {
                UserId = userId,
                FacilityId = dto.FacilityId,
                BookingType = dto.BookingType,
                StartDate = dto.StartDate,
                EndDate = dto.EndDate,
                Status = BookingStatus.Pending,
                RentalStatus = dto.BookingType == BookingType.Facility ? null : RentalStatus.PendingPickup,
                TotalPrice = totalPrice,
                PickupDate = dto.PickupDate,
                ReturnDate = dto.ReturnDate,
                BookingEquipment = dto.EquipmentItems.Select(item => new BookingEquipment
                {
                    EquipmentId = item.EquipmentId,
                    Quantity = item.Quantity
                }).ToList()
            };

            _context.Bookings.Add(booking);
            await _context.SaveChangesAsync();


            return Ok(new
            {
                booking.Id,
                BookingType = booking.BookingType.ToString(),
                Status = booking.Status.ToString(),
                RentalStatus = booking.RentalStatus?.ToString(),
                booking.TotalPrice
            });

        }

        [HttpPost ("{id}/cancel")]
        public async Task<IActionResult> CancelBooking(int id)
        {
            var userId = GetUserId();
            var booking = await _context.Bookings.FirstOrDefaultAsync(b => 
                b.Id == id &&
                b.UserId == userId);
            if (booking == null)
            {
                return BadRequest("Booking not found.");
            }
            
            if (booking.Status == BookingStatus.Cancelled)
            {
                return BadRequest("Booking is already cancelled.");
            }

            if (booking.StartDate <= DateTime.UtcNow.AddHours(2))
            {
                return BadRequest("Cannot cancel booking less than 2 hours before start date.");
            }
            booking.Status = BookingStatus.Cancelled;
            await _context.SaveChangesAsync();
            return Ok("Booking cancelled.");

        }

        private int GetUserId()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrWhiteSpace(userId)){ throw new UnauthorizedAccessException("User id Claim missing.");}
            return int.Parse(userId);
        }

        private async Task<decimal> CalculateTotalPrice(CreateBookingDto dto)
        {
            decimal total = 0;
            if (dto.BookingType is BookingType.Facility or BookingType.Package)
            {
                var facility = await _context.Facilities.FirstOrDefaultAsync(f => f.Id == dto.FacilityId);
                if (facility == null)
                {
                    throw new Exception("Facility not found.");
                }
                var hours = (decimal)(dto.EndDate - dto.StartDate).TotalHours;
                total += facility.PricePerHour * hours;
            }

            if (dto.BookingType is BookingType.Equipment or BookingType.Package)
            {
                foreach (var item in dto.EquipmentItems)
                {
                    var equipment = await _context.Equipment.FirstOrDefaultAsync(e => e.Id == item.EquipmentId);
                    if (equipment == null)
                    {
                        throw new Exception($"Equipment {item.EquipmentId} not found.");
                    }
                    total += equipment.RentalPrice * item.Quantity;
                }
            }
            return total;
        }
    }
    
}
