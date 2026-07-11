using SportHub.Api.Models.Enums;

namespace SportHub.Api.DTOs.Payments;

public class PaymentDto
{
    public int PaymentId { get; set; }

    public int BookingId { get; set; }

    public decimal Amount { get; set; }

    public string Currency { get; set; } = "EGP";

    public PaymentMethod Method { get; set; }

    public PaymentStatus Status { get; set; }

    public string? ProviderReference { get; set; }

    public string? FailureReason { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public DateTime? PaidAt { get; set; }

    public string? Message { get; set; }
}
