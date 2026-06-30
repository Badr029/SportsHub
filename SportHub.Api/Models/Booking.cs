using SportHub.Api.Models.Enums;

namespace SportHub.Api.Models;

public class Booking
{
    public int Id { get; set; }

    public int UserId { get; set; }

    public User? User { get; set; }

    public int? FacilityId { get; set; }

    public Facility? Facility { get; set; }

    public BookingType BookingType { get; set; }

    public DateTime StartDate { get; set; }

    public DateTime EndDate { get; set; }

    public BookingStatus Status { get; set; } = BookingStatus.Pending;

    public RentalStatus? RentalStatus { get; set; }

    public decimal TotalPrice { get; set; }

    public DateTime? PickupDate { get; set; }

    public DateTime? ReturnDate { get; set; }

    public DateTime? ReturnedAt { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public bool HiddenFromCustomer { get; set; }

    public ICollection<BookingEquipment> BookingEquipment { get; set; } = new List<BookingEquipment>();
}
