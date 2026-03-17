# Development Notes

## Current State (March 17, 2026)

- Expo Router uses a proper root stack plus tabs.
- `create-care-request.tsx` submits to the backend.
- `three.tsx` is now the auth and diagnostics screen.
- API calls go through a shared HTTP client with correlation IDs.
- Mobile logs are visible in-app.

## Known Gaps

1. Persist auth session across app restarts if desired.
2. Validate `residentId` format as GUID before submission.
3. Add automated tests for auth and form flows.
4. Improve offline/network diagnostics further for device debugging.
5. Decide whether to keep or replace the remaining Expo template modal screen.

## Recommended Next Steps

1. Persist session state securely if token reuse across reloads is needed.
2. Add baseline tests:
   - service tests for request normalization
   - UI tests for auth and validation
3. Remove or replace leftover template screens as the product grows.
4. Consider a small settings screen for environment visibility instead of keeping it only in logs.
