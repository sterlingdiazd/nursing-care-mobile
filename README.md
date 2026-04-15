# Nursing Care Mobile

A cross-platform React Native mobile application built with Expo representing an enterprise of on-demand nursing care services and home residential care.

---

## Overview

The Nursing Care Mobile app provides on-the-go access to nursing and residential care management features for both medical personnel and admins.

### Key Features
- **Service Request Management**: Create, list, and view detailed nursing and residential care requests.
- **Admin Dashboard**: Real-time stats and service monitoring on mobile devices.
- **Audit Logs & Notifications**: Real-time tracking and enterprise alert views.
- **Nurse Profiles**: Full support for creating, viewing, and reviewing nurse profiles.
- **Catalog Management**: View and manage system-wide pricing catalogs for all care services.
- **Client & User Management**: Operational tools for managing system users and clients.
- **Diagnostics & Tools**: Built-in backend connectivity tests and client log inspection.

---

## Key Screens & Navigation

### Authentication
- **Login / Register**: Secure authentication with JWT and Google OAuth2 support.
- **Account Tracking**: Profile views and session management.

### Service Requests
- **Create Service Request**: Mobile-optimized form with validation for nursing or residential care.
- **Service List**: Filterable care delivery history.
- **Service Details**: Comprehensive detail views and status transitions.

### Admin Portal (Mobile)
- **Admin Index**: Unified dashboard for mobile admins.
- **Care Requests & Clients**: Mobile-friendly list and management views.
- **Nurse Profiles**: Screens for creating, viewing, and reviewing staff profiles.
- **Audit Logs & Action Items**: Operational monitoring on the go.
- **Pricing Catalog**: View and manage service prices and residential options.
- **Notifications**: Real-time admin alerts.

---

## Tech Stack

- **Framework**: React Native + Expo
- **Routing**: Expo Router (File-based)
- **State Management**: React Context, Custom Hooks
- **Testing**: Vitest + React Testing Library
- **Type Safety**: TypeScript (Strict Mode)

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+
- Expo Go app (for device testing) or iOS Simulator / Android Emulator

### Installation

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment**:
   Create `.env.local` and set `EXPO_PUBLIC_API_BASE_URL` to a backend URL the phone can reach on the same network, preferably using the HTTPS `sslip.io` host exposed by the app config.
   Example: `EXPO_PUBLIC_API_BASE_URL=https://192-168-1-50.sslip.io:5050`

3. **Start the development server**:
   ```bash
   npm start
   ```

### Execution
- Press i for iOS simulator.
- Press a for Android emulator.
- Scan the QR code with Expo Go for physical device testing.
- Google login on native devices uses the in-app browser and returns to the app automatically. If the backend uses a local HTTPS certificate, trust that certificate on the phone before testing Google login.

---

## Available Scripts

- **npm run start**: Run the Expo development server.
- **npm test**: Run the Vitest test suite. **Mandatory: Must pass before commit.**
- **npm run typecheck**: Run TypeScript checks. **Mandatory: Must pass after tests and before commit.**

---

## Project Structure

- **app/**: Screen components and file-based routing structure.
- **src/**: Shared business logic, services, and local configuration.
- **components/**: Mobile-optimized UI components and theme constants.
- **assets/**: Fonts and images.
- **scripts/**: Utility scripts (e.g., port release).

---

## Security & Privacy Note

- **No Secrets in Repo**: Ensure .env.local is listed in .gitignore.
- **No Icons/Emojis**: Documentation files must not contain emojis or icons.
- **Anonymized Examples**: All screenshots and documentation use placeholder data.
- **Public Visibility**: This repository is designed for public transparency; do NOT commit real user data or private information.
