# SportHub

SportHub is an ASP.NET Core Web API MVP for booking sports facilities and renting sports equipment.

## MVP Scope

- Customer registration and login
- JWT authentication
- Browse sports, facilities, and equipment
- Facility bookings
- Equipment rentals
- Package bookings: facility + equipment
- Customer cancellation more than 2 hours before start time
- Admin booking confirmation
- Admin equipment pickup and return
- Admin CRUD for sports, facilities, and equipment

## Tech Stack

- ASP.NET Core Web API
- Entity Framework Core
- MySQL
- JWT Bearer authentication
- BCrypt password hashing

## Project Structure

```text
SportHub.Api/
├── Controllers
├── Data
├── DTOs
├── Migrations
├── Models
├── Services
├── Program.cs
└── appsettings.json
```

## Local Setup

1. Configure the development connection string in:

```text
SportHub.Api/appsettings.Development.json
```

Example:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "server=localhost;port=3307;database=sporthub_db;user=root;password=root"
  },
  "Jwt": {
    "Key": "SportHubSuperSecretDevelopmentKey123456789",
    "Issuer": "SportHub",
    "Audience": "SportHubUsers"
  }
}
```

2. Apply migrations:

```powershell
dotnet ef database update --project SportHub.Api/SportHub.Api.csproj
```

3. Run the API:

```powershell
dotnet run --project SportHub.Api/SportHub.Api.csproj
```

4. Open Swagger:

```text
https://localhost:{port}/swagger
```

## Main Endpoints

```text
POST /api/Auth/register
POST /api/Auth/login

GET /api/Sports
GET /api/Sports/{id}

GET /api/Bookings/my-bookings
POST /api/Bookings
POST /api/Bookings/{id}/cancel

GET /api/admin/bookings
POST /api/admin/bookings/{id}/confirm
POST /api/admin/bookings/{id}/pickup
POST /api/admin/bookings/{id}/return
POST /api/admin/bookings/{id}/complete

/api/admin/sports
/api/admin/facilities
/api/admin/equipment
```

## Notes

- Registered users are customers by default.
- For admin testing, update a user's role in MySQL:

```sql
UPDATE Users
SET Role = 'Admin'
WHERE Email = 'your-email@example.com';
```

- Login again after changing the role so the JWT contains the updated role.
