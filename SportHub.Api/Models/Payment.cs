using SportHub.Api.Models.Enums;

namespace SportHub.Api.Models;

public class Payment
{
    public int Id { get; set; }

    public int BookingId { get; set; }

    public Booking Booking { get; set; } = null!;

    public decimal Amount { get; set; }

    public string Currency { get; set; } = "EGP";

    public PaymentMethod Method { get; set; }

    public PaymentStatus Status { get; set; }

    public string Provider { get; set; } = "Mock";

    public string? ProviderReference { get; set; }

    public string? IdempotencyKey { get; set; }

    public string? FailureReason { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? UpdatedAt { get; set; }

    public DateTime? PaidAt { get; set; }

    public DateTime? FailedAt { get; set; }
}
