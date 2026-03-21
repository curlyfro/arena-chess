using ChessArena.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ChessArena.Infrastructure.Data.Configurations;

public class GameConfiguration : IEntityTypeConfiguration<Game>
{
    public void Configure(EntityTypeBuilder<Game> builder)
    {
        builder.HasKey(g => g.Id);

        builder.HasIndex(g => new { g.PlayerId, g.PlayedAt });
        builder.HasIndex(g => new { g.IsRated, g.TimeControl });

        builder.Property(g => g.TimeControl)
            .HasConversion<string>()
            .HasMaxLength(10);

        builder.Property(g => g.Result)
            .HasConversion<string>()
            .HasMaxLength(10);

        builder.Property(g => g.Termination)
            .HasConversion<string>()
            .HasMaxLength(30);

        builder.Property(g => g.PlayerColor)
            .HasConversion<string>()
            .HasMaxLength(10);

        builder.Property(g => g.Pgn)
            .HasMaxLength(50_000);
    }
}
