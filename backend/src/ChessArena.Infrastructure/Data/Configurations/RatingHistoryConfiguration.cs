// DEPRECATED: EF/PostgreSQL — replaced by DynamoDb/ implementation. Remove after migration validation.
using ChessArena.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ChessArena.Infrastructure.Data.Configurations;

[Obsolete("EF/PostgreSQL — replaced by DynamoDB. Remove after migration validation.")]
public class RatingHistoryConfiguration : IEntityTypeConfiguration<RatingHistory>
{
    public void Configure(EntityTypeBuilder<RatingHistory> builder)
    {
        builder.HasKey(rh => rh.Id);

        builder.HasIndex(rh => new { rh.PlayerId, rh.TimeControl, rh.RecordedAt });

        builder.Property(rh => rh.TimeControl)
            .HasConversion<string>()
            .HasMaxLength(10);

        builder.HasOne(rh => rh.Game)
            .WithMany()
            .HasForeignKey(rh => rh.GameId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
