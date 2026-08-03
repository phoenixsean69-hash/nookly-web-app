# Nookly Web Driver Approval Setup

## Complete files in this package

```text
app/dashboard/drivers/page.tsx
app/dashboard/drivers/[id]/page.tsx
components/dashboard/sidebar.tsx
lib/driver-review.service.ts
types/driver-review.ts
functions/rides-organization-api/package.json
functions/rides-organization-api/src/main.js
functions/rides-organization-api/README.md
```

## 1. Copy the web files

Copy the `app`, `components`, `lib`, and `types` folders into the Nookly Web project.

## 2. Create the Appwrite Function

Create a new Appwrite Function with this ID:

```text
rides-organization-api
```

Use the files inside:

```text
functions/rides-organization-api
```

Entry point:

```text
src/main.js
```

Install command:

```text
npm install
```

## 3. Function execute access

Allow authenticated users to execute the function. The function itself verifies that the signed-in account owns an active Nookly organization.

## 4. Function scopes

Enable:

```text
databases.read
documents.read
rows.read
rows.write
```

## 5. Function variables

```text
APPWRITE_DATABASE_ID=6990ba1f00247b886338
APPWRITE_ORGANIZATIONS_COLLECTION_ID=<your organizations collection ID>
APPWRITE_RIDE_DRIVERS_TABLE_ID=ride_drivers
APPWRITE_RIDE_VEHICLES_TABLE_ID=ride_vehicles
APPWRITE_RIDE_DRIVER_INSTITUTIONS_TABLE_ID=ride_driver_institutions
```

Do not put an API key in these variables. Appwrite provides the function dynamic key through `x-appwrite-key`.

## 6. Web and Vercel variable

```text
NEXT_PUBLIC_APPWRITE_DRIVER_REVIEW_FUNCTION_ID=rides-organization-api
```

The document and vehicle preview links reuse the existing public Nookly storage bucket. The service checks these variables in order:

```text
NEXT_PUBLIC_APPWRITE_STORAGE_BUCKET_ID
NEXT_PUBLIC_APPWRITE_PROPERTIES_BUCKET_ID
```

## 7. Validation

Run from the Nookly Web root:

```powershell
npm run build
```

## Approval result

A successful approval updates:

```text
ride_drivers.verificationStatus = verified
ride_drivers.status = active
ride_driver_institutions.status = approved
ride_vehicles.status = active
ride_vehicles.conditionStatus = approved
ride_vehicles.roadworthinessStatus = approved
```

Approval is refused when the driver licence, national ID, vehicle record, or any of the three vehicle images is missing.
