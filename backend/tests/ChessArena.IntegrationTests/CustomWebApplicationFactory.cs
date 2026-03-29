using Amazon.DynamoDBv2;
using DotNet.Testcontainers.Builders;
using DotNet.Testcontainers.Containers;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;

namespace ChessArena.IntegrationTests;

public class CustomWebApplicationFactory : WebApplicationFactory<Program>, IAsyncLifetime
{
    private readonly IContainer _dynamoDb = new ContainerBuilder()
        .WithImage("amazon/dynamodb-local:latest")
        .WithPortBinding(0, 8000) // random host port → container 8000
        .WithCommand("-jar", "DynamoDBLocal.jar", "-sharedDb", "-inMemory")
        .Build();

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.ConfigureServices(services =>
        {
            // Remove the app's DynamoDB client registration and replace with test container
            var descriptor = services.SingleOrDefault(
                d => d.ServiceType == typeof(IAmazonDynamoDB));
            if (descriptor != null)
                services.Remove(descriptor);

            var port = _dynamoDb.GetMappedPublicPort(8000);
            services.AddSingleton<IAmazonDynamoDB>(_ =>
            {
                var config = new AmazonDynamoDBConfig
                {
                    ServiceURL = $"http://localhost:{port}"
                };
                return new AmazonDynamoDBClient("test", "test", config);
            });
        });

        builder.UseEnvironment("Development");
    }

    public async Task InitializeAsync()
    {
        await _dynamoDb.StartAsync();
        // Table is created on startup by DynamoDbTableInitializer hosted service
    }

    async Task IAsyncLifetime.DisposeAsync()
    {
        await _dynamoDb.DisposeAsync();
    }
}
