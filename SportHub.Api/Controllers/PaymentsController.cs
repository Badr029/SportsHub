using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SportHub.Api.Data;
using SportHub.Api.DTOs.Payments;
using SportHub.Api.Models;
using SportHub.Api.Models.Enums;

namespace SportHub.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class PaymentsController : ControllerBase
{
    private readonly AppDbContext _context;

    public PaymentsController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet("{paymentId:int}")]
    public async Task<IActionResult> GetPayment(int paymentId)
    {
        var payment = await _context.Payments
            .AsNoTracking()
            .Include(item => item.Booking)
            .FirstOrDefaultAsync(item => item.Id == paymentId);

        if (payment == null)
        {
            return NotFound("Payment not found.");
        }

        if (payment.Booking.UserId != GetUserId())
        {
            return Forbid();
        }

        return Ok(ToDto(payment));
    }

    [HttpPost("{paymentId:int}/mock-pay")]
    public async Task<IActionResult> MockPay(int paymentId)
    {
        var userId = GetUserId();
        var idempotencyKey = GetIdempotencyKey();

        if (idempotencyKey == null)
        {
            return BadRequest("A valid Idempotency-Key header is required.");
        }

        var payment = await FindPayment(paymentId);

        if (payment == null)
        {
            return NotFound("Payment not found.");
        }

        var accessError = ValidateAccess(payment);

        if (accessError != null)
        {
            return accessError;
        }

        if (payment.Status == PaymentStatus.Paid)
        {
            return payment.IdempotencyKey == idempotencyKey
                ? Ok(ToDto(payment, "Payment completed successfully."))
                : BadRequest("This booking is already paid.");
        }

        if (payment.Status == PaymentStatus.Processing)
        {
            return Conflict("Payment is already processing.");
        }

        if (payment.IdempotencyKey == idempotencyKey && payment.Status == PaymentStatus.Failed)
        {
            return Ok(ToDto(payment, payment.FailureReason ?? "Payment failed."));
        }

        await using var transaction = await _context.Database.BeginTransactionAsync();

        try
        {
            var now = DateTime.UtcNow;
            var claimed = await _context.Payments
                .Where(item =>
                    item.Id == paymentId &&
                    item.Booking.UserId == userId &&
                    item.Booking.Status != BookingStatus.Cancelled &&
                    item.Booking.Status != BookingStatus.Completed &&
                    item.Status != PaymentStatus.Paid &&
                    item.Status != PaymentStatus.Processing)
                .ExecuteUpdateAsync(setters => setters
                    .SetProperty(item => item.Status, PaymentStatus.Processing)
                    .SetProperty(item => item.IdempotencyKey, idempotencyKey)
                    .SetProperty(item => item.UpdatedAt, now)
                    .SetProperty(item => item.FailureReason, (string?)null)
                    .SetProperty(item => item.FailedAt, (DateTime?)null));

            if (claimed == 0)
            {
                return await PaymentConflictResult(paymentId, idempotencyKey);
            }

            _context.ChangeTracker.Clear();
            payment = await FindPayment(paymentId, tracking: true);

            if (payment == null)
            {
                return NotFound("Payment not found.");
            }

            payment.Status = PaymentStatus.Paid;
            payment.ProviderReference = $"MOCK-{Guid.NewGuid():N}";
            payment.PaidAt = DateTime.UtcNow;
            payment.UpdatedAt = payment.PaidAt;
            payment.Booking.PaymentStatus = PaymentStatus.Paid;

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            return Ok(ToDto(payment, "Payment completed successfully."));
        }
        catch (DbUpdateException)
        {
            await transaction.RollbackAsync();
            return Conflict("This idempotency key has already been used.");
        }
    }

    [HttpPost("{paymentId:int}/mock-fail")]
    public async Task<IActionResult> MockFail(int paymentId)
    {
        var userId = GetUserId();
        var idempotencyKey = GetIdempotencyKey();

        if (idempotencyKey == null)
        {
            return BadRequest("A valid Idempotency-Key header is required.");
        }

        var payment = await FindPayment(paymentId);

        if (payment == null)
        {
            return NotFound("Payment not found.");
        }

        var accessError = ValidateAccess(payment);

        if (accessError != null)
        {
            return accessError;
        }

        if (payment.Status == PaymentStatus.Paid)
        {
            return BadRequest("A paid payment cannot fail.");
        }

        if (payment.Status == PaymentStatus.Processing)
        {
            return Conflict("Payment is already processing.");
        }

        if (payment.IdempotencyKey == idempotencyKey && payment.Status == PaymentStatus.Failed)
        {
            return Ok(ToDto(payment, payment.FailureReason ?? "Mock payment failed."));
        }

        await using var transaction = await _context.Database.BeginTransactionAsync();

        try
        {
            var now = DateTime.UtcNow;
            var claimed = await _context.Payments
                .Where(item =>
                    item.Id == paymentId &&
                    item.Booking.UserId == userId &&
                    item.Booking.Status != BookingStatus.Cancelled &&
                    item.Booking.Status != BookingStatus.Completed &&
                    item.Status != PaymentStatus.Paid &&
                    item.Status != PaymentStatus.Processing)
                .ExecuteUpdateAsync(setters => setters
                    .SetProperty(item => item.Status, PaymentStatus.Processing)
                    .SetProperty(item => item.IdempotencyKey, idempotencyKey)
                    .SetProperty(item => item.UpdatedAt, now));

            if (claimed == 0)
            {
                return await PaymentConflictResult(paymentId, idempotencyKey);
            }

            _context.ChangeTracker.Clear();
            payment = await FindPayment(paymentId, tracking: true);

            if (payment == null)
            {
                return NotFound("Payment not found.");
            }

            payment.Status = PaymentStatus.Failed;
            payment.FailureReason = "Mock payment failed.";
            payment.FailedAt = DateTime.UtcNow;
            payment.UpdatedAt = payment.FailedAt;
            payment.Booking.PaymentStatus = PaymentStatus.Failed;

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            return Ok(ToDto(payment, payment.FailureReason));
        }
        catch (DbUpdateException)
        {
            await transaction.RollbackAsync();
            return Conflict("This idempotency key has already been used.");
        }
    }

    [HttpPost("{paymentId:int}/cancel")]
    public async Task<IActionResult> CancelPayment(int paymentId)
    {
        var payment = await FindPayment(paymentId, tracking: true);

        if (payment == null)
        {
            return NotFound("Payment not found.");
        }

        var accessError = ValidateAccess(payment);

        if (accessError != null)
        {
            return accessError;
        }

        if (payment.Status == PaymentStatus.Paid)
        {
            return BadRequest("Paid payments cannot be cancelled.");
        }

        if (payment.Status == PaymentStatus.Processing)
        {
            return Conflict("Payment is already processing.");
        }

        payment.Status = PaymentStatus.Cancelled;
        payment.UpdatedAt = DateTime.UtcNow;
        payment.Booking.PaymentStatus = PaymentStatus.Cancelled;

        await _context.SaveChangesAsync();

        return Ok(ToDto(payment, "Payment cancelled. You can retry payment while the booking is active."));
    }

    private async Task<Payment?> FindPayment(int paymentId, bool tracking = false)
    {
        var query = _context.Payments.Include(item => item.Booking).AsQueryable();

        if (!tracking)
        {
            query = query.AsNoTracking();
        }

        return await query.FirstOrDefaultAsync(item => item.Id == paymentId);
    }

    private IActionResult? ValidateAccess(Payment payment)
    {
        if (payment.Booking.UserId != GetUserId())
        {
            return Forbid();
        }

        if (payment.Method != PaymentMethod.Online)
        {
            return BadRequest("This booking does not use online payment.");
        }

        if (payment.Booking.Status is BookingStatus.Cancelled or BookingStatus.Completed)
        {
            return BadRequest("This booking is no longer payable.");
        }

        return null;
    }

    private async Task<IActionResult> PaymentConflictResult(int paymentId, string idempotencyKey)
    {
        var current = await FindPayment(paymentId);

        if (current == null)
        {
            return NotFound("Payment not found.");
        }

        if (current.Status == PaymentStatus.Paid && current.IdempotencyKey == idempotencyKey)
        {
            return Ok(ToDto(current, "Payment completed successfully."));
        }

        if (current.Status == PaymentStatus.Paid)
        {
            return BadRequest("This booking is already paid.");
        }

        return Conflict("Payment is already processing.");
    }

    private string? GetIdempotencyKey()
    {
        var key = Request.Headers["Idempotency-Key"].ToString().Trim();
        return string.IsNullOrWhiteSpace(key) || key.Length > 64 ? null : key;
    }

    private int GetUserId()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return int.TryParse(userId, out var parsedUserId)
            ? parsedUserId
            : throw new UnauthorizedAccessException("User id claim is missing.");
    }

    private static PaymentDto ToDto(Payment payment, string? message = null)
    {
        return new PaymentDto
        {
            PaymentId = payment.Id,
            BookingId = payment.BookingId,
            Amount = payment.Amount,
            Currency = payment.Currency,
            Method = payment.Method,
            Status = payment.Status,
            ProviderReference = payment.ProviderReference,
            FailureReason = payment.FailureReason,
            CreatedAt = payment.CreatedAt,
            UpdatedAt = payment.UpdatedAt,
            PaidAt = payment.PaidAt,
            Message = message
        };
    }
}
