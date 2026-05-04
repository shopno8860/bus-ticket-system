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
- In development, if not set, app falls back to `http://localhost:3000`.
- In production, always set `VITE_API_BASE_URL` (for example your deployed backend URL).

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

## Developer documentation

- **Backend HTTP reference:** with the API running, use Swagger UI at `http://localhost:3000/api/docs` (see backend `README.md` for details). Controllers use `@ApiTags` / `@ApiOperation`; JWT routes show the lock icon after login.
- **Frontend API layer:** feature `*Api.js` modules, `src/services/api.js`, and `src/services/endpoints.js` are documented with JSDoc so your editor can surface method summaries and param hints. Shared hooks (`useFetch`, `useDebounce`, account hooks) and utilities (`formatDate`, `toastHelper`, `pdf`) include short descriptions as well.
