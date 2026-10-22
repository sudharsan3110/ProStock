using Microsoft.Extensions.Configuration;
using ProStock.Domain.Entities;
using ProStock.Domain.Enums;
using ProStock.Infrastructure.Security;
using Xunit;

namespace ProStock.UnitTests;

public class AuthSecurityTests
{
    private readonly PasswordHasher _hasher = new();

    [Fact]
    public void HashPassword_ShouldVerifyCorrectly_AndRejectWrongPassword()
    {
        string rawPassword = "StrongTradingPassword2026!";
        var (hash, salt) = _hasher.HashPassword(rawPassword);

        Assert.NotEmpty(hash);
        Assert.NotEmpty(salt);

        bool isValid = _hasher.VerifyPassword(rawPassword, hash, salt);
        Assert.True(isValid, "Correct password must verify successfully");

        bool isInvalid = _hasher.VerifyPassword("WrongPassword123!", hash, salt);
        Assert.False(isInvalid, "Wrong password must be rejected");
    }

    [Fact]
    public void JwtTokenGenerator_ShouldGenerateValidTokens()
    {
        var inMemorySettings = new Dictionary<string, string?>
        {
            { "PROSTOCK_JWT_SECRET", "A_Very_Long_Institutional_Security_Key_With_256_Bits_Minimum!" },
            { "PROSTOCK_JWT_ISSUER", "ProStockTest" },
            { "PROSTOCK_JWT_AUDIENCE", "ProStockTestClient" },
            { "PROSTOCK_JWT_EXPIRY_MINUTES", "30" }
        };

        IConfiguration config = new ConfigurationBuilder()
            .AddInMemoryCollection(inMemorySettings)
            .Build();

        var generator = new JwtTokenGenerator(config);
        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = "trader@prostock.local",
            FullName = "Jane Trader",
            Role = UserRole.Trader
        };

        var (token, expiresAt) = generator.GenerateToken(user);
        Assert.NotEmpty(token);
        Assert.True(expiresAt > DateTime.UtcNow);

        var refreshToken = generator.GenerateRefreshToken();
        Assert.NotEmpty(refreshToken);
    }
}
