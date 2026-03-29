// DEPRECATED: EF/PostgreSQL — replaced by DynamoDb/ implementation. Remove after migration validation.
using ChessArena.Infrastructure.Data.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ChessArena.Infrastructure.Data.Configurations;

[Obsolete("EF/PostgreSQL — replaced by DynamoDB. Remove after migration validation.")]
public class EloSessionCapConfiguration : IEntityTypeConfiguration<EloSessionCap>
{
    public void Configure(EntityTypeBuilder<EloSessionCap> builder)
    {
        builder.HasKey(e => e.Id);
        builder.HasIndex(e => new { e.PlayerId, e.Date }).IsUnique();
    }
}
