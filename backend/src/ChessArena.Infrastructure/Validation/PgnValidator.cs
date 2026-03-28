using System.Text.RegularExpressions;
using ChessArena.Core.Enums;
using ChessArena.Core.Interfaces;

namespace ChessArena.Infrastructure.Validation;

/// <summary>
/// Phase 1.5: cross-validates PGN result marker against declared result and player color,
/// enforces minimum move count, and checks for basic algebraic notation.
/// Phase 2 will add full move-by-move replay validation.
/// </summary>
public sealed partial class PgnValidator : IPgnValidator
{
    public Task<bool> ValidateAsync(
        string pgn, GameResult declaredResult, PlayerColor playerColor, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(pgn))
            return Task.FromResult(false);

        // Extract trailing PGN result token
        var pgnResult = ExtractPgnResult(pgn);
        if (pgnResult == null)
            return Task.FromResult(false);

        // Reject in-progress markers
        if (pgnResult == "*")
            return Task.FromResult(false);

        // Cross-validate declared result + player color against PGN result
        if (!ResultMatchesPgn(declaredResult, playerColor, pgnResult))
            return Task.FromResult(false);

        // Require at least one full move (move number "1." must appear)
        if (!MoveNumberRegex().IsMatch(pgn))
            return Task.FromResult(false);

        // Require at least one algebraic notation move
        if (!AlgebraicMoveRegex().IsMatch(pgn))
            return Task.FromResult(false);

        return Task.FromResult(true);
    }

    private static string? ExtractPgnResult(string pgn)
    {
        var trimmed = pgn.TrimEnd();

        if (trimmed.EndsWith("1/2-1/2"))
            return "1/2-1/2";
        if (trimmed.EndsWith("1-0"))
            return "1-0";
        if (trimmed.EndsWith("0-1"))
            return "0-1";
        if (trimmed.EndsWith("*"))
            return "*";

        return null;
    }

    private static bool ResultMatchesPgn(GameResult declared, PlayerColor playerColor, string pgnResult)
    {
        return declared switch
        {
            GameResult.Win => playerColor == PlayerColor.White
                ? pgnResult == "1-0"
                : pgnResult == "0-1",
            GameResult.Loss => playerColor == PlayerColor.White
                ? pgnResult == "0-1"
                : pgnResult == "1-0",
            GameResult.Draw => pgnResult == "1/2-1/2",
            _ => false
        };
    }

    [GeneratedRegex(@"\d+\.")]
    private static partial Regex MoveNumberRegex();

    [GeneratedRegex(@"\d+\.\s*[a-hKQRBNO]")]
    private static partial Regex AlgebraicMoveRegex();
}
