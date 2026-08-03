export type DriverVerificationStatus =
  | "pending"
  | "verified"
  | "rejected"
  | "expired";

export type DriverStatus = "active" | "inactive" | "suspended";

export type DriverInstitutionStatus =
  | "pending"
  | "acknowledged"
  | "approved"
  | "active"
  | "verified"
  | "rejected"
  | "suspended";

export interface DriverReviewProfile {
  $id: string;
  organizationId: string;
  userId: string;
  name: string;
  phone: string;
  email?: string;
  avatar?: string;
  licenceNumber?: string;
  licenceExpiry?: string;
  driverLicenceFileId?: string;
  nationalIdFileId?: string;
  documentsSubmittedAt?: string;
  verificationStatus: DriverVerificationStatus;
  rating?: number;
  completedTrips?: number;
  status: DriverStatus;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  isOnline?: boolean;
  currentRideId?: string;
  lastSeenAt?: string;
  serviceAreas?: string[];
  acceptsPrivateRides?: boolean;
  acceptsSharedRides?: boolean;
  pricingModel?: string;
  maxPickupDistanceKm?: number;
  availabilityNote?: string;
  createdAt?: string;
  updatedAt?: string;
  $createdAt?: string;
  $updatedAt?: string;
}

export interface DriverReviewVehicle {
  $id: string;
  organizationId: string;
  driverId: string;
  registrationNumber: string;
  make: string;
  model: string;
  color: string;
  capacity: number;
  image?: string;
  frontImageFileId?: string;
  sideImageFileId?: string;
  backImageFileId?: string;
  vehicleImagesSubmittedAt?: string;
  status: "active" | "maintenance" | "inactive" | "suspended";
  insuranceExpiry?: string;
  fitnessExpiry?: string;
  vehicleType?: string;
  manufactureYear?: number;
  passengerCapacity?: number;
  availableSeats?: number;
  conditionStatus?: string;
  roadworthinessStatus?: string;
  allowsSharedRides?: boolean;
  lastInspectionAt?: string;
  createdAt?: string;
  updatedAt?: string;
  $createdAt?: string;
  $updatedAt?: string;
}

export interface DriverReviewInstitution {
  $id: string;
  driverId: string;
  organizationId: string;
  status: DriverInstitutionStatus;
  verifiedBy?: string;
  acknowledgedAt?: string;
  verifiedAt?: string;
  suspendedAt?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
  $createdAt?: string;
  $updatedAt?: string;
}

export interface DriverReviewRequirements {
  hasDriverLicence: boolean;
  hasNationalId: boolean;
  hasCompleteVehicleImages: boolean;
  hasVehicle: boolean;
  readyForApproval: boolean;
}

export interface DriverReviewApplication {
  profile: DriverReviewProfile;
  institution: DriverReviewInstitution;
  vehicles: DriverReviewVehicle[];
  primaryVehicle: DriverReviewVehicle | null;
  requirements: DriverReviewRequirements;
  marketplaceReady: boolean;
}

export type DriverReviewTab = "pending" | "approved" | "all";
