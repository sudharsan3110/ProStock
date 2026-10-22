using ProStock.Domain.Entities;
using ProStock.Domain.Enums;

namespace ProStock.Application.DTOs;

public record RegisterRequest(string Email, string Password, string FullName, UserRole Role = UserRole.Trader);

public record LoginRequest(string Email, string Password);

public record RefreshTokenRequest(string Token);

public record UserDto(Guid Id, string Email, string FullName, UserRole Role, DateTime CreatedAt);

public record AuthResponseDto(
    string Token,
    string RefreshToken,
    DateTime ExpiresAt,
    UserDto User
);

public record ChangePasswordRequest(string CurrentPassword, string NewPassword);
