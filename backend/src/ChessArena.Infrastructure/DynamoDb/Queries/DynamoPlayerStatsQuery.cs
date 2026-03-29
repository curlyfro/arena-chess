using Amazon.DynamoDBv2;
using Amazon.DynamoDBv2.Model;
using ChessArena.Application.DTOs.Players;
using ChessArena.Application.Queries;
using ChessArena.Application.Services;
using ChessArena.Core.Enums;

namespace ChessArena.Infrastructure.DynamoDb.Queries;

public sealed class DynamoPlayerStatsQuery(IAmazonDynamoDB dynamoDb) : IPlayerStatsQuery
{
    public async Task<PlayerStatsResponse> GetAsync(Guid playerId, CancellationToken ct = default)
    {
        // Query all game items for this player, project only Result — sort order from SK
        var results = new List<GameResult>();
        Dictionary<string, AttributeValue>? startKey = null;

        do
        {
            var response = await dynamoDb.QueryAsync(new QueryRequest
            {
                TableName = DynamoConstants.TableName,
                KeyConditionExpression = $"{DynamoConstants.Pk} = :pk AND begins_with({DynamoConstants.Sk}, :prefix)",
                ExpressionAttributeValues = new Dictionary<string, AttributeValue>
                {
                    [":pk"] = new(KeyHelpers.PlayerPk(playerId)),
                    [":prefix"] = new(DynamoConstants.GamePrefix),
                },
                ProjectionExpression = "#r",
                ExpressionAttributeNames = new Dictionary<string, string>
                {
                    ["#r"] = "Result", // Result is a reserved word in DynamoDB
                },
                ScanIndexForward = true, // chronological order (oldest first) — matches EF behavior for streak calc
                ExclusiveStartKey = startKey,
            }, ct);

            foreach (var item in response.Items)
                results.Add(Enum.Parse<GameResult>(item["Result"].S));

            startKey = response.LastEvaluatedKey;
        } while (startKey is { Count: > 0 });

        return PlayerStatsCalculator.Compute(results);
    }
}
