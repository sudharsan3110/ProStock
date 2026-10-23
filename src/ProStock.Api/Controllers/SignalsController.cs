using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ProStock.Api.Contracts;
using ProStock.Application.Interfaces;
using ProStock.Application.Interfaces.Engines;
using ProStock.Domain.Entities;
using ProStock.Domain.Enums;

namespace ProStock.Api.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
public class SignalsController : ControllerBase
{
    private readonly IApplicationDbContext _context;
    private readonly ISignalEngine _signalEngine;
    private readonly IAlertDispatcher _alertDispatcher;

    public SignalsController(
        IApplicationDbContext context,
        ISignalEngine signalEngine,
        IAlertDispatcher alertDispatcher)
    {
        _context = context;
        _signalEngine = signalEngine;
        _alertDispatcher = alertDispatcher;
    }

    [HttpGet]
    public async Task<IActionResult> GetSignals(CancellationToken ct)
    {
        var rawSignals = await _context.Signals
            .OrderByDescending(s => s.CreatedAt)
            .Take(50)
            .ToListAsync(ct);

        var result = rawSignals.Select(ApiMappers.ToSignalDto).ToList();
        return Ok(result);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetSignalById(Guid id, CancellationToken ct)
    {
        var signal = await _context.Signals.FindAsync(new object[] { id }, ct);
        if (signal == null) return NotFound();

        return Ok(ApiMappers.ToSignalDto(signal));
    }

    [HttpPost("scan")]
    public async Task<IActionResult> RunScan(CancellationToken ct)
    {
        var instruments = await _context.Instruments.Take(10).ToListAsync(ct);
        var generatedSignals = new List<Signal>();

        foreach (var inst in instruments)
        {
            var candlesList = await _context.Candles
                .Where(c => c.Symbol == inst.Symbol)
                .OrderByDescending(c => c.Timestamp)
                .Take(60)
                .ToListAsync(ct);

            candlesList.Reverse();
            var candles = candlesList.ToArray();

            if (candles.Length < 30) continue;

            var context = new SignalGenerationContext(
                Instrument: inst,
                Candles: candles,
                CurrentRegime: inst.Regime,
                AccountEquity: 1000000m
            );

            var sig = await _signalEngine.EvaluateSignalsAsync(context, ct);
            if (sig != null)
            {
                _context.Signals.Add(sig);
                generatedSignals.Add(sig);
                await _alertDispatcher.DispatchSignalAlertAsync(sig, ct);
            }
        }

        if (generatedSignals.Count > 0)
        {
            await _context.SaveChangesAsync(ct);
        }

        return Ok(new
        {
            scannedInstruments = instruments.Count,
            signalsGenerated = generatedSignals.Count,
            signals = generatedSignals.Select(ApiMappers.ToSignalDto)
        });
    }
}
