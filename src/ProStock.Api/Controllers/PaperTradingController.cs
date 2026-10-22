using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ProStock.Application.Interfaces;
using ProStock.Application.Interfaces.Engines;
using ProStock.Domain.Entities;
using ProStock.Domain.Enums;

namespace ProStock.Api.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
public class PaperTradingController : ControllerBase
{
    private readonly IApplicationDbContext _context;
    private readonly IPaperBroker _paperBroker;

    public PaperTradingController(IApplicationDbContext context, IPaperBroker paperBroker)
    {
        _context = context;
        _paperBroker = paperBroker;
    }

    [HttpGet("account")]
    public async Task<IActionResult> GetAccount(CancellationToken ct)
    {
        var account = await _context.PaperAccounts.FirstOrDefaultAsync(ct);
        if (account == null)
        {
            account = new PaperAccount
            {
                AccountNumber = "PAPER-IN-001",
                Currency = "INR",
                TotalEquity = 1000000m,
                CashBalance = 1000000m
            };
            _context.PaperAccounts.Add(account);
            await _context.SaveChangesAsync(ct);
        }

        return Ok(account);
    }

    [HttpGet("/api/v1/trading/portfolio")]
    public async Task<IActionResult> GetPortfolio(CancellationToken ct)
    {
        var account = await _context.PaperAccounts.FirstOrDefaultAsync(ct);
        if (account == null)
        {
            account = new PaperAccount
            {
                AccountNumber = "PAPER-PRO-9842",
                Currency = "INR",
                TotalEquity = 1000000m,
                CashBalance = 1000000m
            };
            _context.PaperAccounts.Add(account);
            await _context.SaveChangesAsync(ct);
        }

        var positions = await _context.PaperPositions.Where(p => p.Quantity > 0).OrderByDescending(p => p.OpenedAt).ToListAsync(ct);
        var orders = await _context.PaperOrders.OrderByDescending(o => o.CreatedAt).Take(50).ToListAsync(ct);

        var formattedAccount = new
        {
            accountNumber = account.AccountNumber,
            currency = account.Currency,
            totalEquity = account.TotalEquity,
            cashBalance = account.CashBalance,
            marginUsed = account.MarginUsed,
            marginAvailable = account.CashBalance,
            dailyPnL = account.DailyPnL,
            dailyPnLPercent = account.TotalEquity > 0 ? Math.Round((account.DailyPnL / account.TotalEquity) * 100m, 2) : 0m,
            unrealizedPnL = account.UnrealizedPnL,
            realizedPnL = account.RealizedPnL,
            portfolioHeatPercent = account.PortfolioHeatPercent,
            maxAllowedHeatPercent = 40.0m,
            circuitBreakerTripped = account.CircuitBreakerTripped
        };

        var formattedPositions = positions.Select(p => new
        {
            id = p.Id.ToString(),
            symbol = p.Symbol,
            direction = p.Direction.ToString().ToUpper(),
            quantity = p.Quantity,
            avgEntryPrice = p.AvgEntryPrice,
            currentPrice = p.CurrentPrice,
            marketValue = p.CurrentPrice * p.Quantity,
            pnl = p.UnrealizedPnL,
            pnlPercent = p.AvgEntryPrice > 0 ? Math.Round((p.UnrealizedPnL / (p.AvgEntryPrice * p.Quantity)) * 100m, 2) : 0m,
            stopLoss = p.StopLoss,
            targetPrice = p.TargetPrice,
            rMultiple = p.RMultiple,
            entryTime = p.OpenedAt.ToString("O")
        }).ToList();

        var formattedOrders = orders.Select(o => new
        {
            id = o.Id.ToString(),
            symbol = o.Symbol,
            side = o.Side.ToString().ToUpper(),
            type = o.Type.ToString().ToUpper(),
            quantity = o.Quantity,
            price = o.Price,
            status = o.Status.ToString().ToUpper(),
            filledQuantity = o.FilledQuantity,
            timestamp = o.CreatedAt.ToString("O")
        }).ToList();

        return Ok(new
        {
            account = formattedAccount,
            positions = formattedPositions,
            orders = formattedOrders
        });
    }

    [HttpGet("positions")]
    public async Task<ActionResult<IEnumerable<PaperPosition>>> GetPositions(CancellationToken ct)
    {
        var positions = await _context.PaperPositions.OrderByDescending(p => p.OpenedAt).ToListAsync(ct);
        return Ok(positions);
    }

    [HttpGet("orders")]
    public async Task<ActionResult<IEnumerable<PaperOrder>>> GetOrders(CancellationToken ct)
    {
        var orders = await _context.PaperOrders.OrderByDescending(o => o.CreatedAt).Take(50).ToListAsync(ct);
        return Ok(orders);
    }

    public record PlaceOrderDto(
        string Symbol,
        string Side,
        string Type,
        int Quantity,
        decimal Price,
        decimal? StopLoss = null,
        decimal? Target = null
    );

    [HttpPost("order")]
    [HttpPost("/api/v1/trading/order")]
    public async Task<IActionResult> PlaceOrder([FromBody] PlaceOrderDto dto, CancellationToken ct)
    {
        var account = await _context.PaperAccounts.FirstOrDefaultAsync(ct);
        if (account == null) return BadRequest(new { message = "No paper account active." });

        var side = dto.Side.ToUpper() == "SELL" ? OrderSide.Sell : OrderSide.Buy;
        var type = dto.Type.ToUpper() == "LIMIT" ? OrderType.Limit : OrderType.Market;

        try
        {
            var order = await _paperBroker.PlaceOrderAsync(
                account.Id,
                dto.Symbol,
                side,
                type,
                dto.Quantity,
                dto.Price,
                dto.StopLoss,
                dto.Target,
                ct
            );

            return Ok(order);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpDelete("order/{id}")]
    public async Task<IActionResult> CancelOrder(Guid id, CancellationToken ct)
    {
        var success = await _paperBroker.CancelOrderAsync(id, ct);
        return success ? Ok(new { message = "Order cancelled." }) : NotFound();
    }
}
