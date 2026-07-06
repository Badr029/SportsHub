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

            var bookingsToUpdate = await _context.Bookings
                .Where(b => b.UserId == userId && !b.HiddenFromCustomer)
                .ToListAsync();

            await UpdateExpiredBookings(bookingsToUpdate);

            var bookings = await _context.Bookings
                .Where(b => b.UserId == userId && !b.HiddenFromCustomer)
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
                    b.PickupDate,
                    b.ReturnDate,
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

        [HttpGet("facility-availability")]
        [AllowAnonymous]
        public async Task<IActionResult> GetFacilityAvailability(int facilityId, DateTime date, int durationMinutes = 30)
        {
            if (durationMinutes <= 0 || durationMinutes > 360)
            {
                return BadRequest("Duration must be between 30 minutes and 6 hours.");
            }

            var facility = await _context.Facilities.FirstOrDefaultAsync(facility => facility.Id == facilityId);

            if (facility == null)
            {
                return NotFound("Facility not found.");
            }

            if (facility.IsOutOfService)
            {
                return BadRequest("Facility is currently out of service.");
            }

            var dayStart = date.Date;
            var dayEnd = dayStart.AddDays(1);

            var existingBookings = await _context.Bookings
                .Where(booking =>
                    booking.FacilityId == facilityId &&
                    booking.Status != BookingStatus.Cancelled &&
                    booking.StartDate < dayEnd &&
                    booking.EndDate > dayStart)
                .Select(booking => new
                {
                    booking.StartDate,
                    booking.EndDate
                })
                .ToListAsync();

            var slots = new List<FacilityAvailabilitySlotDto>();

            for (var time = TimeSpan.FromHours(8); time <= TimeSpan.FromHours(22); time += TimeSpan.FromMinutes(30))
            {
                var slotStart = dayStart.Add(time);
                var slotEnd = slotStart.AddMinutes(durationMinutes);

                var overlaps = existingBookings.Any(booking =>
                    slotStart < booking.EndDate &&
                    slotEnd > booking.StartDate);

                slots.Add(new FacilityAvailabilitySlotDto
                {
                    Time = slotStart.ToString("HH:mm"),
                    Label = slotStart.ToString("h:mm tt"),
                    Available = !overlaps
                });
            }

            return Ok(slots);
        }
    
        
        [HttpPost]
        public async Task<IActionResult> CreateBooking(CreateBookingDto dto)
        {
            var userId = GetUserId();

            if (dto.BookingType is BookingType.Facility or BookingType.Package)
            {
                if (dto.EndDate <= dto.StartDate)
                {
                    return BadRequest("End date must be greater than start date.");
                }

                var durationHours = (dto.EndDate - dto.StartDate).TotalHours;

                if (durationHours <= 0 || durationHours > 6)
                {
                    return BadRequest("Booking duration must be between 1 and 6 hours.");
                }
            }

            if (dto.BookingType == BookingType.Equipment)
            {
                if (dto.PickupDate == null)
                {
                    return BadRequest("Pickup date is required for equipment rental.");
                }

                dto.StartDate = dto.PickupDate.Value.Date;
                dto.EndDate = dto.PickupDate.Value.Date.AddDays(1);
                dto.ReturnDate = dto.PickupDate.Value.Date.AddDays(1);
            }

            if (dto.BookingType == BookingType.Package)
            {
                dto.PickupDate = dto.StartDate;
                dto.ReturnDate = dto.EndDate;
            }

            if(dto.BookingType is BookingType.Facility or BookingType.Package)
            {
                if(dto.FacilityId == null)
                {
                    return BadRequest("Facility is required.");
                }
                var facility = await _context.Facilities.FirstOrDefaultAsync(f => f.Id == dto.FacilityId);
                if (facility == null)
                {
                    return BadRequest("Facility does not exist.");
                }

                if (facility.IsOutOfService)
                {
                    return BadRequest("Facility is currently out of service.");
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

                    if (dto.EquipmentItems.Any(item => item.Quantity <= 0))
                    {
                        return BadRequest("Quantity for equipment must be greater than 0.");
                    }

                    var requestedEquipmentItems = dto.EquipmentItems
                        .GroupBy(item => item.EquipmentId)
                        .Select(group => new
                        {
                            EquipmentId = group.Key,
                            Quantity = group.Sum(item => item.Quantity)
                        });

                    foreach (var item in requestedEquipmentItems)
                    {
                        var equipment = await _context.Equipment.FirstOrDefaultAsync(e => e.Id == item.EquipmentId);
                        if (equipment == null)
                        {
                            return BadRequest($"Equipment {item.EquipmentId} not found.");
                        }
                        var reservedQuantity = await GetReservedEquipmentQuantity(
                            item.EquipmentId,
                            dto.StartDate,
                            dto.EndDate);

                        var availableQuantity = equipment.Quantity - reservedQuantity;

                        if (item.Quantity > availableQuantity)
                        {
                            return BadRequest($"Only {availableQuantity} available for {equipment.Name} during this time.");
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

        [HttpGet("equipment-availability")]
        [AllowAnonymous]
        public async Task<IActionResult> GetEquipmentAvailability(
            int equipmentId,
            DateTime startDate,
            DateTime endDate)
        {
            if (endDate <= startDate)
            {
                return BadRequest("End date must be greater than start date.");
            }

            var equipment = await _context.Equipment.FirstOrDefaultAsync(e => e.Id == equipmentId);

            if (equipment == null)
            {
                return NotFound("Equipment not found.");
            }

            var reservedQuantity = await GetReservedEquipmentQuantity(
                equipmentId,
                startDate,
                endDate);

            var availableQuantity = equipment.Quantity - reservedQuantity;

            return Ok(new EquipmentAvailabilityDto
            {
                EquipmentId = equipment.Id,
                TotalQuantity = equipment.Quantity,
                ReservedQuantity = reservedQuantity,
                AvailableQuantity = availableQuantity
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

            var expiryDate = booking.BookingType == BookingType.Equipment
                ? booking.ReturnDate
                : booking.EndDate;

            if (expiryDate <= DateTime.UtcNow)
            {
                booking.Status = BookingStatus.Completed;
                await _context.SaveChangesAsync();

                return BadRequest("This booking has already ended.");
            }

            if (booking.StartDate <= DateTime.UtcNow.AddHours(2))
            {
                return BadRequest("Cannot cancel booking less than 2 hours before start date.");
            }
            booking.Status = BookingStatus.Cancelled;
            await _context.SaveChangesAsync();
            return Ok("Booking cancelled.");

        }

        [HttpPost("{id}/clear")]
        public async Task<IActionResult> ClearBooking(int id)
        {
            var userId = GetUserId();

            var booking = await _context.Bookings.FirstOrDefaultAsync(b =>
                b.Id == id &&
                b.UserId == userId);

            if (booking == null)
            {
                return BadRequest("Booking not found.");
            }

            var clearDate = booking.BookingType == BookingType.Equipment
                ? booking.ReturnDate
                : booking.EndDate;

            var canClear =
                booking.Status == BookingStatus.Cancelled ||
                booking.Status == BookingStatus.Completed;

            if (!canClear)
            {
                return BadRequest("This booking cannot be cleared yet.");
            }

            booking.HiddenFromCustomer = true;
            await _context.SaveChangesAsync();

            return Ok("Booking cleared.");
        }

        private int GetUserId()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrWhiteSpace(userId)){ throw new UnauthorizedAccessException("User id Claim missing.");}
            return int.Parse(userId);
        }

        private async Task<int> GetReservedEquipmentQuantity(
                int equipmentId,
                DateTime startDate,
                DateTime endDate)
            {
                return await _context.BookingEquipment
                    .Where(item =>
                        item.EquipmentId == equipmentId &&
                        item.Booking!.Status != BookingStatus.Cancelled &&
                        item.Booking.StartDate < endDate &&
                        item.Booking.EndDate > startDate)
                    .SumAsync(item => item.Quantity);
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
                    if (dto.BookingType == BookingType.Equipment)
                    {
                        total += equipment.DailyRentalPrice * item.Quantity;
                    }

                    if (dto.BookingType == BookingType.Package)
                    {
                        var hours = (decimal)(dto.EndDate - dto.StartDate).TotalHours;
                        total += equipment.PackageHourlyPrice * item.Quantity * hours;
                    }
                }
            }
            return total;
        }

        private async Task UpdateExpiredBookings(List<Booking> bookings)
        {
            var now = DateTime.UtcNow;
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
    }
    

    

}


