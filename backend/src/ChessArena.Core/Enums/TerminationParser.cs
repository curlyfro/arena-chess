using System.Collections.Frozen;

namespace ChessArena.Core.Enums;

/// <summary>
/// Single source of truth for parsing wire-format termination strings (snake_case)
/// to the Termination enum.
/// </summary>
public static class TerminationParser
{
    private static readonly FrozenDictionary<string, Termination> WireMap =
        new Dictionary<string, Termination>(StringComparer.OrdinalIgnoreCase)
        {
            ["checkmate"] = Termination.Checkmate,
            ["resign"] = Termination.Resign,
            ["flag"] = Termination.Flag,
            ["draw_agreed"] = Termination.DrawAgreed,
            ["stalemate"] = Termination.Stalemate,
            ["threefold_repetition"] = Termination.ThreefoldRepetition,
            ["fifty_move_rule"] = Termination.FiftyMoveRule,
            ["insufficient_material"] = Termination.InsufficientMaterial,
        }.ToFrozenDictionary(StringComparer.OrdinalIgnoreCase);

    public static IReadOnlyCollection<string> ValidWireValues => WireMap.Keys;

    public static Termination Parse(string value) =>
        WireMap.TryGetValue(value, out var t)
            ? t
            : throw new ArgumentException($"Unknown termination: {value}");

    public static bool IsValid(string value) =>
        WireMap.ContainsKey(value);
}
