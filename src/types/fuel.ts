export type FuelEntry = {
  id: string;
  user_id: string;
  date: string;
  liters: number;
  total_price: number;
  odometer: number;
  fuel_type: string;
  station: string;
  notes: string;
  created_at?: string;
  fuel_time?: string;
  vehicle_local_id?: string;
};

export type Profile = {
  id: string;
  email: string | null;
  manufacturer: string | null;
  model: string | null;
  year: number | null;
  created_at?: string;
};

export type VehicleRecord = {
  id: string;
  manufacturer: string;
  model: string;
  year: number;
  fuelType: string;
  licensePlate?: string;
  benchmarkLitersPer100Km?: number | null;
  tankCapacity?: number | null;
  isPrimary?: boolean;
};

export type EnrichedFuelEntry = FuelEntry & {
  pricePerLiter: number;
  daysFromPrev: number | null;
  distanceFromPrev: number | null;
  kmPerLiter: number | null;
  litersPer100Km: number | null;
  costPerKm: number | null;
  costPerDay: number | null;
  kmPerDay: number | null;
  tankPercentBeforeRefuel?: number | null;
};

export type AuthMode = "login" | "signup";

export type VehicleFormState = {
  id?: string;
  manufacturer: string;
  model: string;
  year: string;
  fuelType: string;
  licensePlate?: string;
  benchmarkLitersPer100Km?: string;
  tankCapacity?: string;
};

export type FuelFormState = {
  id?: string;
  date: string;
  time: string;
  vehicleId: string;
  liters: string;
  totalPrice: string;
  odometer: string;
  fuelType: string;
  station: string;
  notes: string;
};

export type Totals = {
  totalLiters: number;
  totalCost: number;
  totalDistance: number;
  avgPricePerLiter: number | null;
  avgKmPerLiter: number | null;
  avgLitersPer100Km: number | null;
  avgCostPerKm: number | null;
  avgKmPerDay: number | null;
  avgCostPerDay: number | null;
};

export type DashboardPanel = "vehicle" | "add-entry" | "more" | "feedback";

export type Language = "he" | "en" | "ru";
export type DistanceUnit = "km" | "mi";
export type VolumeUnit = "l" | "gal";
export type CurrencyUnit = "ILS" | "USD" | "RUB" | "EUR";
export type ConsumptionView = "distance_per_volume" | "volume_per_100_distance";
export type ThemeMode = "light" | "dark";

export type UserSettings = {
  language: Language;
  distanceUnit: DistanceUnit;
  volumeUnit: VolumeUnit;
  currency: CurrencyUnit;
  consumptionView: ConsumptionView;
  theme: ThemeMode;
};

export type EntryMetaRecord = {
  vehicleId: string;
  time: string;
};

export type UserLocalData = {
  vehicles: VehicleRecord[];
  selectedVehicleId: string | null;
  entryMeta: Record<string, EntryMetaRecord>;
};

export type CloudAppState = {
  settings: UserSettings;
  userData: UserLocalData;
};
