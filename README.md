# Nookly Web — notify a driver after approval

This package keeps the feature inside `phoenixsean69-hash/nookly-web-app` and updates the existing Nookly Push API.

## What changes

- Adds `lib/push-notification.service.ts`.
- Updates `app/dashboard/drivers/[id]/page.tsx` so a successful approval immediately calls the existing push Function.
- Adds the Push API source under `functions/nookly-push-api` for source control.
- Updates the Push API sender lookup so web organization users stored by row ID / `userId` are authorized as `userMode: organization`.
- Does not undo a successful approval when push delivery fails.

## Install

From the root of `nookly-web-app`:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
& ".\install-driver-approval-push.ps1" -ProjectRoot "."
npm run build
```

## Deploy the existing push Function

Upload:

```text
deployment/nookly-push-api-v1.4.3.tar.gz
```

Use the existing push Function, not a new Function.

- Entrypoint: `src/main.js`
- Build command: `npm install`
- Activate after a successful build.

The web service defaults to Function ID `6a31d988001bf962fb57`, which is the ID declared by the uploaded Push API source. If the actual Function ID differs, set this in Nookly Web / Vercel:

```text
NEXT_PUBLIC_APPWRITE_PUSH_FUNCTION_ID=<actual-push-function-id>
```

## Result

After an organization approves a driver:

1. The driver application is approved.
2. The web portal calls `POST /send-to-user` on the existing Push API.
3. The driver receives:

```text
Driver profile approved ✅
Your Nookly driver profile has been approved. You can now go online and accept rides.
```

If the driver has no active Expo push token, approval remains successful and the web portal shows a warning.
