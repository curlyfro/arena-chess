using System.Text;
using System.Threading.RateLimiting;
using Amazon.DynamoDBv2;
using ChessArena.Api.Middleware;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using ChessArena.Application.Services;
using ChessArena.Application.Validators;
using ChessArena.Core.Interfaces;
using ChessArena.Infrastructure.Auth;
using ChessArena.Infrastructure.DynamoDb;
using ChessArena.Infrastructure.DynamoDb.Auth;
using ChessArena.Infrastructure.DynamoDb.Identity;
using ChessArena.Infrastructure.DynamoDb.Queries;
using ChessArena.Infrastructure.DynamoDb.Repositories;
using ChessArena.Infrastructure.Identity;
using ChessArena.Infrastructure.Validation;
using ChessArena.Application.Queries;
using ChessArena.BackgroundJobs;
using FluentValidation;
using FluentValidation.AspNetCore;
using Microsoft.AspNetCore.Identity;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

// ── Serilog ──
builder.Host.UseSerilog((ctx, lc) => lc
    .ReadFrom.Configuration(ctx.Configuration)
    .WriteTo.Console());

// ── DynamoDB ──
builder.Services.AddSingleton<IAmazonDynamoDB>(_ =>
{
    var serviceUrl = builder.Configuration["DynamoDB:ServiceUrl"] ?? "http://localhost:8000";
    var config = new AmazonDynamoDBConfig { ServiceURL = serviceUrl };
    return new AmazonDynamoDBClient("local", "local", config);
});
builder.Services.AddHostedService<DynamoDbTableInitializer>();

// ── ASP.NET Identity (DynamoDB stores) ──
builder.Services.AddScoped<DynamoUnitOfWork>();
builder.Services.AddIdentity<ApplicationUser, IdentityRole>(options =>
    {
        options.User.RequireUniqueEmail = true;
        options.SignIn.RequireConfirmedEmail = false;
        options.Password.RequiredLength = 8;
        options.Password.RequireNonAlphanumeric = false;
        options.Password.RequireUppercase = false;
        options.Password.RequireDigit = false;
        options.Lockout.MaxFailedAccessAttempts = 5;
        options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(15);
        options.Lockout.AllowedForNewUsers = true;
    })
    .AddUserStore<DynamoUserStore>()
    .AddRoleStore<DynamoRoleStore>()
    .AddDefaultTokenProviders();

// ── JWT Authentication ──
var jwtKey = builder.Configuration["Jwt:Key"]
    ?? (builder.Environment.IsDevelopment()
        ? "ChessArena-Dev-Secret-Key-Min-32-Chars!!"
        : throw new InvalidOperationException("Jwt:Key must be configured in production"));
var jwtIssuer = builder.Configuration["Jwt:Issuer"] ?? "ChessArena";
var jwtAudience = builder.Configuration["Jwt:Audience"] ?? "ChessArena";

builder.Services.AddAuthentication(options =>
    {
        options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
        options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
    })
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtIssuer,
            ValidAudience = jwtAudience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
            ClockSkew = TimeSpan.Zero
        };
    });

// ── HybridCache ──
builder.Services.AddHybridCache(options =>
{
    options.DefaultEntryOptions = new()
    {
        Expiration = TimeSpan.FromMinutes(15),
        LocalCacheExpiration = TimeSpan.FromMinutes(5)
    };
});

// ── Unit of Work ──
builder.Services.AddScoped<IUnitOfWork>(sp => sp.GetRequiredService<DynamoUnitOfWork>());

// ── Application Services ──
builder.Services.AddSingleton<IEloRatingService, EloRatingService>();
builder.Services.AddSingleton<TitleAwardService>();
builder.Services.AddSingleton<IPgnValidator, PgnValidator>();
builder.Services.AddScoped<IGameResultService, GameResultService>();
builder.Services.AddScoped<ISessionCapService, DynamoSessionCapService>();

// ── Repositories ──
builder.Services.AddScoped<IPlayerRepository, DynamoPlayerRepository>();
builder.Services.AddScoped<IGameRepository, DynamoGameRepository>();
builder.Services.AddScoped<IRatingHistoryRepository, DynamoRatingHistoryRepository>();

// ── Queries ──
builder.Services.AddScoped<IPlayerStatsQuery, DynamoPlayerStatsQuery>();
builder.Services.AddScoped<ILeaderboardQuery, DynamoLeaderboardQuery>();

// ── Refresh Token Store ──
builder.Services.AddScoped<IRefreshTokenStore, DynamoRefreshTokenStore>();

// ── FluentValidation ──
builder.Services.AddFluentValidationAutoValidation();
builder.Services.AddValidatorsFromAssemblyContaining<SubmitGameRequestValidator>();

// ── Rate Limiting ──
builder.Services.AddRateLimiter(options =>
{
    options.AddPolicy("auth", httpContext =>
        RateLimitPartition.GetSlidingWindowLimiter(
            httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            _ => new System.Threading.RateLimiting.SlidingWindowRateLimiterOptions
            {
                PermitLimit = 60,
                Window = TimeSpan.FromMinutes(1),
                SegmentsPerWindow = 6
            }));
    options.AddPolicy("games", httpContext =>
        RateLimitPartition.GetTokenBucketLimiter(
            httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            _ => new System.Threading.RateLimiting.TokenBucketRateLimiterOptions
            {
                TokenLimit = 15,
                ReplenishmentPeriod = TimeSpan.FromMinutes(1),
                TokensPerPeriod = 10
            }));
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
});

// ── Background Jobs ──
builder.Services.AddHostedService<CleanupService>();

// ── Middleware ──
builder.Services.AddTransient<GlobalExceptionHandler>();

// ── Controllers ──
builder.Services.AddControllers();

// ── CORS ──
builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy =>
    {
        var origins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>();
        if (origins == null || origins.Length == 0)
        {
            if (builder.Environment.IsDevelopment())
                origins = ["http://localhost:5173"];
            else
                throw new InvalidOperationException("Cors:AllowedOrigins must be configured in production");
        }
        policy.WithOrigins(origins)
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

// ── Swagger / OpenAPI ──
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddOpenApiDocument();

var app = builder.Build();

// ── Middleware Pipeline ──
app.UseSerilogRequestLogging();
app.UseMiddleware<GlobalExceptionHandler>();

if (app.Environment.IsDevelopment())
{
    app.UseOpenApi();
    app.UseSwaggerUi();
}

app.UseCors("Frontend");
app.UseAuthentication();
app.UseAuthorization();
app.UseRateLimiter();
app.MapControllers();

// ── Minimal API endpoints ──
app.MapGet("/api/health", async (IAmazonDynamoDB dynamo) =>
{
    try
    {
        await dynamo.DescribeTableAsync(DynamoConstants.TableName);
        return Results.Ok(new { Status = "healthy", Database = "connected" });
    }
    catch
    {
        return Results.Json(
            new { Status = "unhealthy", Database = "disconnected" },
            statusCode: StatusCodes.Status503ServiceUnavailable);
    }
}).WithTags("Health");

app.MapGet("/api/config", () => Results.Ok(new
{
    Version = "1.0",
    Environment = app.Environment.EnvironmentName
})).WithTags("Config");

app.Run();

// Required for WebApplicationFactory in integration tests
public partial class Program;
