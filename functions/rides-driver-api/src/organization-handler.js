import { Client, Databases, Query, TablesDB } from "node-appwrite";

const env = (name, fallback = "") => process.env[name]?.trim() || fallback;

const DATABASE_ID = env(
  "APPWRITE_DATABASE_ID",
  env("EXPO_PUBLIC_APPWRITE_DATABASE_ID"),
);
const ORGANIZATIONS_COLLECTION_ID = env(
  "APPWRITE_ORGANIZATIONS_COLLECTION_ID",
  env("EXPO_PUBLIC_APPWRITE_ORGANIZATIONS_COLLECTION_ID"),
);

const TABLES = {
  drivers: env(
    "APPWRITE_RIDE_DRIVERS_TABLE_ID",
    env("EXPO_PUBLIC_APPWRITE_RIDE_DRIVERS_COLLECTION_ID", "ride_drivers"),
  ),
  vehicles: env(
    "APPWRITE_RIDE_VEHICLES_TABLE_ID",
    env("EXPO_PUBLIC_APPWRITE_RIDE_VEHICLES_COLLECTION_ID", "ride_vehicles"),
  ),
  driverInstitutions: env(
    "APPWRITE_RIDE_DRIVER_INSTITUTIONS_TABLE_ID",
    "ride_driver_institutions",
  ),
};

const APPROVED_RELATIONSHIP_STATUSES = new Set([
  "active",
  "approved",
  "acknowledged",
  "verified",
]);

const normalize = (value) =>
  String(value ?? "")
    .trim()
    .toLowerCase();

const nowIso = () => new Date().toISOString();

const ok = (res, data, status = 200) =>
  res.json({ ok: true, data }, status);

const fail = (res, status, message) =>
  res.json({ ok: false, error: message }, status);

const statusError = (statusCode, message) =>
  Object.assign(new Error(message), { statusCode });

const requiredConfig = () => {
  if (!DATABASE_ID || !ORGANIZATIONS_COLLECTION_ID) {
    throw statusError(
      500,
      "The rides function is missing database or organizations configuration.",
    );
  }
};

const listAllRows = async (
  tablesDB,
  tableId,
  queries = [],
  limit = 500,
) => {
  const rows = [];
  const pageSize = Math.min(100, limit);

  for (let offset = 0; offset < limit; offset += pageSize) {
    const response = await tablesDB.listRows({
      databaseId: DATABASE_ID,
      tableId,
      queries: [
        ...queries,
        Query.limit(pageSize),
        Query.offset(offset),
      ],
    });

    rows.push(...response.rows);

    if (
      response.rows.length < pageSize ||
      rows.length >= Number(response.total ?? rows.length)
    ) {
      break;
    }
  }

  return rows.slice(0, limit);
};

const getOrganizationName = (organization) =>
  String(
    organization?.name ||
      organization?.organizationName ||
      organization?.institutionName ||
      organization?.schoolName ||
      "Organization",
  ).trim();

const getSignedInOrganization = async (databases, accountId) => {
  const response = await databases.listDocuments({
    databaseId: DATABASE_ID,
    collectionId: ORGANIZATIONS_COLLECTION_ID,
    queries: [Query.equal("userId", accountId), Query.limit(1)],
  });

  const organization = response.documents[0] ?? null;

  if (!organization) {
    throw statusError(
      403,
      "This account is not linked to a Nookly organization.",
    );
  }

  if (organization.isActive === false) {
    throw statusError(403, "This Nookly organization is inactive.");
  }

  return organization;
};

const getDriver = async (tablesDB, driverId) => {
  try {
    return await tablesDB.getRow({
      databaseId: DATABASE_ID,
      tableId: TABLES.drivers,
      rowId: driverId,
    });
  } catch {
    throw statusError(404, "Driver application not found.");
  }
};

const getOrganizationRelationship = async (
  tablesDB,
  organizationId,
  driverId,
) => {
  const relationships = await listAllRows(
    tablesDB,
    TABLES.driverInstitutions,
    [
      Query.equal("organizationId", organizationId),
      Query.equal("driverId", driverId),
    ],
    5,
  );

  const relationship = relationships[0] ?? null;

  if (!relationship) {
    throw statusError(
      403,
      "This driver did not apply to your organization.",
    );
  }

  return relationship;
};

const getDriverVehicles = async (tablesDB, driverId) =>
  listAllRows(
    tablesDB,
    TABLES.vehicles,
    [Query.equal("driverId", driverId)],
    50,
  );

const vehicleTimestamp = (vehicle) =>
  new Date(
    vehicle?.vehicleImagesSubmittedAt ||
      vehicle?.updatedAt ||
      vehicle?.$updatedAt ||
      vehicle?.createdAt ||
      vehicle?.$createdAt ||
      0,
  ).getTime();

const hasCompleteVehicleImages = (vehicle) =>
  Boolean(
    vehicle?.frontImageFileId &&
      vehicle?.sideImageFileId &&
      vehicle?.backImageFileId,
  );

const selectPrimaryVehicle = (vehicles) => {
  const completeVehicles = vehicles.filter(hasCompleteVehicleImages);
  const candidates = completeVehicles.length > 0 ? completeVehicles : vehicles;

  return (
    [...candidates].sort(
      (left, right) => vehicleTimestamp(right) - vehicleTimestamp(left),
    )[0] ?? null
  );
};

const applicationRequirements = (profile, primaryVehicle) => {
  const hasDriverLicence = Boolean(profile?.driverLicenceFileId);
  const hasNationalId = Boolean(profile?.nationalIdFileId);
  const hasVehicle = Boolean(primaryVehicle);
  const completeImages = hasCompleteVehicleImages(primaryVehicle);

  return {
    hasDriverLicence,
    hasNationalId,
    hasCompleteVehicleImages: completeImages,
    hasVehicle,
    readyForApproval:
      hasDriverLicence && hasNationalId && hasVehicle && completeImages,
  };
};

const marketplaceReady = (profile, relationship, primaryVehicle) =>
  normalize(profile?.status) === "active" &&
  normalize(profile?.verificationStatus) === "verified" &&
  APPROVED_RELATIONSHIP_STATUSES.has(normalize(relationship?.status)) &&
  normalize(primaryVehicle?.status) === "active" &&
  normalize(primaryVehicle?.conditionStatus) === "approved" &&
  normalize(primaryVehicle?.roadworthinessStatus) === "approved" &&
  hasCompleteVehicleImages(primaryVehicle);

const buildApplication = async (
  tablesDB,
  organizationId,
  driverId,
  suppliedRelationship,
) => {
  const [profile, relationship, vehicles] = await Promise.all([
    getDriver(tablesDB, driverId),
    suppliedRelationship
      ? Promise.resolve(suppliedRelationship)
      : getOrganizationRelationship(tablesDB, organizationId, driverId),
    getDriverVehicles(tablesDB, driverId),
  ]);

  if (String(relationship.organizationId || "") !== String(organizationId)) {
    throw statusError(
      403,
      "This driver application belongs to another organization.",
    );
  }

  const primaryVehicle = selectPrimaryVehicle(vehicles);

  return {
    profile,
    institution: relationship,
    vehicles,
    primaryVehicle,
    requirements: applicationRequirements(profile, primaryVehicle),
    marketplaceReady: marketplaceReady(
      profile,
      relationship,
      primaryVehicle,
    ),
  };
};

const listOrganizationApplications = async (tablesDB, organizationId) => {
  const relationships = await listAllRows(
    tablesDB,
    TABLES.driverInstitutions,
    [Query.equal("organizationId", organizationId)],
    500,
  );

  const applications = await Promise.all(
    relationships.map((relationship) =>
      buildApplication(
        tablesDB,
        organizationId,
        relationship.driverId,
        relationship,
      ).catch(() => null),
    ),
  );

  return applications
    .filter(Boolean)
    .sort((left, right) => {
      const leftDate = new Date(
        left.profile.documentsSubmittedAt ||
          left.institution.createdAt ||
          left.institution.$createdAt ||
          0,
      ).getTime();
      const rightDate = new Date(
        right.profile.documentsSubmittedAt ||
          right.institution.createdAt ||
          right.institution.$createdAt ||
          0,
      ).getTime();

      return rightDate - leftDate;
    });
};

const approveApplication = async ({
  tablesDB,
  organization,
  accountId,
  driverId,
}) => {
  const application = await buildApplication(
    tablesDB,
    organization.$id,
    driverId,
  );

  if (application.marketplaceReady) {
    return application;
  }

  if (!application.requirements.readyForApproval) {
    const missing = [];

    if (!application.requirements.hasDriverLicence) {
      missing.push("driver licence");
    }

    if (!application.requirements.hasNationalId) {
      missing.push("national ID");
    }

    if (!application.requirements.hasVehicle) {
      missing.push("vehicle profile");
    } else if (!application.requirements.hasCompleteVehicleImages) {
      missing.push("front, side, and back vehicle images");
    }

    throw statusError(
      409,
      `This application cannot be approved yet. Missing: ${missing.join(", ")}.`,
    );
  }

  const timestamp = nowIso();
  const profile = application.profile;
  const relationship = application.institution;
  const vehicle = application.primaryVehicle;

  const previous = {
    profile: {
      verificationStatus: profile.verificationStatus,
      status: profile.status,
      isOnline: profile.isOnline,
      availabilityNote: profile.availabilityNote,
      updatedAt: profile.updatedAt,
    },
    relationship: {
      status: relationship.status,
      verifiedBy: relationship.verifiedBy,
      verifiedAt: relationship.verifiedAt,
      updatedAt: relationship.updatedAt,
    },
    vehicle: {
      status: vehicle.status,
      conditionStatus: vehicle.conditionStatus,
      roadworthinessStatus: vehicle.roadworthinessStatus,
      lastInspectionAt: vehicle.lastInspectionAt,
      updatedAt: vehicle.updatedAt,
    },
  };

  let profileUpdated = false;
  let relationshipUpdated = false;

  try {
    await tablesDB.updateRow({
      databaseId: DATABASE_ID,
      tableId: TABLES.drivers,
      rowId: profile.$id,
      data: {
        verificationStatus: "verified",
        status: "active",
        isOnline: false,
        availabilityNote: `Approved by ${getOrganizationName(organization)}.`,
        updatedAt: timestamp,
      },
    });
    profileUpdated = true;

    await tablesDB.updateRow({
      databaseId: DATABASE_ID,
      tableId: TABLES.driverInstitutions,
      rowId: relationship.$id,
      data: {
        status: "approved",
        verifiedBy: accountId,
        verifiedAt: timestamp,
        updatedAt: timestamp,
      },
    });
    relationshipUpdated = true;

    await tablesDB.updateRow({
      databaseId: DATABASE_ID,
      tableId: TABLES.vehicles,
      rowId: vehicle.$id,
      data: {
        status: "active",
        conditionStatus: "approved",
        roadworthinessStatus: "approved",
        lastInspectionAt: timestamp,
        updatedAt: timestamp,
      },
    });
  } catch (updateError) {
    const rollbacks = [];

    if (profileUpdated) {
      rollbacks.push(
        tablesDB.updateRow({
          databaseId: DATABASE_ID,
          tableId: TABLES.drivers,
          rowId: profile.$id,
          data: previous.profile,
        }),
      );
    }

    if (relationshipUpdated) {
      rollbacks.push(
        tablesDB.updateRow({
          databaseId: DATABASE_ID,
          tableId: TABLES.driverInstitutions,
          rowId: relationship.$id,
          data: previous.relationship,
        }),
      );
    }

    await Promise.allSettled(rollbacks);
    throw updateError;
  }

  return buildApplication(tablesDB, organization.$id, driverId);
};

export default async ({ req, res, log, error }) => {
  try {
    requiredConfig();

    const method = String(req.method || "GET").toUpperCase();
    const path = String(req.path || "/").replace(/\/+$/, "") || "/";
    const accountId = req.headers["x-appwrite-user-id"];

    if (!accountId) {
      return fail(res, 401, "Sign in with an organization account to continue.");
    }

    const client = new Client()
      .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT)
      .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
      .setKey(req.headers["x-appwrite-key"]);

    const databases = new Databases(client);
    const tablesDB = new TablesDB(client);
    const organization = await getSignedInOrganization(databases, accountId);
    const parts = path.split("/").filter(Boolean);

    if (method === "GET" && path === "/organization/drivers") {
      const applications = await listOrganizationApplications(
        tablesDB,
        organization.$id,
      );

      return ok(res, applications);
    }

    if (
      method === "GET" &&
      parts.length === 3 &&
      parts[0] === "organization" &&
      parts[1] === "drivers"
    ) {
      return ok(
        res,
        await buildApplication(tablesDB, organization.$id, parts[2]),
      );
    }

    if (
      method === "POST" &&
      parts.length === 4 &&
      parts[0] === "organization" &&
      parts[1] === "drivers" &&
      parts[3] === "approve"
    ) {
      const approved = await approveApplication({
        tablesDB,
        organization,
        accountId,
        driverId: parts[2],
      });

      log?.(
        `Organization ${organization.$id} approved driver ${parts[2]}.`,
      );

      return ok(res, approved);
    }

    return fail(res, 404, "Organization driver-review route not found.");
  } catch (caughtError) {
    const statusCode = Number(caughtError?.statusCode || 500);
    const message =
      caughtError instanceof Error
        ? caughtError.message
        : "Organization driver-review request failed.";

    error?.(caughtError);
    return fail(res, statusCode, message);
  }
};
