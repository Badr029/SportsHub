using Microsoft.EntityFrameworkCore;
using SportHub.Api.Data;
using SportHub.Api.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Extensions.FileProviders;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;

using System.Text;
using System.Text.Json.Serialization;

var builder = WebApplication.CreateBuilder(args);


builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
    });

builder.Services.AddDbContext<AppDbContext>(options =>
{
    var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
    options.UseMySql(connectionString, ServerVersion.AutoDetect(connectionString));
});

builder.Services.AddScoped<JwtService>();

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
    .AddJwtBearer(options =>
    {
        var key = builder.Configuration["Jwt:Key"];
        
        if (string.IsNullOrWhiteSpace(key))
        {
            throw new InvalidOperationException("JWT key is not configured.");
        }

        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key))
        };
    });

builder.Services.AddAuthorization();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "Bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Enter your JWT token."
    });

    options.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy
            .WithOrigins("http://localhost:4200")
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});


var app = builder.Build();

var webRootPath = app.Environment.WebRootPath ?? Path.Combine(app.Environment.ContentRootPath, "wwwroot");
Directory.CreateDirectory(webRootPath);

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}
// Serve the WebP variant of an uploaded image when the browser accepts it.
// The stored ImageUrl still points at the original file, so no database
// migration and no API contract change is needed: the swap happens in
// transport only, and browsers without WebP support fall through to the
// original untouched.
app.Use(async (context, next) =>
{
    var path = context.Request.Path.Value;

    if (path is not null &&
        path.StartsWith("/uploads/", StringComparison.OrdinalIgnoreCase) &&
        (path.EndsWith(".png", StringComparison.OrdinalIgnoreCase) ||
         path.EndsWith(".jpg", StringComparison.OrdinalIgnoreCase) ||
         path.EndsWith(".jpeg", StringComparison.OrdinalIgnoreCase)) &&
        context.Request.Headers.Accept.ToString().Contains("image/webp", StringComparison.OrdinalIgnoreCase))
    {
        var webpPath = Path.ChangeExtension(path, ".webp");
        var candidate = Path.Combine(webRootPath, webpPath.TrimStart('/').Replace('/', Path.DirectorySeparatorChar));

        if (File.Exists(candidate))
        {
            context.Request.Path = webpPath;
            // Caches must not reuse this response for a client that cannot
            // decode WebP.
            context.Response.Headers.Vary = "Accept";
        }
    }

    await next();
});

app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(webRootPath),
    OnPrepareResponse = ctx =>
    {
        // Uploaded files are written under a fresh GUID name, so a given URL
        // never changes content. Seed assets are fixed at build time. Both are
        // safe to cache aggressively; replacing an image produces a new URL.
        ctx.Context.Response.Headers.CacheControl = "public, max-age=31536000, immutable";
    }
});
app.UseCors();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();
