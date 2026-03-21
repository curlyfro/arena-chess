using ChessArena.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ChessArena.Infrastructure.Data.Configurations;

public class PlayerConfiguration : IEntityTypeConfiguration<Player>
{
    public void Configure(EntityTypeBuilder<Player> builder)
    {
        builder.HasKey(p => p.Id);

        builder.HasIndex(p => p.Username).IsUnique();
        builder.HasIndex(p => p.ApplicationUserId).IsUnique();

        builder.Property(p => p.Username).HasMaxLength(20);
        builder.Property(p => p.ApplicationUserId).HasMaxLength(450);

        builder.Property(p => p.Title)
            .HasConversion<string>()
            .HasMaxLength(20);

        // Optimistic concurrency
        builder.Property(p => p.RowVersion)
            .IsRowVersion();

        // CHECK constraints for rating floor
        builder.ToTable(t =>
        {
            t.HasCheckConstraint("CK_Player_EloBullet", "\"EloBullet\" >= 1000");
            t.HasCheckConstraint("CK_Player_EloBlitz", "\"EloBlitz\" >= 1000");
            t.HasCheckConstraint("CK_Player_EloRapid", "\"EloRapid\" >= 1000");
        });

        builder.HasMany(p => p.Games)
            .WithOne(g => g.Player)
            .HasForeignKey(g => g.PlayerId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(p => p.RatingHistories)
            .WithOne(rh => rh.Player)
            .HasForeignKey(rh => rh.PlayerId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
