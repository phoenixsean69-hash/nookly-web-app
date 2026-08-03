/**
 * NOOKLY_COMBINED_RIDES_FUNCTION
 *
 * One Appwrite Function serves:
 * - existing driver dashboard, assigned rides, tracking and incidents;
 * - student ride requests;
 * - driver marketplace requests and offers;
 * - student offer acceptance and confirmed ride creation;
 * - organization review and approval of driver applications.
 */

import driverHandler from "./driver-handler.js";
import marketplaceHandler from "./marketplace-handler.js";
import organizationHandler from "./organization-handler.js";

const normalizePath = (rawPath) =>
  String(rawPath || "/").replace(/\/+$/, "") || "/";

const isMarketplacePath = (rawPath) => {
  const path = normalizePath(rawPath);

  return (
    path === "/student" ||
    path.startsWith("/student/") ||
    path === "/driver/requests" ||
    path.startsWith("/driver/requests/") ||
    path === "/driver/offers" ||
    path.startsWith("/driver/offers/")
  );
};

const isOrganizationPath = (rawPath) => {
  const path = normalizePath(rawPath);

  return path === "/organization" || path.startsWith("/organization/");
};

export default async (context) => {
  const path = context?.req?.path || "/";

  if (isOrganizationPath(path)) {
    return organizationHandler(context);
  }

  if (isMarketplacePath(path)) {
    return marketplaceHandler(context);
  }

  return driverHandler(context);
};
