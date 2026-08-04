const fs = require('fs');
const path = require('path');

const root = process.cwd();
const dashboardPath = path.join(root, 'app', 'dashboard', 'page.tsx');
const cardPath = path.join(root, 'components', 'dashboard', 'stats-card.tsx');

function read(file) {
  if (!fs.existsSync(file)) {
    throw new Error(`File not found: ${file}`);
  }
  return fs.readFileSync(file, 'utf8');
}

function replaceOnce(source, pattern, replacement, label) {
  const match = source.match(pattern);
  if (!match) {
    throw new Error(`Could not find the ${label} block. No files were written.`);
  }
  return source.replace(pattern, replacement);
}

let dashboard = read(dashboardPath);
let card = read(cardPath);

// ---------------------------------------------------------------------------
// Dashboard page: correct data sources, formulas, pagination and cache scope.
// ---------------------------------------------------------------------------

dashboard = replaceOnce(
  dashboard,
  /import \{ updateOrganizationPropertyCount \} from "@\/lib\/appwrite\/helpers";/,
  `import {
  listOrganizationProperties,
  listOrganizationRequests,
  updateOrganizationPropertyCount,
} from "@/lib/appwrite/helpers";`,
  'dashboard Appwrite helper import',
);

dashboard = replaceOnce(
  dashboard,
  /interface DashboardStats \{([\s\S]*?)  totalTenants: number;/,
  (full, before) => `interface DashboardStats {${before}  totalTenants: number;\n  totalSlots: number;\n  occupiedSlots: number;`,
  'DashboardStats slot fields',
);

dashboard = replaceOnce(
  dashboard,
  /  totalTenants: 0,\r?\n  monthlyRevenue: 0,/,
  `  totalTenants: 0,
  totalSlots: 0,
  occupiedSlots: 0,
  monthlyRevenue: 0,`,
  'initial dashboard slot values',
);

dashboard = replaceOnce(
  dashboard,
  /const \[requestsByProperty, setRequestsByProperty\] = useState<\{ \[key: string\]: any\[\] \}>\(\{\}\);/,
  `const [requestsByProperty, setRequestsByProperty] = useState<
    Record<string, DashboardRequest[]>
  >({});`,
  'request state type',
);

dashboard = replaceOnce(
  dashboard,
  /\/\/ Cache key for historical stats\r?\nconst HISTORICAL_STATS_KEY = ['"]dashboard_historical_stats['"];/,
  `interface DashboardRequest {
  $id: string;
  $createdAt: string;
  $updatedAt?: string;
  propertyId: string;
  propertyName?: string;
  status?: "pending" | "approved" | "rejected" | string;
}

interface PropertySlotSnapshot {
  total: number;
  occupied: number;
  available: number;
}

function toNonNegativeInteger(value: unknown, fallback = 0): number {
  const parsed = Math.floor(Number(value));
  return Number.isFinite(parsed) ? Math.max(0, parsed) : fallback;
}

function getPropertySlotSnapshot(property: Property): PropertySlotSnapshot {
  const legacyCapacity = Math.max(
    1,
    toNonNegativeInteger(property.roomFor, 1),
  );

  const total = Math.max(
    1,
    toNonNegativeInteger(property.totalSlots, legacyCapacity),
  );

  let occupied: number;

  if (property.occupiedSlots !== undefined && property.occupiedSlots !== null) {
    occupied = Math.min(
      total,
      toNonNegativeInteger(property.occupiedSlots),
    );
  } else if (
    property.availableSlots !== undefined &&
    property.availableSlots !== null
  ) {
    const available = Math.min(
      total,
      toNonNegativeInteger(property.availableSlots),
    );
    occupied = total - available;
  } else {
    occupied = property.isAvailable === false ? total : 0;
  }

  return {
    total,
    occupied,
    available: Math.max(0, total - occupied),
  };
}

function getHistoricalStatsKey(organizationId?: string): string | null {
  return organizationId
    ? \`dashboard_historical_stats_\${organizationId}\`
    : null;
}`,
  'dashboard request and slot helpers',
);

dashboard = replaceOnce(
  dashboard,
  /  \/\/ Save current stats as historical data[\s\S]*?  \/\/ Function to process and set dashboard data from properties/,
  `  // Save current stats as historical data
  const saveHistoricalStats = (currentStats: DashboardStats) => {
    const key = getHistoricalStatsKey(organization?.$id);
    if (!key) return;

    const historicalData: HistoricalStats = {
      date: new Date().toISOString(),
      totalProperties: currentStats.totalProperties,
      activeListings: currentStats.activeListings,
      occupiedListings: currentStats.occupiedListings,
      totalViews: currentStats.totalViews,
      monthlyRevenue: currentStats.monthlyRevenue,
      occupancyRate: currentStats.occupancyRate,
      responseRate: currentStats.responseRate,
      satisfactionScore: currentStats.satisfactionScore,
    };

    cacheService.set(key, historicalData, 30 * 24 * 60 * 60 * 1000);
    setHistoricalStats(historicalData);
  };

  // Load historical stats from cache
  const loadHistoricalStats = (): HistoricalStats | null => {
    const key = getHistoricalStatsKey(organization?.$id);
    return key ? cacheService.get<HistoricalStats>(key) : null;
  };

  // Function to process and set dashboard data from properties`,
  'organization-specific historical stats cache',
);

dashboard = replaceOnce(
  dashboard,
  /const processPropertiesData = \(allProperties: Property\[\], tasks: Task\[\] = \[\], allRequests: any\[\] = \[\]\) => \{/,
  `const processPropertiesData = (
  allProperties: Property[],
  tasks: Task[] = [],
  allRequests: DashboardRequest[] = [],
) => {`,
  'dashboard processing signature',
);

dashboard = replaceOnce(
  dashboard,
  /  const requestsByProperty: \{ \[key: string\]: any\[\] \} = \{\};/,
  `  const requestsByProperty: Record<string, DashboardRequest[]> = {};`,
  'requests-by-property type',
);

dashboard = replaceOnce(
  dashboard,
  /  const total = allProperties\.length;[\s\S]*?  \/\/ -------- CALCULATE SATISFACTION SCORE --------/,
  `  const total = allProperties.length;
  const slotSnapshots = allProperties.map(getPropertySlotSnapshot);

  const totalSlots = slotSnapshots.reduce(
    (sum, snapshot) => sum + snapshot.total,
    0,
  );
  const occupiedSlots = slotSnapshots.reduce(
    (sum, snapshot) => sum + snapshot.occupied,
    0,
  );

  // Available listings can still accept at least one tenant.
  const active = slotSnapshots.filter(
    (snapshot) => snapshot.available > 0,
  ).length;

  // Occupied listings are completely full and cannot accept another tenant.
  const occupied = slotSnapshots.filter(
    (snapshot) => snapshot.available === 0,
  ).length;

  const totalViews = allProperties.reduce(
    (sum, property) => sum + toNonNegativeInteger(property.views),
    0,
  );

  const occupancyRate =
    totalSlots > 0
      ? Math.round((occupiedSlots / totalSlots) * 100)
      : 0;

  // This represents people/slots currently occupied, not property capacity.
  const totalTenants = occupiedSlots;

  // Count rent once for each property that currently has at least one occupant.
  const monthlyRevenue = allProperties.reduce((sum, property, index) => {
    if (slotSnapshots[index].occupied <= 0) return sum;
    const price = Number(property.price);
    return sum + (Number.isFinite(price) ? Math.max(0, price) : 0);
  }, 0);

  // A request has been responded to only after it is approved or rejected.
  const totalRequestCount = allRequests.length;
  const respondedRequestCount = allRequests.filter((request) => {
    const status = String(request.status ?? "pending").toLowerCase();
    return status === "approved" || status === "rejected";
  }).length;

  const responseRate =
    totalRequestCount > 0
      ? Math.round((respondedRequestCount / totalRequestCount) * 100)
      : 0;

  // -------- CALCULATE SATISFACTION SCORE --------`,
  'metric calculation formulas',
);

dashboard = replaceOnce(
  dashboard,
  /    totalTenants: totalTenants,\r?\n    monthlyRevenue:/,
  `    totalTenants: totalTenants,
    totalSlots: totalSlots,
    occupiedSlots: occupiedSlots,
    monthlyRevenue:`,
  'current dashboard slot values',
);

dashboard = replaceOnce(
  dashboard,
  /  \/\/ Function to fetch fresh data from server[\s\S]*?  \/\/ Main useEffect/,
  `  // Function to fetch fresh data from server
  const fetchDashboardData = async () => {
    if (!organization?.userId || !organization.$id) {
      setIsLoading(false);
      return;
    }

    const propertyCacheKey = CACHE_KEYS.organizationProperties(organization.$id);
    const taskCacheKey = CACHE_KEYS.organizationTasks(organization.$id);
    const requestCacheKey = CACHE_KEYS.organizationRequests(organization.$id);

    if (!navigator.onLine) {
      console.log("📴 Offline - using cached dashboard data");

      const cachedProperties =
        cacheService.get<Property[]>(propertyCacheKey);
      const cachedTasks = cacheService.get<Task[]>(taskCacheKey);
      const cachedRequests =
        cacheService.get<DashboardRequest[]>(requestCacheKey);

      if (cachedProperties) {
        processPropertiesData(
          cachedProperties,
          cachedTasks || [],
          cachedRequests || [],
        );
      }

      setIsLoading(false);
      return;
    }

    try {
      const [propertyDocuments, tasksResponse, requestDocuments] =
        await Promise.all([
          listOrganizationProperties(organization.userId, [
            Query.orderDesc("$createdAt"),
          ]),
          databases.listDocuments(
            process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
            process.env.NEXT_PUBLIC_APPWRITE_TASKS_COLLECTION_ID!,
            [
              Query.equal("organizationId", organization.$id),
              Query.orderAsc("dueDate"),
              Query.limit(1000),
            ],
          ),
          listOrganizationRequests(organization.userId),
        ]);

      const allProperties =
        propertyDocuments as unknown as Property[];
      const tasks = tasksResponse.documents as unknown as Task[];
      const allRequests =
        requestDocuments as unknown as DashboardRequest[];

      cacheService.set(
        propertyCacheKey,
        allProperties,
        5 * 60 * 1000,
      );
      cacheService.set(taskCacheKey, tasks, 5 * 60 * 1000);
      cacheService.set(
        requestCacheKey,
        allRequests,
        5 * 60 * 1000,
      );

      processPropertiesData(allProperties, tasks, allRequests);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);

      const cachedProperties =
        cacheService.get<Property[]>(propertyCacheKey);
      const cachedTasks = cacheService.get<Task[]>(taskCacheKey);
      const cachedRequests =
        cacheService.get<DashboardRequest[]>(requestCacheKey);

      if (cachedProperties) {
        processPropertiesData(
          cachedProperties,
          cachedTasks || [],
          cachedRequests || [],
        );
        console.log("📦 Using cached dashboard data due to error");
      }
    } finally {
      setIsLoading(false);
      setTimeout(() => setShowWelcome(false), 5000);
    }
  };

  // Main useEffect`,
  'dashboard data fetch function',
);

dashboard = replaceOnce(
  dashboard,
  /  \/\/ Main useEffect[\s\S]*?\n  const organizationName =/,
  `  // Main useEffect
  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      if (!organization?.$id) {
        if (isMounted) setIsLoading(false);
        return;
      }

      const prevStats = loadHistoricalStats();
      if (prevStats) {
        setHistoricalStats(prevStats);
      }

      const propertyCacheKey =
        CACHE_KEYS.organizationProperties(organization.$id);
      const taskCacheKey =
        CACHE_KEYS.organizationTasks(organization.$id);
      const requestCacheKey =
        CACHE_KEYS.organizationRequests(organization.$id);

      const cachedProperties =
        cacheService.get<Property[]>(propertyCacheKey);
      const cachedTasks = cacheService.get<Task[]>(taskCacheKey);
      const cachedRequests =
        cacheService.get<DashboardRequest[]>(requestCacheKey);

      if (cachedProperties) {
        console.log("📦 Loading dashboard data from cache");
        processPropertiesData(
          cachedProperties,
          cachedTasks || [],
          cachedRequests || [],
        );

        if (isMounted) {
          setIsLoading(false);
        }
      }

      if (navigator.onLine && organization.userId) {
        console.log("🔄 Refreshing dashboard data from server");
        await fetchDashboardData();
      } else if (!navigator.onLine && cachedProperties) {
        console.log("📴 Offline mode - using cached dashboard data");
        if (isMounted) setIsLoading(false);
      } else if (!navigator.onLine && !cachedProperties) {
        console.log("📴 Offline mode - no cached data available");
        if (isMounted) setIsLoading(false);
      }
    };

    void loadData();

    return () => {
      isMounted = false;
    };
  }, [organization?.userId, organization?.$id]);

  const organizationName =`,
  'dashboard initial load effect',
);

dashboard = dashboard.replace(
  /description: `\$\{stats\.occupiedListings \|\| 0\} properties currently rented`,/,
  'description: `${stats.occupiedListings || 0} fully occupied properties`,',
);

dashboard = dashboard.replace(
  /description: `\$\{stats\.occupiedListings \|\| 0\} of \$\{stats\.totalProperties\} occupied`,/,
  'description: `${stats.occupiedSlots} of ${stats.totalSlots} slots occupied`,',
);

dashboard = dashboard.replace(
  /isAvailable: p\.isAvailable,\r?\n/g,
  `isAvailable: p.isAvailable,
      totalSlots: p.totalSlots,
      occupiedSlots: p.occupiedSlots,
      availableSlots: p.availableSlots,
`,
);

dashboard = replaceOnce(
  dashboard,
  /                      properties=\{stat\.properties\}\r?\n                    \/>/,
  `                      properties={stat.properties}
                      description={stat.description}
                    />`,
  'StatsCard description prop',
);

// ---------------------------------------------------------------------------
// Stats card: make it a pure view and derive property status from slot fields.
// This preserves the user's custom artwork and taller-building edits.
// ---------------------------------------------------------------------------

card = replaceOnce(
  card,
  /import \{ useEffect, useId, useMemo, useState \} from "react";/,
  'import { useId, useMemo } from "react";',
  'StatsCard React import',
);

card = card.replace(/\r?\nimport \{ CACHE_KEYS \} from "@\/lib\/cache-keys";/, '');
card = card.replace(/\r?\nimport \{ cacheService \} from "@\/lib\/cache\.service";/, '');

card = replaceOnce(
  card,
  /  isAvailable\?: boolean;\r?\n\}/,
  `  isAvailable?: boolean;
  totalSlots?: number;
  occupiedSlots?: number;
  availableSlots?: number;
}`,
  'StatsProperty slot fields',
);

card = card.replace(
  /\r?\ninterface CachedProperty \{[\s\S]*?\r?\n\}\r?\n/,
  '\n',
);

card = replaceOnce(
  card,
  /function clampPercentage\(value: number\): number \{\r?\n  return Math\.min\(100, Math\.max\(0, value\)\);\r?\n\}/,
  `function clampPercentage(value: number): number {
  return Math.min(100, Math.max(0, value));
}

function toNonNegativeInteger(value: unknown, fallback = 0): number {
  const parsed = Math.floor(Number(value));
  return Number.isFinite(parsed) ? Math.max(0, parsed) : fallback;
}

function getPropertySlots(property: StatsProperty) {
  const legacyCapacity = Math.max(
    1,
    toNonNegativeInteger(property.totalSlots, 1),
  );
  const total = Math.max(
    1,
    toNonNegativeInteger(property.totalSlots, legacyCapacity),
  );

  let occupied: number;

  if (property.occupiedSlots !== undefined && property.occupiedSlots !== null) {
    occupied = Math.min(
      total,
      toNonNegativeInteger(property.occupiedSlots),
    );
  } else if (
    property.availableSlots !== undefined &&
    property.availableSlots !== null
  ) {
    occupied = total - Math.min(
      total,
      toNonNegativeInteger(property.availableSlots),
    );
  } else {
    occupied = property.isAvailable === false ? total : 0;
  }

  return {
    total,
    occupied,
    available: Math.max(0, total - occupied),
  };
}`,
  'StatsCard slot normalization helper',
);

card = replaceOnce(
  card,
  /\r?\n  const \[cachedProperties, setCachedProperties\] = useState<CachedProperty\[\]>\(\[\]\);[\s\S]*?  const portfolioProperties =\r?\n    cachedProperties\.length > 0 \? cachedProperties : properties;/,
  `
  const portfolioProperties = properties;`,
  'StatsCard cache removal',
);

card = replaceOnce(
  card,
  /  const occupiedTotal = useMemo\(\(\) => \{[\s\S]*?  \}, \[numericValue, portfolioProperties, statId\]\);\r?\n\r?\n  const availableTotal = Math\.max\(portfolioTotal - occupiedTotal, 0\);/,
  `  const occupiedTotal = useMemo(() => {
    if (statId === "occupiedListings") {
      return Math.max(0, Math.round(numericValue));
    }

    return portfolioProperties.filter(
      (property) => getPropertySlots(property).available === 0,
    ).length;
  }, [numericValue, portfolioProperties, statId]);

  const availableTotal = useMemo(
    () =>
      portfolioProperties.filter(
        (property) => getPropertySlots(property).available > 0,
      ).length,
    [portfolioProperties],
  );`,
  'StatsCard occupied and available calculations',
);

fs.writeFileSync(dashboardPath, dashboard, 'utf8');
fs.writeFileSync(cardPath, card, 'utf8');

console.log('✓ Fixed dashboard metric formulas');
console.log('✓ Fixed request response-rate calculation');
console.log('✓ Added slot-based occupancy calculation');
console.log('✓ Added organization-specific dashboard caches');
console.log('✓ Removed stale global cache reads from StatsCard');
console.log('\nNext: run npm run dev and inspect the five metric cards.');
