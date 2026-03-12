# SalengMan Driver App

The dedicated mobile/desktop application for drivers in the SalengMan ecosystem, built with React, Vite, and Tauri.

## Features

- **Job Management**: View and accept pickup requests from users.
- **Route Guidance**: Map integration to navigate to user pickup locations.
- **Real-time Status Updates**: Share current location and job status with users.
- **Task Scheduling**: Manage current and upcoming tasks.

## Prerequisites

- **Node.js** (v18+)
- **Rust** (for Tauri builds)
- Mobile SDKs (Xcode for iOS, Android Studio for Android)

## Development Setup

### 1. Configure Environment
```bash
cp .env.example .env
```
Update `VITE_API_URL` to point to your backend API.

### 2. Install Dependencies
```bash
npm install
```

### 3. Run Dev Server
```bash
# Web browser
npm run dev

# Tauri Desktop
npm run tauri dev
```

## Build Instructions

### iOS Build
```bash
npm run tauri ios build -- --open
```

### Android Build
```bash
npm run tauri android build -- --debug
```

### Desktop Build
```bash
npm run tauri build
```

## Dashboard Overview
The Driver app focuses on providing a high-visibility dashboard for active tasks:
- **Available Jobs**: New requests in the area.
- **Active Tasks**: Current collections in progress.
- **History**: Completed pickups and earnings.
