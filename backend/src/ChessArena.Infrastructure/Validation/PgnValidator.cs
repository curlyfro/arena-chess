using ChessArena.Core.Enums;
using ChessArena.Core.Interfaces;

namespace ChessArena.Infrastructure.Validation;

/// <summary>
/// Phase 1 stub: basic format checks only.
/// Phase 2 will add full move-by-move replay validation.
/// </summary>
public sealed class PgnValidator : IPgnValidator
{
    public Task<bool> ValidateAsync(string pgn, GameResult declaredResult, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(pgn))
            return Task.FromResult(false);

        // Phase 1: just verify the PGN contains any valid result marker
        bool hasAnyResult = pgn.Contains("1-0") ||
                            pgn.Contains("0-1") ||
                            pgn.Contains("1/2-1/2") ||
                            pgn.Contains("*");

        return Task.FromResult(hasAnyResult);
    }
}
