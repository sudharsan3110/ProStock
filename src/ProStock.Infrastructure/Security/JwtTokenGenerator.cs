using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using ProStock.Application.Interfaces.Security;
using ProStock.Domain.Entities;

namespace ProStock.Infrastructure.Security;

public class JwtTokenGenerator : IJwtTokenGenerator
{
    private readonly IConfiguration _configuration;

    public JwtTokenGenerator(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    public (string Token, DateTime ExpiresAt) GenerateToken(User user)
    {
        var secret = _configuration["PROSTOCK_JWT_SECRET"] 
            ?? _configuration["Jwt:Secret"] 
            ?? "ProStock_Super_Secure_Institutional_JWT_Secret_Key_2026_AtLeast32BytesLong!";
        var issuer = _configuration["PROSTOCK_JWT_ISSUER"] ?? _configuration["Jwt:Issuer"] ?? "ProStockServer";
        var audience = _configuration["PROSTOCK_JWT_AUDIENCE"] ?? _configuration["Jwt:Audience"] ?? "ProStockClient";
        var expiryMinutesStr = _configuration["PROSTOCK_JWT_EXPIRY_MINUTES"] ?? _configuration["Jwt:ExpiryMinutes"] ?? "60";
        var expiryMinutes = int.TryParse(expiryMinutesStr, out var m) ? m : 60;

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new Claim(JwtRegisteredClaimNames.Email, user.Email),
            new Claim(ClaimTypes.Role, user.Role.ToString()),
            new Claim("fullName", user.FullName),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };

        var expiresAt = DateTime.UtcNow.AddMinutes(expiryMinutes);

        var token = new JwtSecurityToken(
            issuer: issuer,
            audience: audience,
            claims: claims,
            expires: expiresAt,
            signingCredentials: credentials
        );

        return (new JwtSecurityTokenHandler().WriteToken(token), expiresAt);
    }

    public string GenerateRefreshToken()
    {
        var randomBytes = new byte[64];
        using var rng = RandomNumberGenerator.Create();
        rng.GetBytes(randomBytes);
        return Convert.ToBase64String(randomBytes);
    }
}
