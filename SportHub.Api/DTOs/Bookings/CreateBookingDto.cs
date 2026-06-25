using SportHub.Api.Models.Enums;

namespace SportHub.Api.DTOs.Bookings;

public class CreateBookingDto
{
    public BookingType BookingType { get; set; }

    public int? FacilityId { get; set; }

    public DateTime StartDate { get; set; }

    public DateTime EndDate { get; set; }

    public DateTime? PickupDate { get; set; }

    public DateTime? ReturnDate { get; set; }

    public List<BookingEquipmentItemDto> EquipmentItems { get; set; } = new List<BookingEquipmentItemDto>();
}