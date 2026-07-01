# SportHub

SportHub is a full-stack MVP for booking sports facilities and renting sports equipment.

The project is built as a working first version, while keeping the structure ready for future features such as payments, notifications, reports, reviews, staff roles, QR pickup, and advanced booking workflows.

## Current MVP

- Customer register and login
- JWT authentication
- Customer and admin route guards
- Browse seeded sports with photos
- View sport details with facilities and equipment
- Book facilities using selectable 30-minute time slots
- Book packages: facility + selected equipment
- Rent equipment from a dedicated equipment booking page
- View, cancel, and clear customer bookings
- Admin booking dashboard with pagination and status filters
- Admin confirm/cancel bookings
- Admin mark equipment rentals as picked up and returned
- Admin manage sports, facilities, and equipment
- Admin upload images for sports, facilities, and equipment
- Facility out-of-service support
- Seeded sports, facilities, equipment, images, and admin account

## Tech Stack

Backend:

- ASP.NET Core Web API
- Entity Framework Core
- MySQL
- JWT Bearer authentication
- BCrypt password hashing

Frontend:

- Angular
- TypeScript
- Component-based pages
- Route guards and HTTP interceptor

## Project Structure

```text
SportHub/
|-- SportHub.Api/
|   |-- Controllers/
|   |-- Data/
|   |-- DTOs/
|   |-- Migrations/
|   |-- Models/
|   |-- Services/
|   |-- wwwroot/uploads/
|   |-- Program.cs
|   `-- appsettings.Development.json
|
|-- SportHub.Client/
|   |-- public/
|   `-- src/app/
|       |-- core/
|       |-- models/
|       |-- pages/
|       `-- shared/
|
`-- Docs/
```

## Backend Setup

1. Configure the MySQL connection string in:

```text
SportHub.Api/appsettings.Development.json
```

Example:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "server=localhost;port=3307;database=sporthub_db;user=root;password=root;SslMode=None"
  },
  "Jwt": {
    "Key": "SportHubSuperSecretDevelopmentKey123456789",
    "Issuer": "SportHub",
    "Audience": "SportHubUsers"
  }
}
```
2. build the backend:

```powershell
dotnet build --project SportHub.Api
```
If there is an error check that the .NET SDK version matches ur used .NET version used in the project 

```powershell
dotnet --list-sdk
```
based on the version update the target framework in this file

```text
SportHub.Api\SportHub.Api.csproj
```
```code
  <PropertyGroup>
    <TargetFramework> CHANGE THIS TO THE SDK VERSION YOU HAVE </TargetFramework>
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
  </PropertyGroup>
```

3. Create/update the database:

```powershell
dotnet tool install --global dotnet-ef
dotnet ef database update --project SportHub.Api/SportHub.Api.csproj
```

4. Run the API:

```powershell
dotnet run --project SportHub.Api/SportHub.Api.csproj
```

5. Swagger opens from the API launch URL:

```text
https://localhost:{port}/swagger
```

## Frontend Setup

1. Install packages:

```powershell
cd SportHub.Client
npm install
```

2. Run Angular:

```powershell
npm start
```

3. Open:

```text
http://localhost:4200
```

## Seeded Admin Account

```text
Email: admin@sporthub.com
Password: Admin@123
```

Registered users are created as customers by default.

## Main Customer Pages

- `/login`
- `/register`
- `/sports`
- `/sports/:id`
- `/equipment`
- `/bookings`

## Main Admin Pages

- `/admin/bookings`
- `/admin/sports`
- `/admin/sports/:id`
- `/admin/equipment`

## Main API Areas

```text
POST /api/Auth/register
POST /api/Auth/login

GET  /api/Sports
GET  /api/Sports/{id}

GET  /api/Bookings/my-bookings
POST /api/Bookings
POST /api/Bookings/{id}/cancel
POST /api/Bookings/{id}/hide

GET  /api/Bookings/facility-availability
GET  /api/Bookings/equipment-availability

GET  /api/admin/bookings
POST /api/admin/bookings/{id}/confirm
POST /api/admin/bookings/{id}/cancel
POST /api/admin/bookings/{id}/pickup
POST /api/admin/bookings/{id}/return
POST /api/admin/bookings/{id}/complete

/api/admin/sports
/api/admin/facilities
/api/admin/equipment
/api/admin/uploads/image
```

## Important Booking Rules

- Facility bookings use 30-minute slot selection.
- Customers can select a start slot, then extend the range by selecting later slots.
- The selected range cannot overlap occupied slots.
- Facility/package bookings use hourly calculation.
- Equipment-only rentals use daily rental price.
- Equipment inside packages uses package hourly price.
- Customers can cancel only before the 2-hour cancellation window closes.
- Cleared customer bookings are hidden permanently for that customer.
- Out-of-service facilities cannot be booked.

## Notes

- Uploaded and seeded images are served from `SportHub.Api/wwwroot/uploads`.
- The frontend displays backend images through the API base URL.
- Seed data is managed through EF Core migrations and `AppDbContext`.
- The current UI uses a dark sporty dashboard style and can still receive final visual polish.
