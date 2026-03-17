# Project Architecture

## Overview

This app uses Expo Router file-based navigation and a small feature module under `src/` for care request, auth, and logging logic.

Core flows:

1. User fills create care request form.
2. User authenticates with backend credentials or a pasted JWT.
3. Form validates required fields.
4. Request is submitted to the backend API.
5. Client and backend logs are correlated with `X-Correlation-ID`.

## Routing

Routes are based on `app/` file paths:

- `/` -> `app/_layout.tsx` -> `(tabs)` stack root
- `/create-care-request` -> `app/create-care-request.tsx`
- `/modal` -> `app/modal.tsx`
- Tab group screens under `app/(tabs)/...`
- `+not-found` handles unknown routes

## Layers

### UI Layer

- Screen components in `app/*.tsx`
- Shared UI helpers in `components/`

Responsibilities:

- Render form fields and controls
- Capture user input
- Show validation and feedback

### Domain Types

- `src/types/careRequest.ts`
- `src/types/auth.ts`

Contains DTOs used between UI and service layers:

- `CreateCareRequestDto`

### Service Layer

- `src/services/careRequestService.ts`
- `src/services/authService.ts`
- `src/services/httpClient.ts`

Responsibilities:

- Perform authenticated HTTP requests
- Attach correlation IDs and client headers
- Handle non-OK responses
- Throw normalized errors for UI handling

### Configuration

- `src/config/api.ts`

### Session State

- `src/context/AuthContext.tsx`

Responsibilities:

- Hold JWT token, email, and roles in memory
- Expose login/logout/manual-token actions

### Client Logging

- `src/logging/clientLogger.ts`

Responsibilities:

- Record UI and HTTP events
- Ensure every log entry has a correlation ID
- Expose logs to the `Info` tab

Defines `API_BASE_URL` used by services.

## Data Flow

Intended flow:

1. Auth screen calls `login()` or saves a JWT manually.
2. `AuthContext` stores the active session in memory.
3. Create screen builds `CreateCareRequestDto`.
4. Create screen calls `createCareRequest(dto, token)`.
5. HTTP client POSTs to `${API_BASE_URL}/api/care-requests`.
6. Request/response logs include correlation IDs and client metadata.
7. UI presents success or failure alerts.

## TypeScript and Imports

- `strict: true` in `tsconfig.json`
- Path alias `@/*` maps to project root for cleaner imports

## Platform Notes

- Web root HTML customization in `app/+html.tsx`
- Expo splash/font preloading in root layout
- Physical-device testing expects HTTPS trust for the local backend certificate
