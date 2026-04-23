# Gemini Mobile Bootloader

Use `../../AGENTS.md` as the workspace contract.

Load `../../NursingCareDocumentation/` guides and specs when the task affects behavior, validation, auth, or route flow.

Mobile-specific rules:
- keep user-facing copy in Spanish
- preserve web parity for shared flows
- use literal stable automation selectors with matching `testID` and `nativeID`
- keep Expo Router behavior aligned with the existing route structure
- run targeted `npm test` checks and `npm run typecheck`

Software Development Life Cycle (SDLC) state remains under `../../NursingCareDocumentation/docs/sdlc/`.
Keep handoffs compact and prefer referenced artifacts for large outputs.
