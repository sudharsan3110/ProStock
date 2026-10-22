using Microsoft.EntityFrameworkCore;
using ProStock.Application.DTOs;
using ProStock.Application.Interfaces;
using ProStock.Application.Interfaces.Security;
using ProStock.Domain.Entities;
using ProStock.Domain.Enums;

namespace ProStock.Infrastructure.Services;

public class AuthService : IAuthService
{
    private readonly IApplicationDbContext _context;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IJwtTokenGenerator _jwtTokenGenerator;

    public AuthService(
        IApplicationDbContext context,
        IPasswordHasher passwordHasher,
        IJwtTokenGenerator jwtTokenGenerator)
    {
        _context = context;
        _passwordHasher = passwordHasher;
        _jwtTokenGenerator = jwtTokenGenerator;
    }

    public async Task<AuthResponseDto> RegisterAsync(RegisterRequest request, CancellationToken ct = default)
    {
        var existingUser = await _context.Users.FirstOrDefaultAsync(u => u.Email.ToLower() == request.Email.ToLower(), ct);
        if (existingUser != null)
        {
            throw new InvalidOperationException($"User with email '{request.Email}' already exists.");
        }

        var (hash, salt) = _passwordHasher.HashPassword(request.Password);

        var user = new User
        {
            Email = request.Email.Trim().ToLower(),
            PasswordHash = hash,
            Salt = salt,
            FullName = request.FullName.Trim(),
            Role = request.Role,
            CreatedAt = DateTime.UtcNow,
            IsActive = true
        };

        // Create default paper trading account for user
        var paperAccount = new PaperAccount
        {
            UserId = user.Id,
            AccountNumber = $"PRO-{new Random().Next(10000, 99999)}",
            Currency = "INR",
            TotalEquity = 1000000m,
            CashBalance = 1000000m
        };

        user.PaperAccounts.Add(paperAccount);

        _context.Users.Add(user);
        await _context.SaveChangesAsync(ct);

        var (jwtToken, expiresAt) = _jwtTokenGenerator.GenerateToken(user);
        var rawRefreshToken = _jwtTokenGenerator.GenerateRefreshToken();

        var refreshToken = new RefreshToken
        {
            UserId = user.Id,
            Token = rawRefreshToken,
            ExpiresAt = DateTime.UtcNow.AddDays(7),
            CreatedAt = DateTime.UtcNow
        };

        _context.RefreshTokens.Add(refreshToken);
        await _context.SaveChangesAsync(ct);

        return new AuthResponseDto(
            jwtToken,
            rawRefreshToken,
            expiresAt,
            new UserDto(user.Id, user.Email, user.FullName, user.Role, user.CreatedAt)
        );
    }

    public async Task<AuthResponseDto> LoginAsync(LoginRequest request, CancellationToken ct = default)
    {
        var user = await _context.Users
            .Include(u => u.RefreshTokens)
            .FirstOrDefaultAsync(u => u.Email.ToLower() == request.Email.ToLower(), ct);

        if (user == null || !user.IsActive)
        {
            throw new UnauthorizedAccessException("Invalid email or password.");
        }

        var validPassword = _passwordHasher.VerifyPassword(request.Password, user.PasswordHash, user.Salt);
        if (!validPassword)
        {
            throw new UnauthorizedAccessException("Invalid email or password.");
        }

        user.LastLoginAt = DateTime.UtcNow;

        var (jwtToken, expiresAt) = _jwtTokenGenerator.GenerateToken(user);
        var rawRefreshToken = _jwtTokenGenerator.GenerateRefreshToken();

        var refreshToken = new RefreshToken
        {
            UserId = user.Id,
            Token = rawRefreshToken,
            ExpiresAt = DateTime.UtcNow.AddDays(7),
            CreatedAt = DateTime.UtcNow
        };

        _context.RefreshTokens.Add(refreshToken);
        await _context.SaveChangesAsync(ct);

        return new AuthResponseDto(
            jwtToken,
            rawRefreshToken,
            expiresAt,
            new UserDto(user.Id, user.Email, user.FullName, user.Role, user.CreatedAt)
        );
    }

    public async Task<AuthResponseDto> RefreshTokenAsync(string refreshToken, CancellationToken ct = default)
    {
        var storedToken = await _context.RefreshTokens
            .Include(rt => rt.User)
            .FirstOrDefaultAsync(rt => rt.Token == refreshToken, ct);

        if (storedToken == null || !storedToken.IsActive || storedToken.User == null)
        {
            throw new UnauthorizedAccessException("Invalid or expired refresh token.");
        }

        // Revoke the old token (token rotation)
        storedToken.RevokedAt = DateTime.UtcNow;

        var (jwtToken, expiresAt) = _jwtTokenGenerator.GenerateToken(storedToken.User);
        var newRefreshToken = _jwtTokenGenerator.GenerateRefreshToken();

        var newStoredToken = new RefreshToken
        {
            UserId = storedToken.User.Id,
            Token = newRefreshToken,
            ExpiresAt = DateTime.UtcNow.AddDays(7),
            CreatedAt = DateTime.UtcNow
        };

        _context.RefreshTokens.Add(newStoredToken);
        await _context.SaveChangesAsync(ct);

        return new AuthResponseDto(
            jwtToken,
            newRefreshToken,
            expiresAt,
            new UserDto(storedToken.User.Id, storedToken.User.Email, storedToken.User.FullName, storedToken.User.Role, storedToken.User.CreatedAt)
        );
    }

    public async Task<bool> RevokeTokenAsync(string refreshToken, CancellationToken ct = default)
    {
        var storedToken = await _context.RefreshTokens.FirstOrDefaultAsync(rt => rt.Token == refreshToken, ct);
        if (storedToken == null || !storedToken.IsActive)
        {
            return false;
        }

        storedToken.RevokedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(ct);
        return true;
    }

    public async Task<UserDto?> GetUserByIdAsync(Guid userId, CancellationToken ct = default)
    {
        var user = await _context.Users.FindAsync(new object[] { userId }, ct);
        if (user == null) return null;
        return new UserDto(user.Id, user.Email, user.FullName, user.Role, user.CreatedAt);
    }
}
