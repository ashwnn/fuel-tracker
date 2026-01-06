# FuelTracker

A comprehensive multi-user PWA for tracking fuel expenses across multiple vehicles with AI-powered receipt scanning.

> Disclaimer: This application was developed entirely through automated AI agent's based on a design schema I created.

## Features

- 📱 **Progressive Web App** - Install on any device, works offline
- 🚗 **Multi-Vehicle Support** - Track multiple vehicles with separate tanks
- 🤖 **AI Receipt Scanning** - Extract fill-up data from photos using Gemini Vision
- 📊 **Detailed Analytics** - Fuel economy, cost trends, and comparisons
- 💰 **Budget Tracking** - Set monthly budgets and track spending
- 🔐 **Secure Authentication** - JWT + API key support for external integrations
- 📦 **Data Export** - Export data as JSON or CSV
- 🌍 **Unit Flexibility** - Support for metric (km, L) and imperial (miles, gallons)

## Tech Stack

- **Backend**: Next.js 15 App Router (Node 20, TypeScript)
- **Database**: MariaDB via Docker
- **ORM**: Prisma
- **Authentication**: JWT + bcrypt
- **AI**: Google Gemini Vision API
- **Frontend**: React 19
- **PWA**: Service Worker with offline support

## Quick Start

### Prerequisites

- Node.js 20+
- Docker and Docker Compose
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd FuelTracker
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start the database**
   ```bash
   docker-compose up -d db
   ```

5. **Run Prisma migrations**
   ```bash
   npm run prisma:migrate
   ```

6. **Start the development server**
   ```bash
   npm run dev
   ```

   Visit [http://localhost:3000](http://localhost:3000)

## Docker Deployment

Build and run everything with Docker Compose:

```bash
docker-compose up --build
```

The application will be available at [http://localhost:3000](http://localhost:3000)

## Database Schema

The application uses the following main models:

- **User** - User accounts with preferences
- **ApiKey** - API keys for external access
- **MonthlyBudget** - Monthly fuel budgets
- **Vehicle** - User vehicles
- **TankProfile** - Tank configurations per vehicle
- **FillUpEntry** - Individual fill-up records with calculated metrics

All distance is stored in kilometers, volume in liters. Unit preferences are applied on read.

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user

### Vehicles
- `GET /api/vehicles` - List vehicles
- `POST /api/vehicles` - Create vehicle
- `GET /api/vehicles/:id` - Get vehicle
- `PUT /api/vehicles/:id` - Update vehicle
- `DELETE /api/vehicles/:id` - Delete vehicle

### Fill-Up Entries
- `GET /api/vehicles/:id/entries` - List entries
- `POST /api/vehicles/:id/entries` - Create entry
- `POST /api/vehicles/:id/entries/photo` - AI photo extraction
- `GET /api/entries/:id` - Get entry
- `PUT /api/entries/:id` - Update entry
- `DELETE /api/entries/:id` - Delete entry

### Budgets
- `GET /api/me/budgets` - List budgets
- `POST /api/me/budgets` - Create/update budget
- `GET /api/me/budgets/:year/:month/usage` - Get budget usage

### Export
- `GET /api/export/json` - Export all data as JSON
- `GET /api/export/csv?vehicleId=X` - Export as CSV

### API Keys
- `GET /api/me/api-keys` - List API keys
- `POST /api/me/api-keys` - Create API key
- `DELETE /api/me/api-keys/:id` - Revoke API key

## Authentication Methods

### JWT (Web App)
```bash
curl -H "Authorization: Bearer <token>" https://api.example.com/api/vehicles
```

### API Key (External Apps)
```bash
curl -H "x-api-key: <api-key>" https://api.example.com/api/vehicles
```

## Development

### Run Prisma Studio
```bash
npm run prisma:studio
```

### Run Tests
```bash
npm test
```

### Generate Prisma Client
```bash
npm run prisma:generate
```

### Create a Migration
```bash
npx prisma migrate dev --name description-of-change
```

## Project Structure

```
/
├── prisma/
│   └── schema.prisma       # Database schema
├── src/
│   ├── app/                # Next.js app router pages and API routes
│   │   ├── api/            # API route handlers
│   │   ├── layout.tsx      # Root layout
│   │   └── page.tsx        # Home page
│   └── server/             # Backend logic
│       ├── auth/           # Authentication
│       ├── utils/          # Utilities (conversions, validation)
│       └── prisma.ts       # Prisma client
├── public/
│   ├── manifest.webmanifest
│   └── service-worker.js
├── docker-compose.yml
├── Dockerfile
└── package.json
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | MariaDB connection string | - |
| `JWT_SECRET` | Secret for JWT signing | - |
| `GEMINI_API_KEY` | Google Gemini API key | - |
| `NODE_ENV` | Environment | development |
| `NEXT_PUBLIC_APP_URL` | Public app URL | http://localhost:3000 |

## License

MIT

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## Support

For issues and questions, please open a GitHub issue.
