using Amazon.DynamoDBv2;
using Amazon.DynamoDBv2.Model;
using ChessArena.Application.DTOs.Leaderboard;
using ChessArena.Application.Queries;
using ChessArena.Core.Enums;

namespace ChessArena.Infrastructure.DynamoDb.Queries;

public sealed class DynamoLeaderboardQuery(IAmazonDynamoDB dynamoDb) : ILeaderboardQuery
{
    public async Task<List<LeaderboardEntryResponse>> GetTopPlayersAsync(
        TimeControl tc, int limit = 100, CancellationToken ct = default)
    {
        var response = await dynamoDb.QueryAsync(new QueryRequest
        {
            TableName = DynamoConstants.TableName,
            IndexName = DynamoConstants.Gsi1Name,
            KeyConditionExpression = $"{DynamoConstants.Gsi1Pk} = :pk",
            ExpressionAttributeValues = new Dictionary<string, AttributeValue>
            {
                [":pk"] = new(KeyHelpers.LeaderboardGsi1Pk(tc)),
            },
            ScanIndexForward = true, // ascending inverted rating = descending actual rating
            Limit = limit,
        }, ct);

        return response.Items
            .Select((item, i) => new LeaderboardEntryResponse(
                i + 1,
                Guid.Parse(item["PlayerId"].S),
                item["Username"].S,
                item["Title"].S,
                int.Parse(item["Rating"].N),
                int.Parse(item["GamesPlayed"].N)
            ))
            .ToList();
    }
}
