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
  rides: env(
    "APPWRITE_RIDES_TABLE_ID",
    env("EXPO_PUBLIC_APPWRITE_RIDES_COLLECTION_ID", "rides"),
  ),
  bookings: env(
    "APPWRITE_RIDE_BOOKINGS_TABLE_ID",
    "ride_bookings",
  ),
  locations: env(
    "APPWRITE_RIDE_LOCATIONS_TABLE_ID",
    "ride_locations",
  ),
  incidents: env(
    "APPWRITE_RIDE_INCIDENTS_TABLE_ID",
    "ride_incidents",
  ),
  events: env(
    "APPWRITE_RIDE_EVENTS_TABLE_ID",
    "ride_events",
  ),
  safetyAlerts: env(
    "APPWRITE_RIDE_SAFETY_ALERTS_TABLE_ID",
    "ride_safety_alerts",
  ),
  tripCore: env(
    "APPWRITE_RIDE_TRIP_CORE_TABLE_ID",
    "ride_trip_core",
  ),
  tripWaypoints: env(
    "APPWRITE_RIDE_TRIP_WAYPOINTS_TABLE_ID",
    "ride_trip_waypoints",
  ),
  expectedRoutePoints: env(
    "APPWRITE_RIDE_EXPECTED_ROUTE_POINTS_TABLE_ID",
    "ride_expected_route_points",
  ),
};

const ACTIVE_RIDE_STATUSES = new Set(["boarding", "active", "delayed"]);

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

const parseBody = (req) => {
  const bodyText = typeof req.bodyText === "string" ? req.bodyText.trim() : "";
  if (!bodyText) return {};
  try { return JSON.parse(bodyText); } catch { return {}; }
};

const requireString = (value, label, maxLength = 500) => {
  const normalized = String(value ?? "").trim();
  if (!normalized) throw statusError(400, `${label} is required.`);
  if (normalized.length > maxLength) {
    throw statusError(400, `${label} must be ${maxLength} characters or fewer.`);
  }
  return normalized;
};

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

const getActiveRide = async (tablesDB, driverId) => {
  const rides = await listAllRows(
    tablesDB,
    TABLES.rides,
    [Query.equal("driverId", driverId)],
    100,
  );

  return rides.find((ride) => ACTIVE_RIDE_STATUSES.has(normalize(ride.status))) ?? null;
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


const getRowOrNull = async (tablesDB, tableId, rowId) => {
  if (!rowId) return null;

  try {
    return await tablesDB.getRow({
      databaseId: DATABASE_ID,
      tableId,
      rowId,
    });
  } catch {
    return null;
  }
};

const timestampValue = (...values) => {
  for (const value of values) {
    if (!value) continue;
    const timestamp = new Date(value).getTime();
    if (Number.isFinite(timestamp)) return timestamp;
  }

  return 0;
};

const sortNewestFirst = (rows, ...fields) =>
  [...rows].sort((left, right) => {
    const leftTimestamp = timestampValue(
      ...fields.map((field) => left?.[field]),
      left?.$updatedAt,
      left?.$createdAt,
    );
    const rightTimestamp = timestampValue(
      ...fields.map((field) => right?.[field]),
      right?.$updatedAt,
      right?.$createdAt,
    );

    return rightTimestamp - leftTimestamp;
  });

const sortByNumber = (rows, field) =>
  [...rows].sort(
    (left, right) =>
      Number(left?.[field] ?? Number.MAX_SAFE_INTEGER) -
      Number(right?.[field] ?? Number.MAX_SAFE_INTEGER),
  );

const nullableNumber = (value) => {
  if (value === null || value === undefined || value === "") return null;

  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const publicDriver = (driver, ride) => ({
  id: String(driver?.$id || ride?.driverId || ""),
  name: String(driver?.name || ride?.driverName || "Unknown driver"),
  phone: String(driver?.phone || ""),
  email: String(driver?.email || ""),
  avatar: String(driver?.avatar || ride?.driverAvatar || ""),
  status: String(driver?.status || ""),
  verificationStatus: String(driver?.verificationStatus || ""),
  isOnline: Boolean(driver?.isOnline),
  rating: nullableNumber(driver?.rating),
  completedTrips: nullableNumber(driver?.completedTrips),
  lastSeenAt: driver?.lastSeenAt || null,
  emergencyContactName: String(driver?.emergencyContactName || ""),
  emergencyContactPhone: String(driver?.emergencyContactPhone || ""),
});

const publicVehicle = (vehicle, ride) => ({
  id: String(vehicle?.$id || ride?.vehicleId || ""),
  registrationNumber: String(
    vehicle?.registrationNumber || ride?.vehicleRegistration || "",
  ),
  make: String(vehicle?.make || ride?.vehicleMake || ""),
  model: String(vehicle?.model || ride?.vehicleModel || ""),
  color: String(vehicle?.color || ride?.vehicleColor || ""),
  capacity:
    nullableNumber(
      vehicle?.passengerCapacity ??
        vehicle?.capacity ??
        ride?.vehicleCapacity,
    ) ?? 0,
  availableSeats:
    nullableNumber(vehicle?.availableSeats ?? ride?.availableSeats) ?? 0,
  vehicleType: String(vehicle?.vehicleType || ""),
  status: String(vehicle?.status || ""),
  conditionStatus: String(vehicle?.conditionStatus || ""),
  roadworthinessStatus: String(vehicle?.roadworthinessStatus || ""),
  hasSeatbelts:
    vehicle?.hasSeatbelts === null || vehicle?.hasSeatbelts === undefined
      ? null
      : Boolean(vehicle.hasSeatbelts),
  hasAirConditioning:
    vehicle?.hasAirConditioning === null ||
    vehicle?.hasAirConditioning === undefined
      ? null
      : Boolean(vehicle.hasAirConditioning),
  allowsLuggage:
    vehicle?.allowsLuggage === null || vehicle?.allowsLuggage === undefined
      ? null
      : Boolean(vehicle.allowsLuggage),
});

const publicBooking = (booking) => ({
  id: String(booking?.$id || ""),
  studentId: String(booking?.studentId || ""),
  studentName: String(booking?.studentName || ""),
  studentPhone: String(booking?.studentPhone || ""),
  status: String(booking?.status || ""),
  seatCount:
    nullableNumber(booking?.passengerCount ?? booking?.seatCount) ?? 1,
  pickupAddress: String(booking?.pickupAddress || ""),
  pickupLatitude: nullableNumber(booking?.pickupLatitude),
  pickupLongitude: nullableNumber(booking?.pickupLongitude),
  destinationAddress: String(booking?.destinationAddress || ""),
  destinationLatitude: nullableNumber(booking?.destinationLatitude),
  destinationLongitude: nullableNumber(booking?.destinationLongitude),
  paymentStatus: String(booking?.paymentStatus || ""),
  bookingReference: String(booking?.bookingReference || ""),
  bookedAt: booking?.bookedAt || booking?.createdAt || booking?.$createdAt || null,
  boardedAt: booking?.boardedAt || null,
  trackingStartedAt: booking?.trackingStartedAt || null,
  trackingEndedAt: booking?.trackingEndedAt || null,
});

const publicLocation = (location) => {
  if (!location) return null;

  return {
    id: String(location?.$id || ""),
    latitude: nullableNumber(location?.latitude),
    longitude: nullableNumber(location?.longitude),
    heading: nullableNumber(location?.heading),
    speedKph: nullableNumber(location?.speedKph),
    accuracyMeters: nullableNumber(location?.accuracyMeters),
    recordedAt:
      location?.recordedAt ||
      location?.createdAt ||
      location?.$createdAt ||
      null,
    sequence: nullableNumber(location?.sequence),
    source: String(location?.source || ""),
    batteryLevel: nullableNumber(location?.batteryLevel),
    networkType: String(location?.networkType || ""),
    isMocked:
      location?.isMocked === null || location?.isMocked === undefined
        ? null
        : Boolean(location.isMocked),
  };
};

const rideSnapshotLocation = (ride, driver) => {
  const rideLatitude = nullableNumber(ride?.currentLatitude);
  const rideLongitude = nullableNumber(ride?.currentLongitude);

  if (rideLatitude !== null && rideLongitude !== null) {
    return {
      id: "",
      latitude: rideLatitude,
      longitude: rideLongitude,
      heading: nullableNumber(ride?.currentHeading),
      speedKph: nullableNumber(ride?.currentSpeedKph),
      accuracyMeters: nullableNumber(ride?.currentAccuracyMeters),
      recordedAt: ride?.lastLocationAt || ride?.updatedAt || ride?.$updatedAt || null,
      sequence: null,
      source: "ride_snapshot",
      batteryLevel: null,
      networkType: "",
      isMocked: null,
    };
  }

  const driverLatitude = nullableNumber(driver?.currentLatitude);
  const driverLongitude = nullableNumber(driver?.currentLongitude);

  if (driverLatitude !== null && driverLongitude !== null) {
    return {
      id: "",
      latitude: driverLatitude,
      longitude: driverLongitude,
      heading: null,
      speedKph: null,
      accuracyMeters: nullableNumber(driver?.currentAccuracyMeters),
      recordedAt:
        driver?.currentLocationAt ||
        driver?.lastSeenAt ||
        driver?.updatedAt ||
        driver?.$updatedAt ||
        null,
      sequence: null,
      source: "driver_snapshot",
      batteryLevel: null,
      networkType: "",
      isMocked: null,
    };
  }

  return null;
};

const locationMonitoring = (location, ride) => {
  const recordedTimestamp = timestampValue(location?.recordedAt);
  const ageSeconds = recordedTimestamp
    ? Math.max(0, Math.round((Date.now() - recordedTimestamp) / 1000))
    : null;

  const arrivalTimestamp = timestampValue(ride?.estimatedArrivalTime);
  const overdueMinutes =
    arrivalTimestamp && Date.now() > arrivalTimestamp
      ? Math.max(0, Math.round((Date.now() - arrivalTimestamp) / 60000))
      : 0;

  return {
    hasLocation: Boolean(location),
    locationAgeSeconds: ageSeconds,
    locationFresh: ageSeconds !== null ? ageSeconds <= 120 : false,
    locationStale: ageSeconds !== null ? ageSeconds > 120 : true,
    locationCriticallyStale: ageSeconds !== null ? ageSeconds > 300 : true,
    overdue: overdueMinutes > 0,
    overdueMinutes,
  };
};

const listRideRows = async (tablesDB, tableId, rideId, limit = 500) =>
  listAllRows(
    tablesDB,
    tableId,
    [Query.equal("rideId", rideId)],
    limit,
  );

const getInspectableRide = async (
  tablesDB,
  organizationId,
  rideId,
  options = {},
) => {
  const ride = await getRowOrNull(tablesDB, TABLES.rides, rideId);

  if (!ride || String(ride.organizationId || "") !== String(organizationId)) {
    throw statusError(404, "Inspectable ride not found.");
  }

  if (
    options.requireActive !== false &&
    !ACTIVE_RIDE_STATUSES.has(normalize(ride.status))
  ) {
    throw statusError(404, "This ride is not currently active.");
  }

  const [
    driver,
    vehicle,
    bookingRows,
    locationRows,
    incidentRows,
    eventRows,
    safetyAlertRows,
    tripCoreRows,
    waypointRows,
    expectedRouteRows,
  ] = await Promise.all([
    getRowOrNull(tablesDB, TABLES.drivers, ride.driverId),
    getRowOrNull(tablesDB, TABLES.vehicles, ride.vehicleId),
    listRideRows(tablesDB, TABLES.bookings, ride.$id, 500),
    listRideRows(tablesDB, TABLES.locations, ride.$id, 2000),
    listRideRows(tablesDB, TABLES.incidents, ride.$id, 500),
    listRideRows(tablesDB, TABLES.events, ride.$id, 1000),
    listRideRows(tablesDB, TABLES.safetyAlerts, ride.$id, 500),
    listRideRows(tablesDB, TABLES.tripCore, ride.$id, 10),
    listRideRows(tablesDB, TABLES.tripWaypoints, ride.$id, 100),
    listRideRows(tablesDB, TABLES.expectedRoutePoints, ride.$id, 5000),
  ]);

  const bookings = bookingRows
    .filter(
      (booking) =>
        !["cancelled", "rejected"].includes(normalize(booking?.status)),
    )
    .map(publicBooking);

  const locations = sortByNumber(
    locationRows,
    "sequence",
  ).map(publicLocation);

  const latestLocationRow =
    sortNewestFirst(locationRows, "recordedAt", "createdAt")[0] ?? null;

  const currentLocation =
    publicLocation(latestLocationRow) ||
    rideSnapshotLocation(ride, driver);

  const incidents = sortNewestFirst(
    incidentRows,
    "updatedAt",
    "createdAt",
  ).map((incident) => ({
    id: String(incident?.$id || ""),
    category: String(incident?.category || ""),
    description: String(incident?.description || ""),
    reporterType: String(incident?.reporterType || ""),
    status: String(incident?.status || ""),
    priority: String(incident?.priority || ""),
    latitude: nullableNumber(incident?.latitude),
    longitude: nullableNumber(incident?.longitude),
    createdAt: incident?.createdAt || incident?.$createdAt || null,
    acknowledgedAt: incident?.acknowledgedAt || null,
    resolvedAt: incident?.resolvedAt || null,
  }));

  const events = sortNewestFirst(eventRows, "createdAt").map((event) => ({
    id: String(event?.$id || ""),
    eventType: String(event?.eventType || ""),
    message: String(event?.message || ""),
    actorType: String(event?.actorType || ""),
    createdAt: event?.createdAt || event?.$createdAt || null,
  }));

  const safetyAlerts = sortNewestFirst(
    safetyAlertRows,
    "detectedAt",
    "createdAt",
  ).map((alert) => ({
    id: String(alert?.$id || ""),
    alertType: String(alert?.alertType || ""),
    severity: String(alert?.severity || ""),
    status: String(alert?.status || ""),
    expectedLatitude: nullableNumber(alert?.expectedLatitude),
    expectedLongitude: nullableNumber(alert?.expectedLongitude),
    actualLatitude: nullableNumber(alert?.actualLatitude),
    actualLongitude: nullableNumber(alert?.actualLongitude),
    distanceFromRouteMeters: nullableNumber(
      alert?.distanceFromRouteMeters,
    ),
    deviationDurationSeconds: nullableNumber(
      alert?.deviationDurationSeconds,
    ),
    driverExplanation: String(alert?.driverExplanation || ""),
    studentResponse: String(alert?.studentResponse || ""),
    detectedAt: alert?.detectedAt || alert?.createdAt || alert?.$createdAt || null,
    acknowledgedAt: alert?.acknowledgedAt || null,
    resolvedAt: alert?.resolvedAt || null,
  }));

  const tripCore = tripCoreRows[0] ?? null;

  const waypoints = sortByNumber(waypointRows, "stopOrder").map(
    (waypoint) => ({
      id: String(waypoint?.$id || ""),
      waypointType: String(waypoint?.waypointType || ""),
      address: String(waypoint?.address || ""),
      latitude: nullableNumber(waypoint?.latitude),
      longitude: nullableNumber(waypoint?.longitude),
      stopOrder: nullableNumber(waypoint?.stopOrder),
    }),
  );

  const expectedRoute = sortByNumber(
    expectedRouteRows,
    "sequence",
  ).map((point) => ({
    id: String(point?.$id || ""),
    sequence: nullableNumber(point?.sequence),
    latitude: nullableNumber(point?.latitude),
    longitude: nullableNumber(point?.longitude),
  }));

  const openIncidents = incidents.filter(
    (incident) =>
      !["resolved", "closed"].includes(normalize(incident.status)),
  );

  const openSafetyAlerts = safetyAlerts.filter(
    (alert) =>
      !["resolved", "closed", "dismissed"].includes(normalize(alert.status)),
  );

  const pickupWaypoint =
    waypoints.find((waypoint) => normalize(waypoint.waypointType) === "pickup") ||
    null;
  const destinationWaypoint =
    waypoints.find(
      (waypoint) =>
        ["destination", "dropoff"].includes(
          normalize(waypoint.waypointType),
        ),
    ) || null;

  const firstBooking = bookings[0] ?? null;

  return {
    id: String(ride.$id),
    organizationId: String(ride.organizationId || ""),
    institutionId: String(ride.institutionId || ""),
    status: String(ride.status || ""),
    rideType: String(ride.rideType || ""),
    schoolLocation: String(ride.schoolLocation || ""),
    departureTime: ride.departureTime || null,
    estimatedArrivalTime: ride.estimatedArrivalTime || null,
    startedAt: ride.startedAt || null,
    completedAt: ride.completedAt || null,
    fare: nullableNumber(ride.fare),
    currency: String(ride.currency || ""),
    totalSeats: nullableNumber(ride.totalSeats) ?? 0,
    bookedSeats: nullableNumber(ride.bookedSeats) ?? 0,
    availableSeats: nullableNumber(ride.availableSeats) ?? 0,
    passengerCount:
      nullableNumber(
        ride.passengerCount ??
          bookings.reduce(
            (total, booking) => total + Number(booking.seatCount || 0),
            0,
          ),
      ) ?? 0,
    bookingOpen: Boolean(ride.bookingOpen),
    pickup: {
      address: String(
        ride.pickupAddress ||
          firstBooking?.pickupAddress ||
          pickupWaypoint?.address ||
          "",
      ),
      latitude:
        nullableNumber(ride.pickupLatitude) ??
        firstBooking?.pickupLatitude ??
        pickupWaypoint?.latitude ??
        null,
      longitude:
        nullableNumber(ride.pickupLongitude) ??
        firstBooking?.pickupLongitude ??
        pickupWaypoint?.longitude ??
        null,
    },
    destination: {
      address: String(
        ride.destinationAddress ||
          firstBooking?.destinationAddress ||
          destinationWaypoint?.address ||
          "",
      ),
      latitude:
        nullableNumber(ride.destinationLatitude) ??
        firstBooking?.destinationLatitude ??
        destinationWaypoint?.latitude ??
        null,
      longitude:
        nullableNumber(ride.destinationLongitude) ??
        firstBooking?.destinationLongitude ??
        destinationWaypoint?.longitude ??
        null,
    },
    expectedDistanceKm:
      nullableNumber(
        tripCore?.expectedDistanceKm ?? ride.expectedDistanceKm,
      ),
    expectedDurationMinutes:
      nullableNumber(
        tripCore?.expectedDurationMinutes ??
          ride.expectedDurationMinutes,
      ),
    routeCorridorMeters:
      nullableNumber(tripCore?.routeCorridorMeters),
    driver: publicDriver(driver, ride),
    vehicle: publicVehicle(vehicle, ride),
    student: firstBooking
      ? {
          id: firstBooking.studentId,
          name: firstBooking.studentName,
          phone: firstBooking.studentPhone,
        }
      : null,
    bookings,
    currentLocation,
    travelledPath: locations,
    expectedRoute,
    waypoints,
    incidents,
    events,
    safetyAlerts,
    counts: {
      bookings: bookings.length,
      openIncidents: openIncidents.length,
      openSafetyAlerts: openSafetyAlerts.length,
      routePoints: expectedRoute.length,
      travelledPoints: locations.length,
    },
    monitoring: {
      ...locationMonitoring(currentLocation, ride),
      hasBookingData: bookings.length > 0,
      hasTravelledPath: locations.length > 0,
      hasExpectedRoute: expectedRoute.length > 0,
      hasOpenIncident: openIncidents.length > 0,
      hasOpenSafetyAlert: openSafetyAlerts.length > 0,
    },
    createdAt: ride.createdAt || ride.$createdAt || null,
    updatedAt: ride.updatedAt || ride.$updatedAt || null,
  };
};

const listInspectableRides = async (tablesDB, organizationId) => {
  const rides = await listAllRows(
    tablesDB,
    TABLES.rides,
    [Query.equal("organizationId", organizationId)],
    500,
  );

  const activeRides = rides
    .filter((ride) => ACTIVE_RIDE_STATUSES.has(normalize(ride.status)))
    .sort(
      (left, right) =>
        timestampValue(
          right.startedAt,
          right.departureTime,
          right.updatedAt,
          right.$updatedAt,
        ) -
        timestampValue(
          left.startedAt,
          left.departureTime,
          left.updatedAt,
          left.$updatedAt,
        ),
    )
    .slice(0, 100);

  const inspections = await Promise.all(
    activeRides.map((ride) =>
      getInspectableRide(tablesDB, organizationId, ride.$id).catch(
        () => null,
      ),
    ),
  );

  return inspections.filter(Boolean).map((inspection) => ({
    id: inspection.id,
    organizationId: inspection.organizationId,
    status: inspection.status,
    rideType: inspection.rideType,
    schoolLocation: inspection.schoolLocation,
    departureTime: inspection.departureTime,
    estimatedArrivalTime: inspection.estimatedArrivalTime,
    startedAt: inspection.startedAt,
    passengerCount: inspection.passengerCount,
    pickup: inspection.pickup,
    destination: inspection.destination,
    driver: inspection.driver,
    vehicle: inspection.vehicle,
    student: inspection.student,
    currentLocation: inspection.currentLocation,
    counts: inspection.counts,
    monitoring: inspection.monitoring,
    updatedAt: inspection.updatedAt,
  }));
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

  if (normalize(application.institution.status) === "suspended") {
    throw statusError(409, "This driver is suspended. Use the reinstate action instead.");
  }

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


const suspendApplication = async ({
  tablesDB,
  organization,
  accountId,
  driverId,
  reason,
}) => {
  const application = await buildApplication(
    tablesDB,
    organization.$id,
    driverId,
  );

  if (normalize(application.institution.status) === "suspended") {
    const activeRide = await getActiveRide(tablesDB, driverId);
    return {
      application,
      activeRideContinues: Boolean(activeRide),
      ...(activeRide ? { activeRideId: activeRide.$id } : {}),
    };
  }

  if (!APPROVED_RELATIONSHIP_STATUSES.has(normalize(application.institution.status))) {
    throw statusError(409, "Only an approved driver can be suspended.");
  }

  const suspensionReason = requireString(reason, "Suspension reason", 500);
  const timestamp = nowIso();
  const activeRide = await getActiveRide(tablesDB, driverId);
  const relationship = application.institution;
  const profile = application.profile;

  const previousRelationship = {
    status: relationship.status,
    suspensionReason: relationship.suspensionReason ?? null,
    suspendedAt: relationship.suspendedAt ?? null,
    suspendedBy: relationship.suspendedBy ?? null,
    updatedAt: relationship.updatedAt,
  };

  await tablesDB.updateRow({
    databaseId: DATABASE_ID,
    tableId: TABLES.driverInstitutions,
    rowId: relationship.$id,
    data: {
      status: "suspended",
      suspensionReason,
      suspendedAt: timestamp,
      suspendedBy: accountId,
      updatedAt: timestamp,
    },
  });

  if (!activeRide) {
    try {
      await tablesDB.updateRow({
        databaseId: DATABASE_ID,
        tableId: TABLES.drivers,
        rowId: profile.$id,
        data: {
          isOnline: false,
          availabilityNote: `Suspended by ${getOrganizationName(organization)}. ${suspensionReason}`.slice(0, 500),
          updatedAt: timestamp,
        },
      });
    } catch (updateError) {
      await tablesDB.updateRow({
        databaseId: DATABASE_ID,
        tableId: TABLES.driverInstitutions,
        rowId: relationship.$id,
        data: previousRelationship,
      });
      throw updateError;
    }
  }

  return {
    application: await buildApplication(tablesDB, organization.$id, driverId),
    activeRideContinues: Boolean(activeRide),
    ...(activeRide ? { activeRideId: activeRide.$id } : {}),
  };
};

const reinstateApplication = async ({
  tablesDB,
  organization,
  driverId,
}) => {
  const application = await buildApplication(
    tablesDB,
    organization.$id,
    driverId,
  );

  if (normalize(application.institution.status) !== "suspended") {
    if (application.marketplaceReady) return application;
    throw statusError(409, "This driver is not currently suspended.");
  }

  const timestamp = nowIso();

  await tablesDB.updateRow({
    databaseId: DATABASE_ID,
    tableId: TABLES.driverInstitutions,
    rowId: application.institution.$id,
    data: {
      status: "approved",
      suspensionReason: null,
      suspendedAt: null,
      suspendedBy: null,
      updatedAt: timestamp,
    },
  });

  await tablesDB.updateRow({
    databaseId: DATABASE_ID,
    tableId: TABLES.drivers,
    rowId: application.profile.$id,
    data: {
      isOnline: false,
      availabilityNote: `Reinstated by ${getOrganizationName(organization)}.`,
      updatedAt: timestamp,
    },
  });

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
    const body = parseBody(req);

    if (method === "GET" && path === "/organization/rides/inspection") {
      const rides = await listInspectableRides(
        tablesDB,
        organization.$id,
      );

      return ok(res, {
        rides,
        total: rides.length,
        generatedAt: nowIso(),
      });
    }

    if (
      method === "GET" &&
      parts.length === 4 &&
      parts[0] === "organization" &&
      parts[1] === "rides" &&
      parts[3] === "inspection"
    ) {
      return ok(
        res,
        await getInspectableRide(
          tablesDB,
          organization.$id,
          parts[2],
        ),
      );
    }

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


    if (
      method === "POST" &&
      parts.length === 4 &&
      parts[0] === "organization" &&
      parts[1] === "drivers" &&
      parts[3] === "suspend"
    ) {
      const suspended = await suspendApplication({
        tablesDB,
        organization,
        accountId,
        driverId: parts[2],
        reason: body.reason,
      });

      log?.(`Organization ${organization.$id} suspended driver ${parts[2]}.`);
      return ok(res, suspended);
    }

    if (
      method === "POST" &&
      parts.length === 4 &&
      parts[0] === "organization" &&
      parts[1] === "drivers" &&
      parts[3] === "reinstate"
    ) {
      const reinstated = await reinstateApplication({
        tablesDB,
        organization,
        driverId: parts[2],
      });

      log?.(`Organization ${organization.$id} reinstated driver ${parts[2]}.`);
      return ok(res, reinstated);
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
