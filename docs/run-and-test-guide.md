# Run and Test Guide

This document explains how to run the app locally and what testing options exist today.

## Prerequisites

- Node.js 18+
- npm
- Expo Go app (for device testing) or iOS Simulator / Android Emulator

## Install

```bash
npm install
```

## Run

### Start the dev server

```bash
npm run start
```

Then choose one of the following:

- `i` for iOS simulator
- `a` for Android emulator
- `w` for web
- or open the Expo Go link on a physical device

### Platform shortcuts

```bash
npm run ios
npm run android
npm run web
```

## API Configuration

The API base URL is configured in:

- `src/config/api.ts`

Default value:

```ts
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || "https://10.0.0.33:5050";
```

If you test on a physical device:

1. Set `EXPO_PUBLIC_API_BASE_URL` to your machine LAN IP
2. Trust the backend development certificate on the device
3. Verify `https://<lan-ip>:5050/api/health` opens in Safari before testing in Expo Go

## Testing

### Automated tests

The project currently uses TypeScript verification as the main automated check:

```bash
npx tsc --noEmit
```

### Manual smoke test

1. Start the app with `npm run start`.
2. Open the `Info` tab and tap `Test Backend Connection`.
3. Log in or paste a JWT token.
4. Open the create request screen.
5. Enter a `residentId` and `description`.
6. Submit the form and verify success or error handling.
7. Check the `Info` tab logs for correlation IDs.

## Troubleshooting

- If Metro cannot find the project or hangs, stop the process and re-run `npm run start`.
- If using a device and API calls fail, verify the device and backend are on the same network.
- If Safari shows a privacy warning for the backend URL, trust the local root certificate before testing in Expo Go.
