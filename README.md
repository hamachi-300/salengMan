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
| JWT | Authentication tokens |
| bcrypt | Password hashing |

### Infrastructure

| Technology | Description |
|------------|-------------|
| Docker | Container platform |
| Docker Compose | Multi-container orchestration |


### Storage & Geospatial

| Technology | Description |
|------------|-------------|
| MinIO | S3-compatible file storage |
| PostGIS | Geospatial database extension |

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│  Client (React + TypeScript)                                │
│  - Salengman App                                            │
│  - Salengman Driver                                         │
│  - Salengman Admin Web                                      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Azure VM (Ubuntu)                                          │
│                                                             │
│            ┌───────────────────────────┐                    │
│            │      Node.js Backend      │                    │
│            │         Port 3000         │                    │
│            │  - Auth & Business Logic  │                    │
│            └────────┬──────────┬───────┘                    │
│                     │          │                            │
│                     ▼          ▼                            │
│  ┌────────────────────┐      ┌────────────────────┐         │
│  │ PostgreSQL+PostGIS │      │        MinIO       │         │
│  │     Port 5432      │      │    Port 9000/9001  │         │
│  │  - Main Data Store │      │    - Image Storage │         │
│  └────────────────────┘      └────────────────────┘         │
└─────────────────────────────────────────────────────────────┘
```

## Frontend Services

The project consists of three main frontend applications:

| Service | Port | Description |
|---------|------|-------------|
| Salengman App | 1421 | User application (Tauri) |
| Salengman Driver | 1420 | Driver application (Tauri) |
| Salengman Admin | 5173 | Admin Web Console (Vite) |

## Backend Services

The app connects to the following backend services:

| Service | Port | Description |
|---------|------|-------------|
| Node.js API | 3000 | **Primary API** |
| PostgreSQL | 5432 | Database with PostGIS |
| MinIO API | 9000 | S3 File storage |
| MinIO Console | 9001 | File management UI |


## Quick Start (App)
### 1. add .env
``` bash
cp .env.example .env
nano .env
```

```
# Backend API URL
# Replace with your actual server IP address
VITE_API_URL=http://YOUR_VM_IP:3000
```
#### change YOUR_VM_IP to server ip address or localhost if run in local


## Quick Start (Server)

### 1. update & install git
``` bash
sudo apt-get update
sudo apt install git
```

### 2. pull this repository
``` bash
git clone https://github.com/hamachi-300/salengMan.git
```

### 3. add .env file in /backend folder
``` bash
cp .env.example .env
nano .env
```

```
# PostgreSQL Configuration
POSTGRES_USER=salengman
POSTGRES_PASSWORD=your_password
POSTGRES_DB=salengman
DATABASE_URL=postgres://salengman:your_password@localhost:5432/salengman

# JWT Secret (min 32 characters)
JWT_SECRET=your_jwt_secret_at_least_32_chars

# MinIO Configuration
MINIO_ROOT_USER=admin
MINIO_ROOT_PASSWORD=your_minio_password

# Supabase Realtime
SECRET_KEY_BASE=your_secret_key_base

# Public URL for MinIO (REQUIRED: change to your server IP)
# This URL is returned to clients for accessing uploaded images
MINIO_PUBLIC_URL=http://your_server_ip:9000

# Admin Seed Credentials (used for initial database setup)
ADMIN_SEED_EMAIL=your_admin_email
ADMIN_SEED_USERNAME=your_admin_username
ADMIN_SEED_PASSWORD=your_admin_password

VITE_API_URL=http://your_server_ip:3000
```

#### POSTGRES_PASSWORD and MINIO_ROOT_PASSWORD
```
openssl rand -hex 24
```

#### JWT_SECRET
```
openssl rand -hex 48
```

#### SECRET_KEY_BASE
```
openssl rand -hex 64 | tr -d '\n'
```

#### MINIO_PUBLIC_URL
```
MINIO_PUBLIC_URL=http://your-server-ip:9000
```

#### VITE_API_URL
```
VITE_API_URL=http://your_server_ip:3000
```

#### ADMIN_SEED_EMAIL
```
ADMIN_SEED_EMAIL=your-email
```

#### ADMIN_SEED_USERNAME
```
ADMIN_SEED_USERNAME=your-username
```

#### ADMIN_SEED_PASSWORD
```
ADMIN_SEED_PASSWORD=your-password
```

### 4. install docker
``` bash
sudo snap install docker
docker compose up -d --build
```

## Build IOS

### Prerequisites
- macOS operating system
- **Xcode** installed from the Mac App Store.
- Xcode Command Line Tools (`xcode-select --install`).

### Instructions
Since this repository contains two separate applications, you must navigate into the specific app folder before building.

1. **Navigate to the app directory**
   For the user app:
   ```bash
   cd SalengMan
   ```
   *OR* for the driver app:
   ```bash
   cd SalengManDriver
   ```

2. **Initialize iOS project (First time only)**
   ```bash
   npm run tauri ios init
   ```

3. **Build and Open in Xcode**
   ```bash
   npm run tauri ios build -- --open
   ```
   *Note: The `--open` flag opens the generated Xcode project where you can select your physical iPhone or Simulator and hit "Run".*

## Build Android 

### Prerequisites
- **Android Studio** installed.
- Android SDK and NDK installed via Android Studio's SDK Manager.

### Instructions

1. **Navigate to the app directory**
   For the user app:
   ```bash
   cd SalengMan
   ```
   *OR* for the driver app:
   ```bash
   cd SalengManDriver
   ```

2. **Initialize Android project (First time only)**
   ```bash
   npm run tauri android init
   ```

3. **Build APK**
   To produce a debug APK for testing:
   ```bash
   npm run tauri android build -- --debug
   ```
   *Note: To open the project directly in Android Studio instead, run `npm run tauri android build -- --open`.*
   
4. **Install on Device via ADB**
   Once the build completes successfully, connect your Android device or start an emulator and run:
   ```bash
   adb install src-tauri/gen/android/app/build/outputs/apk/universal/debug/app-universal-debug.apk
   ```