# rides-organization-api

Secure Appwrite Function used by Nookly Web organizations to review and approve driver onboarding applications.

## Runtime

Node.js 22 or another Appwrite-supported Node.js runtime.

## Entry point

```text
src/main.js
```

## Required environment variables

```text
APPWRITE_DATABASE_ID
APPWRITE_ORGANIZATIONS_COLLECTION_ID
```

Optional table overrides. The defaults shown here match the current Nookly mobile backend:

```text
APPWRITE_RIDE_DRIVERS_TABLE_ID=ride_drivers
APPWRITE_RIDE_VEHICLES_TABLE_ID=ride_vehicles
APPWRITE_RIDE_DRIVER_INSTITUTIONS_TABLE_ID=ride_driver_institutions
```

## Function scopes

Enable scopes that allow the function to:

```text
databases.read
documents.read
rows.read
rows.write
```

## Web environment variable

After creating the function, add its Function ID to the web app and Vercel:

```text
NEXT_PUBLIC_APPWRITE_DRIVER_REVIEW_FUNCTION_ID=rides-organization-api
```

The web client defaults to `rides-organization-api` when the variable is omitted.
