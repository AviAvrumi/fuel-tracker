import type {
  CurrencyUnit,
  DistanceUnit,
  Language,
  VolumeUnit,
} from "../types/fuel";

const KM_TO_MI = 0.621371;
const L_TO_GAL = 0.264172;
const ILS_TO_USD = 0.27;
const ILS_TO_RUB = 22.0;
const ILS_TO_EUR = 0.24;

export function todayValue(): string {
  return new Date().toISOString().split("T")[0];
}

export function currentTimeValue(): string {
  return new Date().toTimeString().slice(0, 5);
}

function getLocale(language: Language) {
  if (language === "en") return "en-US";
  if (language === "ru") return "ru-RU";
  return "he-IL";
}

export function convertDistance(
  value: number | null | undefined,
  unit: DistanceUnit
): number | null {
  if (value === null || value === undefined || Number.isNaN(value)) return null;
  return unit === "mi" ? value * KM_TO_MI : value;
}

export function convertVolume(
  value: number | null | undefined,
  unit: VolumeUnit
): number | null {
  if (value === null || value === undefined || Number.isNaN(value)) return null;
  return unit === "gal" ? value * L_TO_GAL : value;
}

export function convertCurrency(
  value: number | null | undefined,
  currency: CurrencyUnit
): number | null {
  if (value === null || value === undefined || Number.isNaN(value)) return null;
  if (currency === "USD") return value * ILS_TO_USD;
  if (currency === "RUB") return value * ILS_TO_RUB;
  if (currency === "EUR") return value * ILS_TO_EUR;
  return value;
}

export function formatNumber(
  value: number | null | undefined,
  language: Language,
  digits = 2
): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";

  return new Intl.NumberFormat(getLocale(language), {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  }).format(value);
}

export function formatCurrency(
  value: number | null | undefined,
  language: Language,
  currency: CurrencyUnit
): string {
  const converted = convertCurrency(value, currency);
  if (converted === null) return "-";

  return new Intl.NumberFormat(getLocale(language), {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(converted);
}

export function formatDistance(
  value: number | null | undefined,
  language: Language,
  unit: DistanceUnit,
  digits = 0
): string {
  return formatNumber(convertDistance(value, unit), language, digits);
}

export function formatVolume(
  value: number | null | undefined,
  language: Language,
  unit: VolumeUnit,
  digits = 2
): string {
  return formatNumber(convertVolume(value, unit), language, digits);
}

export function getDistanceUnitLabel(unit: DistanceUnit) {
  return unit === "mi" ? "mi" : "km";
}

export function getVolumeUnitLabel(unit: VolumeUnit) {
  return unit === "gal" ? "gal" : "L";
}

export function getLocalizedDistanceUnitLabel(
  unit: DistanceUnit,
  language: Language
) {
  if (language === "he") {
    return unit === "mi" ? "מייל" : 'ק"מ';
  }
  if (language === "ru") {
    return unit === "mi" ? "миль" : "км";
  }

  return unit === "mi" ? "mi" : "km";
}

export function getLocalizedVolumeUnitLabel(
  unit: VolumeUnit,
  language: Language
) {
  if (language === "he") {
    return unit === "gal" ? "גלון" : "ליטר";
  }
  if (language === "ru") {
    return unit === "gal" ? "галлон" : "л";
  }

  return unit === "gal" ? "gal" : "L";
}

export function getLocalizedCurrencyUnitLabel(
  currency: CurrencyUnit,
  language: Language
) {
  if (language === "he") {
    if (currency === "USD") return "דולר";
    if (currency === "RUB") return "רובל";
    if (currency === "EUR") return "אירו";
    return 'ש"ח';
  }
  if (language === "ru") {
    if (currency === "USD") return "доллар";
    if (currency === "RUB") return "рубль";
    if (currency === "EUR") return "евро";
    return "шекель";
  }

  if (currency === "USD") return "USD";
  if (currency === "RUB") return "RUB";
  if (currency === "EUR") return "EUR";
  return "ILS";
}

export function convertDistancePerVolume(
  value: number | null | undefined,
  distanceUnit: DistanceUnit,
  volumeUnit: VolumeUnit
): number | null {
  const distance = convertDistance(value, distanceUnit);
  if (distance === null) return null;
  return volumeUnit === "gal" ? distance / L_TO_GAL : distance;
}

export function convertVolumePerHundredDistance(
  value: number | null | undefined,
  distanceUnit: DistanceUnit,
  volumeUnit: VolumeUnit
): number | null {
  const volume = convertVolume(value, volumeUnit);
  if (volume === null) return null;
  return distanceUnit === "mi" ? volume / KM_TO_MI : volume;
}

export function convertCurrencyPerDistance(
  value: number | null | undefined,
  distanceUnit: DistanceUnit,
  currency: CurrencyUnit
): number | null {
  const convertedCurrency = convertCurrency(value, currency);
  if (convertedCurrency === null) return null;
  return distanceUnit === "mi" ? convertedCurrency / KM_TO_MI : convertedCurrency;
}
