using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using ProStock.Api.BackgroundServices;
using ProStock.Api.Hubs;
using ProStock.Application.Interfaces.Security;
using ProStock.Infrastructure;
using ProStock.Infrastructure.Persistence;

// 1. Load Root .env file if present
var rootEnvPath = Path.Combine(Directory.GetCurrentDirectory(), "..", "..", ".env");
if (!File.Exists(rootEnvPath))
{
    rootEnvPath = Path.Combine(Directory.GetCurrentDirectory(), ".env");
}
if (File.Exists(rootEnvPath))
{
    foreach (var line in File.ReadAllLines(rootEnvPath))
    {
        var trimmed = line.Trim();
        if (string.IsNullOrEmpty(trimmed) || trimmed.StartsWith('#')) continue;
        var parts = trimmed.Split('=', 2);
        if (parts.Length == 2)
        {
            var key = parts[0].Trim();
            var val = parts[1].Trim().Trim('"').Trim('\'');
            Environment.SetEnvironmentVariable(key, val);
        }
    }
}

var builder = WebApplication.CreateBuilder(args);

// 2. Add Infrastructure Services (Database, Auth, Engines)
builder.Services.AddInfrastructureServices(builder.Configuration);

// 3. Configure JWT Authentication & Authorization
var jwtSecret = builder.Configuration["PROSTOCK_JWT_SECRET"] 
    ?? "ProStock_Super_Secure_Institutional_JWT_Secret_Key_2026_AtLeast32BytesLong!";
var jwtIssuer = builder.Configuration["PROSTOCK_JWT_ISSUER"] ?? "ProStockServer";
var jwtAudience = builder.Configuration["PROSTOCK_JWT_AUDIENCE"] ?? "ProStockClient";

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.RequireHttpsMetadata = false;
    options.SaveToken = true;
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret)),
        ValidateIssuer = true,
        ValidIssuer = jwtIssuer,
        ValidateAudience = true,
        ValidAudience = jwtAudience,
        ValidateLifetime = true,
        ClockSkew = TimeSpan.Zero
    };

    // Support JWT tokens over SignalR WebSocket queries
    options.Events = new JwtBearerEvents
    {
        OnMessageReceived = context =>
        {
            var accessToken = context.Request.Query["access_token"];
            var path = context.HttpContext.Request.Path;
            if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/hubs"))
            {
                context.Token = accessToken;
            }
            return Task.CompletedTask;
        }
    };
});

builder.Services.AddAuthorization();

// 4. SignalR & Background Workers
builder.Services.AddSignalR();
builder.Services.AddHostedService<MarketSimulationWorker>();

// 5. Controllers & JSON Options
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
    });

// 6. CORS for Web Frontend
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowProStockFrontend", policy =>
    {
        policy.WithOrigins("http://localhost:3000", "http://localhost:5173", "http://127.0.0.1:3000")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

// 7. Native OpenAPI
builder.Services.AddOpenApi();

var app = builder.Build();

// 8. Auto-migrate and Seed Database
using (var scope = app.Services.CreateScope())
{
    var context = scope.ServiceProvider.GetRequiredService<ProStockDbContext>();
    var hasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher>();
    await DatabaseSeeder.SeedAsync(context, hasher);
}

// 9. Pipeline Configuration
if (app.Environment.IsDevelopment() || true)
{
    app.MapOpenApi();
}

app.UseCors("AllowProStockFrontend");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapHub<MarketHub>("/hubs/market");
app.MapHub<SignalHub>("/hubs/signals");

app.Run();
