using Microsoft.EntityFrameworkCore;
using ProStock.Application.Interfaces;
using ProStock.Application.Interfaces.Engines;
using ProStock.Domain.Entities;
using ProStock.Domain.Enums;

namespace ProStock.Infrastructure.Engines;

public class PaperTradingBroker : IPaperBroker
{
    private readonly IApplicationDbContext _context;
    private readonly IRiskEngine _riskEngine;

    public PaperTradingBroker(IApplicationDbContext context, IRiskEngine riskEngine)
    {
        _context = context;
        _riskEngine = riskEngine;
    }

    public async Task<PaperAccount> GetOrCreateAccountAsync(Guid userId, CancellationToken ct = default)
    {
        var account = await _context.PaperAccounts
            .Include(a => a.Positions)
            .Include(a => a.Orders)
            .FirstOrDefaultAsync(a => a.UserId == userId, ct);

        if (account == null)
        {
            account = new PaperAccount
            {
                UserId = userId,
                AccountNumber = $"PRO-{new Random().Next(10000, 99999)}",
                Currency = "INR",
                TotalEquity = 1000000m,
                CashBalance = 1000000m,
                LastResetAt = DateTime.UtcNow
            };
            _context.PaperAccounts.Add(account);
            await _context.SaveChangesAsync(ct);
        }

        return account;
    }

    public async Task<PaperOrder> PlaceOrderAsync(
        Guid accountId,
        string symbol,
        OrderSide side,
        OrderType type,
        int quantity,
        decimal price,
        decimal? stopLoss = null,
        decimal? target = null,
        CancellationToken ct = default)
    {
        var account = await _context.PaperAccounts
            .Include(a => a.Positions)
            .FirstOrDefaultAsync(a => a.Id == accountId, ct);

        if (account == null)
        {
            throw new KeyNotFoundException($"Account {accountId} not found.");
        }

        // 1. Evaluate Risk
        var direction = side == OrderSide.Buy ? Direction.Long : Direction.Short;
        var sl = stopLoss ?? (direction == Direction.Long ? price * 0.98m : price * 1.02m);

        var riskResult = _riskEngine.EvaluateTradeRisk(account, symbol, direction, quantity, price, sl);
        if (!riskResult.IsAllowed)
        {
            throw new InvalidOperationException($"Order rejected by Risk Management Engine: {riskResult.RejectionReason}");
        }

        // 2. Realistic Slippage (0.02% base)
        decimal slippagePercent = 0.0002m;
        decimal slippage = side == OrderSide.Buy ? price * slippagePercent : -price * slippagePercent;
        decimal executionPrice = price + slippage;

        // 3. Indian Market Transaction Costs & STT
        decimal turnover = executionPrice * quantity;
        decimal stt = turnover * 0.001m; // 0.1% STT
        decimal exchangeCharges = turnover * 0.0000345m;
        decimal gst = (stt + exchangeCharges) * 0.18m;
        decimal brokerage = Math.Min(20m, turnover * 0.0003m);
        decimal totalFees = stt + exchangeCharges + gst + brokerage;

        // 4. Create Order
        var order = new PaperOrder
        {
            PaperAccountId = accountId,
            Symbol = symbol,
            Side = side,
            Type = type,
            Quantity = quantity,
            Price = price,
            StopLossPrice = sl,
            TargetPrice = target,
            Status = OrderStatus.Filled,
            FilledQuantity = quantity,
            AverageFillPrice = executionPrice,
            SlippageAmount = Math.Abs(slippage) * quantity,
            BrokerageFee = brokerage,
            TaxesAndCharges = totalFees - brokerage,
            CreatedAt = DateTime.UtcNow,
            FilledAt = DateTime.UtcNow
        };

        _context.PaperOrders.Add(order);

        // 5. Update Account Margin & Cash
        account.CashBalance -= totalFees;
        account.MarginUsed += turnover;
        account.PortfolioHeatPercent += riskResult.HeatImpactPercent;

        // 6. Update or Create Position
        var existingPosition = account.Positions.FirstOrDefault(p => p.Symbol == symbol && p.Direction == direction);
        if (existingPosition != null)
        {
            int totalQty = existingPosition.Quantity + quantity;
            existingPosition.AvgEntryPrice = ((existingPosition.AvgEntryPrice * existingPosition.Quantity) + (executionPrice * quantity)) / totalQty;
            existingPosition.Quantity = totalQty;
            existingPosition.CurrentPrice = executionPrice;
            existingPosition.StopLoss = sl;
            existingPosition.TargetPrice = target ?? existingPosition.TargetPrice;
        }
        else
        {
            var position = new PaperPosition
            {
                PaperAccountId = accountId,
                Symbol = symbol,
                Direction = direction,
                Quantity = quantity,
                AvgEntryPrice = executionPrice,
                CurrentPrice = executionPrice,
                StopLoss = sl,
                TargetPrice = target ?? (direction == Direction.Long ? executionPrice * 1.03m : executionPrice * 0.97m),
                RMultiple = 0,
                OpenedAt = DateTime.UtcNow
            };
            account.Positions.Add(position);
        }

        await _context.SaveChangesAsync(ct);
        return order;
    }

    public async Task ProcessTickAsync(string symbol, decimal currentPrice, CancellationToken ct = default)
    {
        var positions = await _context.PaperPositions
            .Include(p => p.Account)
            .Where(p => p.Symbol == symbol)
            .ToListAsync(ct);

        foreach (var pos in positions)
        {
            pos.CurrentPrice = currentPrice;

            // Check Stop Loss Trigger
            bool isStoppedOut = pos.Direction == Direction.Long
                ? currentPrice <= pos.StopLoss
                : currentPrice >= pos.StopLoss;

            // Check Target Trigger
            bool isTargetHit = pos.Direction == Direction.Long
                ? currentPrice >= pos.TargetPrice
                : currentPrice <= pos.TargetPrice;

            if (isStoppedOut || isTargetHit)
            {
                decimal grossPnL = pos.Direction == Direction.Long
                    ? (currentPrice - pos.AvgEntryPrice) * pos.Quantity
                    : (pos.AvgEntryPrice - currentPrice) * pos.Quantity;

                var trade = new PaperTrade
                {
                    PaperAccountId = pos.PaperAccountId,
                    Symbol = pos.Symbol,
                    Direction = pos.Direction,
                    Quantity = pos.Quantity,
                    EntryPrice = pos.AvgEntryPrice,
                    ExitPrice = currentPrice,
                    GrossPnL = grossPnL,
                    NetPnL = grossPnL - 25m, // Minus estimated exit taxes
                    TotalTaxesAndFees = 25m,
                    ExitReason = isTargetHit ? "TARGET_REACHED" : "STOP_LOSS_HIT",
                    EntryTime = pos.OpenedAt,
                    ExitTime = DateTime.UtcNow
                };

                _context.PaperTrades.Add(trade);

                if (pos.Account != null)
                {
                    pos.Account.RealizedPnL += trade.NetPnL;
                    pos.Account.TotalEquity += trade.NetPnL;
                    pos.Account.CashBalance += trade.NetPnL;
                    pos.Account.MarginUsed = Math.Max(0, pos.Account.MarginUsed - (pos.AvgEntryPrice * pos.Quantity));
                    pos.Account.PortfolioHeatPercent = Math.Max(0, pos.Account.PortfolioHeatPercent - 1.5m);

                    // Daily drawdown check
                    _riskEngine.CheckDailyCircuitBreaker(pos.Account);
                }

                _context.PaperPositions.Remove(pos);
            }
        }

        await _context.SaveChangesAsync(ct);
    }

    public async Task<bool> CancelOrderAsync(Guid orderId, CancellationToken ct = default)
    {
        var order = await _context.PaperOrders.FindAsync(new object[] { orderId }, ct);
        if (order == null || order.Status != OrderStatus.Pending) return false;

        order.Status = OrderStatus.Cancelled;
        await _context.SaveChangesAsync(ct);
        return true;
    }
}
