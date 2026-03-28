using System.Text.RegularExpressions;
using ChessArena.Core.Enums;
using ChessArena.Core.Interfaces;

namespace ChessArena.Infrastructure.Validation;

/// <summary>
/// Validates PGN submissions: cross-validates result markers, enforces SAN move format,
/// and verifies move sequence structure (move numbers, alternating moves).
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

        // Parse and validate individual SAN moves
        var moves = ExtractMoves(pgn);
        if (moves.Count == 0)
            return Task.FromResult(false);

        // Validate each move is well-formed SAN
        foreach (var move in moves)
        {
            if (!SanMoveRegex().IsMatch(move))
                return Task.FromResult(false);
        }

        // Validate move numbering is sequential
        var moveNumbers = MoveNumberExtract().Matches(pgn);
        if (moveNumbers.Count == 0)
            return Task.FromResult(false);

        int expectedNumber = 1;
        foreach (Match m in moveNumbers)
        {
            if (int.TryParse(m.Groups[1].Value, out int num))
            {
                if (num != expectedNumber)
                    return Task.FromResult(false);
                expectedNumber++;
            }
        }

        return Task.FromResult(true);
    }

    private static List<string> ExtractMoves(string pgn)
    {
        // Strip result token
        var cleaned = pgn.TrimEnd();
        cleaned = ResultTokenRegex().Replace(cleaned, "").Trim();

        // Strip move numbers (e.g., "1.", "12...")
        cleaned = MoveNumberStripRegex().Replace(cleaned, " ");

        // Split on whitespace and filter
        var tokens = cleaned.Split(' ', StringSplitOptions.RemoveEmptyEntries);
        return tokens
            .Where(t => !string.IsNullOrWhiteSpace(t))
            .ToList();
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

    // Matches valid SAN moves: piece moves (Nf3, Bxe5+, Qd1#), pawn moves (e4, exd5, e8=Q),
    // castling (O-O, O-O-O), with optional check/checkmate suffix
    [GeneratedRegex(@"^(?:O-O-O|O-O|[KQRBN][a-h]?[1-8]?x?[a-h][1-8](?:=[QRBN])?|[a-h](?:x[a-h])?[1-8](?:=[QRBN])?)[+#]?$")]
    private static partial Regex SanMoveRegex();

    // Extracts move numbers: "1.", "23."
    [GeneratedRegex(@"(\d+)\.")]
    private static partial Regex MoveNumberExtract();

    // Strips move numbers for move extraction
    [GeneratedRegex(@"\d+\.+\s*")]
    private static partial Regex MoveNumberStripRegex();

    // Matches PGN result tokens at end of string
    [GeneratedRegex(@"\s*(?:1-0|0-1|1/2-1/2|\*)\s*$")]
    private static partial Regex ResultTokenRegex();
}
