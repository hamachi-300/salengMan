# SalengMan Backend (Docker)

Complete Docker setup for SalengMan backend with a focus on core APIs and image storage.

## Architecture

The backend consists of a Node.js API (Express), a PostgreSQL database with PostGIS, and a MinIO object storage server.

```
┌─────────────────────────────────────────────────────────────┐
│  Docker Network: salengman-network                          │
│                                                             │
│            ┌───────────────────────────┐                    │
│            │      Node.js Backend      │                    │
│            │         Port 3000         │                    │
│            │  - Auth & Business Logic  │                    │
│            └────────┬──────────┬───────┘                    │
│                     │          │                            │
│                     ▼          ▼                            │
│  ┌────────────────────┐      ┌────────────────────┐         │
│  │ PostgreSQL + PostGIS│      │        MinIO       │         │
│  │     Port 5432      │      │    Port 9000/9001  │         │
│  │  - Main Data Store │      │    - Image Storage  │         │
│  └────────────────────┘      └────────────────────┘         │
└─────────────────────────────────────────────────────────────┘
```

## Quick Start

### 1. Create environment file

```bash
cp .env.example .env
```

Edit `.env` with your settings (see root `README.md` for secret generation tips).

### 2. Start all services

```bash
docker compose up -d
```

### 3. Verify services are running

```bash
docker compose ps
```

## Core Services

| Service | Port | Description |
|---------|------|-------------|
| Backend API | 3000 | Primary Express API |
| PostgreSQL | 5432 | Database with PostGIS extensions |
| MinIO API | 9000 | S3-compatible object storage |
| MinIO Console | 9001 | MinIO Web Management UI |

## API Endpoints (Port 3000)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/health` | No | Health check |
| POST | `/auth/register` | No | Register user |
| POST | `/auth/login` | No | Login user |
| GET | `/auth/me` | Yes | Get current user |
| POST | `/upload` | Yes | Upload image to MinIO |
| GET | `/old-item-posts` | Yes | Get scrap metal/waste posts |
| GET | `/drivers/nearby` | No | Find nearby drivers using PostGIS |

## Commands

```bash
# View logs
docker compose logs -f

# Rebuild backend after code changes
docker compose up -d --build backend

# Reset data (WARNING: Deletes database and images)
docker compose down -v
```

## Development

The backend volume mounts the `./server` directory, so changes to `server/index.js` require a restart:

```bash
docker compose restart backend
```
