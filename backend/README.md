# SalengMan Backend (Docker)

Complete Docker setup for SalengMan backend with all services.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Docker Network: salengman-network                          │
│                                                             │
│  ┌─────────────────┐  ┌─────────────────┐                   │
│  │ Node.js Backend │  │ PostgREST       │                   │
│  │ Port 3000       │  │ Port 3001       │                   │
│  │ - Auth (JWT)    │  │ - Auto REST API │                   │
│  │ - Business logic│  │ - CRUD ops      │                   │
│  └────────┬────────┘  └────────┬────────┘                   │
│           │                    │                            │
│           └──────────┬─────────┘                            │
│                      ▼                                      │
│  ┌─────────────────────────────────────────┐                │
│  │ PostgreSQL + PostGIS                    │                │
│  │ Port 5432                               │                │
│  │ - Users, Orders, Driver locations       │                │
│  └─────────────────────────────────────────┘                │
│                                                             │
│  ┌─────────────────┐  ┌─────────────────┐                   │
│  │ Supabase        │  │ MinIO           │                   │
│  │ Realtime        │  │ Port 9000/9001  │                   │
│  │ Port 4000       │  │ - File uploads  │                   │
│  │ - WebSocket     │  │ - Image storage │                   │
│  └─────────────────┘  └─────────────────┘                   │
└─────────────────────────────────────────────────────────────┘
```

## Quick Start

### 1. Create environment file

```bash
cp .env.example .env
```

Edit `.env` with your settings:

```env
POSTGRES_USER=salengman
POSTGRES_PASSWORD=your_secure_password
POSTGRES_DB=salengman
JWT_SECRET=your_jwt_secret_minimum_32_characters_long
MINIO_ROOT_USER=admin
MINIO_ROOT_PASSWORD=your_minio_password
SECRET_KEY_BASE=your_realtime_secret_key_base_64_chars
```

### 2. Start all services

```bash
docker compose up -d
```

### 3. Verify services are running

```bash
docker compose ps
```

### 4. Test health endpoint

```bash
curl http://localhost:3000/health
```

## Services

| Service | Port | URL | Description |
|---------|------|-----|-------------|
| Backend API | 3000 | http://localhost:3000 | Node.js Express API |
| PostgREST | 3001 | http://localhost:3001 | Auto-generated REST API |
| Realtime | 4000 | ws://localhost:4000 | WebSocket for live updates |
| MinIO API | 9000 | http://localhost:9000 | S3-compatible storage |
| MinIO Console | 9001 | http://localhost:9001 | MinIO web UI |
| PostgreSQL | 5432 | localhost:5432 | Database |

## API Endpoints

### Backend (Port 3000)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /health | No | Health check |
| POST | /auth/register | No | Register user |
| POST | /auth/login | No | Login user |
| GET | /auth/me | Yes | Get current user |
| DELETE | /auth/me | Yes | Delete account |
| POST | /upload/avatar | Yes | Upload avatar |
| GET | /addresses | Yes | Get addresses |
| POST | /addresses | Yes | Add address |
| GET | /old-item-posts | Yes | Get posts |
| POST | /old-item-posts | Yes | Create post |
| POST | /driver/location | Yes | Update driver location |
| GET | /drivers/nearby | No | Get nearby drivers |
| GET | /orders | Yes | Get orders |

### PostgREST (Port 3001)

Auto-generated REST API for direct database access:

```bash
# Get all users (with JWT)
curl -H "Authorization: Bearer YOUR_JWT" http://localhost:3001/users

# Get orders
curl -H "Authorization: Bearer YOUR_JWT" http://localhost:3001/orders

# Insert driver location
curl -X POST http://localhost:3001/driver_locations \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{"lat": 13.7563, "lng": 100.5018}'
```

## Frontend Configuration

Update your frontend `src/config/api.ts`:

```typescript
// For local development
export const API_URL = 'http://localhost:3000';
export const POSTGREST_URL = 'http://localhost:3001';
export const REALTIME_URL = 'ws://localhost:4000';
export const MINIO_URL = 'http://localhost:9000';
```

## Realtime WebSocket

Connect to Supabase Realtime for live updates:

```typescript
import { RealtimeClient } from '@supabase/realtime-js';

const client = new RealtimeClient('ws://localhost:4000/socket', {
  params: { apikey: 'YOUR_JWT_TOKEN' }
});

// Subscribe to driver location changes
const channel = client.channel('realtime:public:driver_locations');
channel
  .on('postgres_changes', { event: '*', schema: 'public', table: 'driver_locations' }, payload => {
    console.log('Driver location changed:', payload);
  })
  .subscribe();
```

## Commands

```bash
# Start all services
docker compose up -d

# View logs
docker compose logs -f

# View specific service logs
docker compose logs -f backend
docker compose logs -f postgres
docker compose logs -f realtime

# Stop all services
docker compose down

# Stop and remove volumes (reset data)
docker compose down -v

# Rebuild backend after code changes
docker compose up -d --build backend

# Access PostgreSQL
docker exec -it salengman-postgres psql -U salengman -d salengman

# Access MinIO console
open http://localhost:9001
```

## Development

### Hot reload for backend

The backend volume mounts `./server` directory, so changes to `server/index.js` require:

```bash
docker compose restart backend
```

### Database migrations

Add new SQL files to `./init-db/` directory. They run in alphabetical order on first start.

To re-run migrations:

```bash
docker compose down -v
docker compose up -d
```

## Troubleshooting

### Port already in use

```bash
# Find process using port
lsof -i :3000

# Kill process
kill -9 <PID>
```

### Database connection issues

```bash
# Check postgres logs
docker compose logs postgres

# Test connection
docker exec -it salengman-postgres pg_isready -U salengman
```

### Reset everything

```bash
docker compose down -v
docker system prune -f
docker compose up -d
```

## Production Deployment

For Azure VM deployment:

1. Update `.env` with production values
2. Set `MINIO_PUBLIC_URL` to your VM's public IP
3. Consider adding Nginx reverse proxy with SSL
4. Enable firewall rules for required ports

```bash
# On Azure VM
git clone <your-repo>
cd backend
cp .env.example .env
nano .env  # Edit with production values
docker compose up -d
```
