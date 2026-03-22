# Nursing Care Mobile

React Native mobile app (Expo + Expo Router) for nursing care workflows.
Current focus: authenticated care-request creation with device-friendly backend diagnostics.

## Tech Stack

- Expo SDK 54
- React Native 0.81
- React 19
- Expo Router (file-based routing)
- TypeScript (strict mode)

## Project Structure

```text
app/
  _layout.tsx                 Root stack layout + auth provider
  create-care-request.tsx     Care request form screen
  modal.tsx                   Expo template modal screen
  (tabs)/
    index.tsx                 Home tab
    three.tsx                 Auth + logs tab
src/
  config/api.ts               API base URL configuration
  context/AuthContext.tsx     In-memory auth session state
  logging/clientLogger.ts     Mobile UI + request log store
  services/                   Auth, HTTP, and care-request clients
  types/                      Shared DTOs
components/                   Shared UI and theme components
constants/                    Theme constants
assets/                       Fonts and images
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm
- Expo Go app (for device testing) or iOS Simulator / Android Emulator

### Install

```bash
npm install
```

### Run

```bash
npm run start
```

Then choose:

- `i` for iOS simulator
- `a` for Android emulator
- `w` for web
- or scan the QR code with Expo Go

## Available Scripts

- `npm run start` - Start Expo dev server
- `npm run ios` - Start Expo and open iOS
- `npm run android` - Start Expo and open Android
- `npm run web` - Start Expo for web
- `npm test` - Run the mobile Vitest suite
- `npm run typecheck` - Run TypeScript checks

## API Configuration

API base URL is defined in:

- `src/config/api.ts`
- `.env.local` for local overrides
- `.env.example` as the committed template

Shared cross-project source of truth:

- [Environment Matrix](https://github.com/sterlingdiazd/NursingCare/blob/main/ENVIRONMENT_MATRIX.md)

```ts
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || "https://10.0.0.33:5050";
```

For physical devices, use your machine LAN IP and make sure the device trusts the local development certificate.

Environment mapping:

- `local` and `docker`: `EXPO_PUBLIC_API_BASE_URL=<https://<lan-ip>>:5050`
- `staging`: `EXPO_PUBLIC_API_BASE_URL=<https://api-staging.<your-domain>>`
- `production`: `EXPO_PUBLIC_API_BASE_URL=<https://api.<your-domain>>`

## Current Behavior

- `CreateCareRequestScreen` collects:
  - `residentId` (string GUID)
  - `description` (string)
- Basic required-field validation is implemented.
- The screen submits authenticated requests to `/api/care-requests`.
- The `Info` tab supports:
  - email/password login
  - manual JWT token paste
  - backend connectivity test
  - client log inspection with correlation IDs

## Logging

The mobile client logs:

- UI actions
- auth operations
- HTTP request lifecycle events
- correlation IDs for every log row

These are visible in the `Info` tab and can be matched with backend request logs.

## Additional Documentation

- [Project Architecture](./docs/architecture.md)
- [Development Notes](./docs/development-notes.md)
- [Run and Test Guide](./docs/run-and-test-guide.md)
