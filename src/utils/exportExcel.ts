import * as XLSX from "xlsx";
import type {
  CurrencyUnit,
  DistanceUnit,
  EnrichedFuelEntry,
  Language,
  VehicleRecord,
  VolumeUnit,
} from "../types/fuel";
import {
  convertCurrencyPerDistance,
  convertDistancePerVolume,
  convertVolumePerHundredDistance,
  formatCurrency,
  formatDistance,
  formatNumber,
  formatVolume,
  getLocalizedDistanceUnitLabel,
  getLocalizedVolumeUnitLabel,
} from "./format";

type ExportParams = {
  entries: EnrichedFuelEntry[];
  vehicles: VehicleRecord[];
  language: Language;
  distanceUnit: DistanceUnit;
  volumeUnit: VolumeUnit;
  currency: CurrencyUnit;
  labels: Record<string, string>;
};

export function exportEntriesToExcel({
  entries,
  vehicles,
  language,
  distanceUnit,
  volumeUnit,
  currency,
  labels,
}: ExportParams) {
  const rows = entries.map((entry) => {
    const vehicle = vehicles.find((item) => item.id === entry.vehicle_local_id);
    return {
      [labels.vehicleName]: vehicle
        ? `${vehicle.manufacturer} ${vehicle.model} ${vehicle.year}`
        : "-",
      [labels.date]: entry.date,
      [labels.createdAtTime]: entry.fuel_time || "-",
      [labels.volumeAmount]: formatVolume(entry.liters, language, volumeUnit),
      [labels.totalPrice]: formatCurrency(entry.total_price, language, currency),
      [labels.avgPricePerVolume]: formatCurrency(
        entry.pricePerLiter,
        language,
        currency
      ),
      [labels.odometer]: `${formatDistance(
        entry.odometer,
        language,
        distanceUnit
      )} ${getLocalizedDistanceUnitLabel(distanceUnit, language)}`,
      [labels.fuelType]: entry.fuel_type,
      [labels.station]: entry.station || "-",
      [labels.previousDistance]: `${formatDistance(
        entry.distanceFromPrev,
        language,
        distanceUnit
      )} ${getLocalizedDistanceUnitLabel(distanceUnit, language)}`,
      [labels.days]: formatNumber(entry.daysFromPrev, language, 0),
      [labels.avgDistancePerVolume]: `${formatNumber(
        convertDistancePerVolume(entry.kmPerLiter, distanceUnit, volumeUnit),
        language
      )} ${getLocalizedDistanceUnitLabel(distanceUnit, language)}/${getLocalizedVolumeUnitLabel(volumeUnit, language)}`,
      [labels.avgVolumePerHundred]: `${formatNumber(
        convertVolumePerHundredDistance(
          entry.litersPer100Km,
          distanceUnit,
          volumeUnit
        ),
        language
      )} ${getLocalizedVolumeUnitLabel(volumeUnit, language)}/100 ${getLocalizedDistanceUnitLabel(distanceUnit, language)}`,
      [labels.avgCostPerDistance]: formatCurrency(
        convertCurrencyPerDistance(entry.costPerKm, distanceUnit, currency),
        language,
        currency
      ),
      [labels.distancePerDay]: `${formatDistance(
        entry.kmPerDay,
        language,
        distanceUnit
      )} ${getLocalizedDistanceUnitLabel(distanceUnit, language)}`,
      [labels.avgCostPerDay]: formatCurrency(
        entry.costPerDay,
        language,
        currency
      ),
      [labels.notes]: entry.notes || "-",
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Fuel Data");
  XLSX.writeFile(workbook, `fuel-tracker-${new Date().toISOString().slice(0, 10)}.xlsx`);
}
