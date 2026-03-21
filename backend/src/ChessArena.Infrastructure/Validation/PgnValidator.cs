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

        var expectedTag = declaredResult switch
        {
            GameResult.Win => "1-0",
            GameResult.Loss => "0-1",
            GameResult.Draw => "1/2-1/2",
            _ => "*"
        };

        // PGN must contain the expected result (either in the Result header or at the end)
        bool hasExpectedResult = pgn.Contains(expectedTag);

        return Task.FromResult(hasExpectedResult);
    }
}
