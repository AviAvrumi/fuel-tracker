import type {
  EntryMetaRecord,
  Profile,
  UserLocalData,
  VehicleRecord,
} from "../types/fuel";

function getStorageKey(userId: string) {
  return `fuel-tracker-user-data:${userId}`;
}

export function createVehicleId() {
  return crypto.randomUUID();
}

export function loadUserLocalData(userId: string): UserLocalData {
  const raw = localStorage.getItem(getStorageKey(userId));

  if (!raw) {
    return {
      vehicles: [],
      selectedVehicleId: null,
      entryMeta: {},
    };
  }

  try {
    return JSON.parse(raw) as UserLocalData;
  } catch {
    return {
      vehicles: [],
      selectedVehicleId: null,
      entryMeta: {},
    };
  }
}

export function saveUserLocalData(userId: string, data: UserLocalData) {
  localStorage.setItem(getStorageKey(userId), JSON.stringify(data));
}

export function mergePrimaryVehicle(
  data: UserLocalData,
  profile: Profile | null
): UserLocalData {
  if (!profile?.manufacturer || !profile.model || !profile.year) {
    return data;
  }

  const existingPrimary = data.vehicles.find((vehicle) => vehicle.isPrimary);

  if (existingPrimary) {
    return {
      ...data,
      vehicles: data.vehicles.map((vehicle) =>
        vehicle.id === existingPrimary.id
          ? {
              ...vehicle,
              manufacturer: profile.manufacturer ?? vehicle.manufacturer,
              model: profile.model ?? vehicle.model,
              year: profile.year ?? vehicle.year,
              fuelType: vehicle.fuelType ?? "fuel95",
              licensePlate: vehicle.licensePlate ?? "",
              isPrimary: true,
            }
          : vehicle
      ),
      selectedVehicleId: data.selectedVehicleId ?? existingPrimary.id,
    };
  }

  const primaryVehicle: VehicleRecord = {
    id: createVehicleId(),
    manufacturer: profile.manufacturer,
    model: profile.model,
    year: profile.year,
    fuelType: "fuel95",
    licensePlate: "",
    isPrimary: true,
  };

  return {
    ...data,
    vehicles: [primaryVehicle, ...data.vehicles],
    selectedVehicleId: data.selectedVehicleId ?? primaryVehicle.id,
  };
}

export function resolveEntryMeta(
  entryId: string,
  entryMeta: Record<string, EntryMetaRecord>,
  fallbackVehicleId: string | null
) {
  const existing = entryMeta[entryId];

  if (existing) {
    return existing;
  }

  return {
    vehicleId: fallbackVehicleId ?? "",
    time: "",
  };
}
