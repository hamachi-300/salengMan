# SalengMan

A waste collection and recycling management application built with React, TypeScript, and self-hosted backend services.

## Technology Stack

### Frontend

| Technology | Version | Description |
|------------|---------|-------------|
| React | 19.x | UI framework |
| TypeScript | 5.x | Type-safe JavaScript |
| Vite | 6.x | Build tool & dev server |
| React Router | 7.x | Client-side routing |
| Tauri | 2.x | Desktop app framework |
| CSS Modules | - | Scoped styling |

### Backend

| Technology | Description |
|------------|-------------|
| Node.js | Runtime environment |
| Express | Web framework |
| PostgreSQL | Relational database |
| PostgREST | Auto-generated REST API |
| JWT | Authentication tokens |
| bcrypt | Password hashing |

### Infrastructure

| Technology | Description |
|------------|-------------|
| Docker | Container platform |
| Docker Compose | Multi-container orchestration |
| PM2 | Node.js process manager |
| Azure VM | Cloud hosting |

### Storage & Realtime

| Technology | Description |
|------------|-------------|
| MinIO | S3-compatible file storage |
| Supabase Realtime | WebSocket for live updates |
| PostGIS | Geospatial database extension |

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│  Client (React + TypeScript)                                │
│  - Authentication UI                                        │
│  - Order management                                         │
│  - Real-time tracking                                       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Azure VM (Ubuntu)                                          │
│                                                             │
│  ┌─────────────────┐  ┌─────────────────┐                  │
│  │ Node.js Backend │  │ PostgREST       │                  │
│  │ Port 3000       │  │ Port 3001       │                  │
│  │ - Auth (JWT)    │  │ - Auto REST API │                  │
│  │ - Business logic│  │ - CRUD ops      │                  │
│  └────────┬────────┘  └────────┬────────┘                  │
│           │                    │                            │
│           └──────────┬─────────┘                            │
│                      ▼                                      │
│  ┌─────────────────────────────────────────┐               │
│  │ PostgreSQL + PostGIS                    │               │
│  │ Port 5432                               │               │
│  │ - Users, Orders, Driver locations       │               │
│  └─────────────────────────────────────────┘               │
│                                                             │
│  ┌─────────────────┐  ┌─────────────────┐                  │
│  │ Supabase        │  │ MinIO           │                  │
│  │ Realtime        │  │ Port 9000/9001  │                  │
│  │ Port 4000       │  │ - File uploads  │                  │
│  │ - WebSocket     │  │ - Image storage │                  │
│  └─────────────────┘  └─────────────────┘                  │
└─────────────────────────────────────────────────────────────┘
```

## Prerequisites

### Local Machine (for Frontend)

- Node.js 18+
- npm or yarn
- Git

### Server (for Backend)

- Ubuntu 22.04+ VM (Azure, AWS, DigitalOcean, etc.)
- Minimum 2GB RAM, 20GB storage
- Open ports: 22, 3000, 3001, 4000, 5432, 9000, 9001

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)

---

## How to Run the Application

### Part 1: Backend Setup (on VM)

#### 1.1 Connect to your VM

```bash
ssh username@YOUR_VM_IP
```

#### 1.2 Install Docker

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
sudo usermod -aG docker $USER
```

Log out and back in, then verify:

```bash
docker --version
```

#### 1.3 Install Node.js

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo npm install -g pm2
```

#### 1.4 Create Project Directory

```bash
mkdir -p ~/salengman/backend
cd ~/salengman
```

#### 1.5 Create Docker Compose File

```bash
nano docker-compose.yml
```

Paste:

```yaml
services:
  postgres:
    image: postgis/postgis:16-3.4
    container_name: postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: salengman
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

  supabase-rest:
    image: postgrest/postgrest
    container_name: supabase-rest
    restart: unless-stopped
    depends_on:
      postgres:
        condition: service_healthy
    environment:
      PGRST_DB_URI: postgres://postgres:${POSTGRES_PASSWORD}@postgres:5432/salengman
      PGRST_DB_ANON_ROLE: anon
      PGRST_JWT_SECRET: ${JWT_SECRET}
    ports:
      - "3001:3000"

  supabase-realtime:
    image: supabase/realtime:v2.25.50
    container_name: supabase-realtime
    restart: unless-stopped
    depends_on:
      postgres:
        condition: service_healthy
    environment:
      DB_HOST: postgres
      DB_PORT: 5432
      DB_USER: postgres
      DB_PASSWORD: ${POSTGRES_PASSWORD}
      DB_NAME: salengman
      PORT: 4000
      JWT_SECRET: ${JWT_SECRET}
      REPLICATION_MODE: RLS
      REPLICATION_POLL_INTERVAL: 100
      SECURE_CHANNELS: "false"
      SECRET_KEY_BASE: ${SECRET_KEY_BASE}
    ports:
      - "4000:4000"

  minio:
    image: minio/minio
    container_name: minio
    restart: unless-stopped
    environment:
      MINIO_ROOT_USER: admin
      MINIO_ROOT_PASSWORD: ${POSTGRES_PASSWORD}
    command: server /data --console-address ":9001"
    ports:
      - "9000:9000"
      - "9001:9001"
    volumes:
      - minio_data:/data

volumes:
  postgres_data:
  minio_data:
```

Save: `Ctrl + O` → `Enter` → `Ctrl + X`

#### 1.6 Create Environment File

```bash
nano .env
```

Paste (change the values):

```env
POSTGRES_PASSWORD=your-secure-password-here
JWT_SECRET=your-jwt-secret-min-32-characters-long
SECRET_KEY_BASE=your-secret-key-base-min-64-characters
```

#### 1.7 Start Docker Services

```bash
docker compose up -d
```

Wait 30 seconds, then verify:

```bash
docker compose ps
```

All services should show "Up".

#### 1.8 Initialize Database

```bash
docker exec -it postgres psql -U postgres -d salengman
```

Run these SQL commands:

```sql
-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- Create roles
DO $
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN;
  END IF;
END
$;

-- Grant permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Create users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    phone VARCHAR(20),
    full_name VARCHAR(255),
    avatar_url TEXT,
    role VARCHAR(20) DEFAULT 'customer',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create driver_locations table
CREATE TABLE driver_locations (
    driver_id UUID PRIMARY KEY REFERENCES users(id),
    location GEOGRAPHY(POINT, 4326),
    heading DECIMAL(5,2),
    speed DECIMAL(5,2),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create orders table
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES users(id),
    driver_id UUID REFERENCES users(id),
    status VARCHAR(20) DEFAULT 'pending',
    pickup_address TEXT,
    pickup_location GEOGRAPHY(POINT, 4326),
    delivery_address TEXT,
    delivery_location GEOGRAPHY(POINT, 4326),
    price DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Grant table permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
```

Exit PostgreSQL:

```
\q
```

#### 1.9 Setup Node.js Backend

```bash
cd ~/salengman/backend
npm init -y
npm install express cors jsonwebtoken bcryptjs pg dotenv
```

Create server.js:

```bash
nano server.js
```

Paste:

```javascript
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.post('/auth/register', async (req, res) => {
  try {
    const { email, password, full_name, phone, role } = req.body;
    if (!password) {
      return res.status(400).json({ error: 'Password is required' });
    }
    const password_hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (email, password_hash, full_name, phone, role) VALUES ($1, $2, $3, $4, $5) RETURNING id, email, full_name, role',
      [email, password_hash, full_name, phone, role || 'customer']
    );
    const user = result.rows[0];
    const token = jwt.sign({ user_id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ user, token });
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: error.message });
  }
});

app.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }
    const user = result.rows[0];
    if (user.password_hash && password) {
      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) {
        return res.status(401).json({ error: 'Invalid password' });
      }
    }
    const token = jwt.sign({ user_id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ user: { id: user.id, email: user.email, full_name: user.full_name, role: user.role }, token });
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: error.message });
  }
});

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader ? authHeader.split(' ')[1] : null;
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

app.get('/auth/me', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, email, full_name, phone, role, avatar_url FROM users WHERE id = $1',
      [req.user.user_id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
```

Create backend .env:

```bash
nano .env
```

Paste:

```env
PORT=3000
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/salengman
JWT_SECRET=your-jwt-secret-min-32-characters-long
```

#### 1.10 Start Backend with PM2

```bash
pm2 start server.js --name salengman-api
pm2 save
pm2 startup
```

Run the command PM2 shows, then verify:

```bash
pm2 status
curl http://localhost:3000/health
```

---

### Part 2: Frontend Setup (Local Machine)

#### 2.1 Clone the Repository

```bash
git clone <repository-url>
cd SalengMan
```

#### 2.2 Install Dependencies

```bash
npm install
```

#### 2.3 Configure Environment

```bash
cp .env.example .env
```

Edit `.env` and set your VM IP:

```env
VITE_API_URL=http://YOUR_VM_IP:3000
```

#### 2.4 Run Development Server

```bash
npm run dev
```

Open http://localhost:5173 in your browser.

#### 2.5 Build for Production

```bash
npm run build
```

---

### Verify Everything Works

| Check | Command/Action |
|-------|----------------|
| Backend health | `curl http://YOUR_VM_IP:3000/health` |
| Database API | `curl http://YOUR_VM_IP:3001/users` |
| Frontend | Open http://localhost:5173 |
| Register | Create new account in app |
| Login | Login with created account |

---

## Environment Setup

### 1. Create `.env` file

Copy the example environment file and update with your values:

```bash
cp .env.example .env
```

Or create `.env` manually in the project root:

```env
VITE_API_URL=http://YOUR_VM_IP:3000
```

### 2. Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API server URL | `http://20.123.45.67:3000` |

### 3. Important Notes

- Never commit `.env` file to git (it's already in `.gitignore`)
- All environment variables must start with `VITE_` to be accessible in the app
- Restart the dev server after changing `.env` values

## Getting Started

### Install dependencies

```bash
npm install
```

### Run development server

```bash
npm run dev
```

### Build for production

```bash
npm run build
```

## Android

### Run development on android

```bash
npm run tauri dev
```

### Build to android

```bash
npm run tauri android build -- --debug
```

### Install to android

```bash
adb devices
adb install src-tauri/gen/android/app/build/outputs/apk/universal/debug/app-universal-debug.apk
```

## Backend Services

The app connects to the following backend services:

| Service | Port | Description |
|---------|------|-------------|
| Node.js API | 3000 | Authentication & business logic |
| PostgREST | 3001 | Auto-generated REST API |
| Supabase Realtime | 4000 | WebSocket connections |
| PostgreSQL | 5432 | Database with PostGIS |
| MinIO API | 9000 | S3-compatible file storage |
| MinIO Console | 9001 | File management UI |

## API Endpoints

### Authentication (Node.js - Port 3000)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| POST | `/auth/register` | Create new user |
| POST | `/auth/login` | Login, returns JWT |
| GET | `/auth/me` | Get current user (requires token) |
| POST | `/upload` | Upload image (requires token) |

### Database (PostgREST - Port 3001)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/users` | List all users |
| GET | `/orders` | List all orders |
| POST | `/orders` | Create order |
| PATCH | `/orders?id=eq.{id}` | Update order |

## Project Structure

```
SalengMan/
├── src/
│   ├── assets/          # Images, icons
│   ├── config/          # API configuration
│   ├── pages/           # Page components
│   ├── services/        # Auth & API services
│   ├── App.tsx          # Main app component
│   └── main.tsx         # Entry point
├── src-tauri/           # Tauri (desktop) config
├── .env.example         # Environment template
├── package.json
└── README.md
```