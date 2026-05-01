import type {
  EnrichedFuelEntry,
  FuelEntry,
  Totals,
} from "../types/fuel";

export function sortEntries(entries: FuelEntry[]): FuelEntry[] {
  const toTimestamp = (entry: FuelEntry) =>
    new Date(
      `${entry.date}T${entry.fuel_time && entry.fuel_time.length > 0 ? entry.fuel_time : "00:00"}`
    ).getTime();

  return [...entries].sort((a, b) => {
    const dateDiff = toTimestamp(a) - toTimestamp(b);
    if (dateDiff !== 0) return dateDiff;
    return a.odometer - b.odometer;
  });
}

export function enrichEntries(entries: FuelEntry[]): EnrichedFuelEntry[] {
  return entries.map((entry, index) => {
    const prev = entries[index - 1];
    const pricePerLiter = entry.total_price / entry.liters;

    const daysFromPrev =
      prev !== undefined
        ? Math.round(
            (new Date(entry.date).getTime() - new Date(prev.date).getTime()) /
              (1000 * 60 * 60 * 24)
          )
        : null;

    const distanceFromPrev =
      prev !== undefined ? entry.odometer - prev.odometer : null;

    const kmPerLiter =
      prev !== undefined &&
      distanceFromPrev !== null &&
      distanceFromPrev > 0 &&
      entry.liters > 0
        ? distanceFromPrev / entry.liters
        : null;

    const litersPer100Km =
      prev !== undefined &&
      distanceFromPrev !== null &&
      distanceFromPrev > 0 &&
      entry.liters > 0
        ? (entry.liters / distanceFromPrev) * 100
        : null;

    const costPerKm =
      prev !== undefined &&
      distanceFromPrev !== null &&
      distanceFromPrev > 0
        ? entry.total_price / distanceFromPrev
        : null;

    const costPerDay =
      prev !== undefined && daysFromPrev !== null && daysFromPrev > 0
        ? entry.total_price / daysFromPrev
        : null;

    const kmPerDay =
      prev !== undefined &&
      daysFromPrev !== null &&
      daysFromPrev > 0 &&
      distanceFromPrev !== null &&
      distanceFromPrev > 0
        ? distanceFromPrev / daysFromPrev
        : null;

    return {
      ...entry,
      pricePerLiter,
      daysFromPrev,
      distanceFromPrev,
      kmPerLiter,
      litersPer100Km,
      costPerKm,
      costPerDay,
      kmPerDay,
    };
  });
}

export function calculateTotals(entries: EnrichedFuelEntry[]): Totals {
  const totalLiters = entries.reduce((sum, entry) => sum + entry.liters, 0);
  const totalCost = entries.reduce((sum, entry) => sum + entry.total_price, 0);

  let totalDistance = 0;
  let totalDays = 0;
  let comparableLiters = 0;
  let comparableCost = 0;

  for (const entry of entries) {
    if (entry.distanceFromPrev !== null && entry.distanceFromPrev > 0) {
      totalDistance += entry.distanceFromPrev;
      comparableLiters += entry.liters;
      comparableCost += entry.total_price;
    }

    if (entry.daysFromPrev !== null && entry.daysFromPrev > 0) {
      totalDays += entry.daysFromPrev;
    }
  }

  return {
    totalLiters,
    totalCost,
    totalDistance,
    avgPricePerLiter: totalLiters > 0 ? totalCost / totalLiters : null,
    avgKmPerLiter:
      comparableLiters > 0 && totalDistance > 0
        ? totalDistance / comparableLiters
        : null,
    avgLitersPer100Km:
      totalDistance > 0 && comparableLiters > 0
        ? (comparableLiters / totalDistance) * 100
        : null,
    avgCostPerKm: totalDistance > 0 ? comparableCost / totalDistance : null,
    avgKmPerDay: totalDays > 0 ? totalDistance / totalDays : null,
    avgCostPerDay: totalDays > 0 ? totalCost / totalDays : null,
  };
}
