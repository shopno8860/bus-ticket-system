# EasyTrip Frontend

React + Vite based client application for the EasyTrip Bus Ticket System.

## Tech Stack

- React 19
- Vite 8
- React Router
- Tailwind CSS + DaisyUI
- Recharts

## Prerequisites

- Node.js 20+ (recommended)
- npm 10+ (or compatible npm version)

## Environment Variables

Create a `.env` file in the `frontend` folder:

```env
VITE_API_BASE_URL=http://localhost:3000
```

- `VITE_API_BASE_URL`: Backend API base URL used by frontend API calls.
- If not set, app falls back to `http://localhost:3000`.

## Installation

```bash
npm install
```

## Run in Development

```bash
npm run dev
```

Default Vite dev URL is usually `http://localhost:5173`.

## Build for Production

```bash
npm run build
```

## Preview Production Build

```bash
npm run preview
```

## Frontend Structure (High Level)

- `src/app`: Main app wrapper and routes mounting
- `src/features`: Feature-based modules (auth, bookings, buses, admin, etc.)
- `src/components`: Shared UI components
- `src/services`: Shared API helper(s)
- `src/config`: Runtime config like API base URL

## Backend Dependency

Frontend depends on backend endpoints. Make sure:

- backend server is running,
- CORS allows `http://localhost:5173`,
- `VITE_API_BASE_URL` points to the correct backend host.
