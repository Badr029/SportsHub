using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SportHub.Api.Data;
using SportHub.Api.DTOs.Auth;
using SportHub.Api.Models;
using SportHub.Api.Models.Enums;
using SportHub.Api.Services;
using Microsoft.AspNetCore.Authorization;

namespace SportHub.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly JwtService _jwtService;

    public AuthController(AppDbContext context, JwtService jwtService)
    {
        _context = context;
        _jwtService = jwtService;
    }

    [HttpPost("register")]
    public async Task<ActionResult<AuthResponseDto>> Register(RegisterDto dto) 
    {
        var emailExists = await _context.Users.AnyAsync(user => user.Email == dto.Email);
        var phoneExists = await _context.Users.AnyAsync(user => user.PhoneNumber == dto.PhoneNumber);
        if (string.IsNullOrWhiteSpace(dto.Name))
        {
            return BadRequest("Name is required.");
        }

        if (string.IsNullOrWhiteSpace(dto.Email))
        {
            return BadRequest("Email is required.");
        }

        if (string.IsNullOrWhiteSpace(dto.Password))
        {
            return BadRequest("Password is required.");
        }

        var passwordError = ValidatePassword(dto.Password);

        if (passwordError != null)
        {
            return BadRequest(passwordError);
        }    

        if (string.IsNullOrWhiteSpace(dto.PhoneNumber))
        {
            return BadRequest("Phone number is required.");
        }

        if (emailExists)
        {
            return BadRequest("Email already exists.");
        }
        if (phoneExists)
        {
            return BadRequest("An Email with this Phone number already exists.");
        }

        var user = new User
        {
            Name = dto.Name,
            Email = dto.Email,
            PhoneNumber = dto.PhoneNumber,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
            Role = UserRole.Customer
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync();
        var token = _jwtService.CreateToken(user);

        return Ok(new AuthResponseDto 
        { 
            Id = user.Id,
            Name = user.Name,
            Email = user.Email,
            Role = user.Role,
            Token = token 
        });
    }

    [HttpPost("login")]
    public async Task<ActionResult<AuthResponseDto>> Login(LoginDto dto)
    {
        var user = await _context.Users.FirstOrDefaultAsync(user => user.Email == dto.Email);

        if (string.IsNullOrWhiteSpace(dto.Email))
        {
            return BadRequest("Please enter your email.");
        }

        if (string.IsNullOrWhiteSpace(dto.Password))
        {
            return BadRequest("Please enter your password.");
        }

        if (user == null)
        {
            return Unauthorized("Invalid email or password.");
        }
        
        var passwordValid = BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash);
        if(!passwordValid)
        {
            return Unauthorized("Invalid email or password.");
        }

        var token = _jwtService.CreateToken(user);

        return Ok(new AuthResponseDto 
        { 
            Id = user.Id,
            Name = user.Name,
            Email = user.Email,
            Role = user.Role ,
            Token = token 
        });
    }

    [HttpDelete("test-users/{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> DeleteTestUser(
        int id,
        [FromServices] IWebHostEnvironment environment)
    {
        if (!environment.IsDevelopment())
        {
            return NotFound();
        }

        var user = await _context.Users.FindAsync(id);

        if (user == null)
        {
            return NotFound("User not found.");
        }

        if (user.Role == UserRole.Admin)
        {
            return BadRequest("Admin accounts cannot be deleted.");
        }

        var bookingIds = await _context.Bookings
            .Where(booking => booking.UserId == id)
            .Select(booking => booking.Id)
            .ToListAsync();

        await using var transaction = await _context.Database.BeginTransactionAsync();

        await _context.Payments
            .Where(payment => bookingIds.Contains(payment.BookingId))
            .ExecuteDeleteAsync();

        await _context.BookingEquipment
            .Where(item => bookingIds.Contains(item.BookingId))
            .ExecuteDeleteAsync();

        await _context.Bookings
            .Where(booking => booking.UserId == id)
            .ExecuteDeleteAsync();

        await _context.Users
            .Where(item => item.Id == id)
            .ExecuteDeleteAsync();

        await transaction.CommitAsync();

        return Ok(new
        {
            Message = "Test user and related test data deleted.",
            DeletedUserId = id,
            DeletedBookings = bookingIds.Count
        });
    }


    private static string? ValidatePassword(string password)
    {
        if (string.IsNullOrWhiteSpace(password))
        {
            return "Password is required";
        }

        if (password.Length < 8)
        {
            return "Password must be at least 8 characters";
        }

        if (!password.Any(char.IsUpper))
        {
            return "Password must contain at least one uppercase letter";
        }

        if (!password.Any(char.IsLower))
        {
            return "Password must contain at least one lowercase letter";
        }

        if (!password.Any(char.IsDigit))
        {
            return "Password must contain at least one number";
        }

        if (!password.Any(ch => !char.IsLetterOrDigit(ch)))
        {
            return "Password must contain at least one special character";
        }

        return null;
    }
}