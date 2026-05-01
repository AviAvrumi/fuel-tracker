import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./lib/supabase";
import { VEHICLES } from "./data/vehicles";
import { getTranslations } from "./i18n";
import { ActionModal } from "./components/ActionModal";
import { AuthScreen } from "./components/AuthScreen";
import { VehicleProfileCard } from "./components/VehicleProfileCard";
import { FuelEntryFormCard } from "./components/FuelEntryFormCard";
import { EntriesTable } from "./components/EntriesTable";
import { StatCard } from "./components/StatCard";
import { BottomActionBar } from "./components/BottomActionBar";
import { MoreDataCard } from "./components/MoreDataCard";
import { TrendMiniChart } from "./components/TrendMiniChart";
import { exportEntriesToExcel } from "./utils/exportExcel";
import {
  createFeedbackMessage,
  findVehicleByLicensePlate,
  createFuelEntry,
  getCloudAppState,
  getFuelEntries,
  getProfile,
  removeFuelEntry,
  signInWithGoogle,
  signInWithPassword,
  signOut,
  signUpWithPassword,
  toEntries,
  toProfile,
  updateFuelEntry,
  updateProfileEmail,
  upsertCloudAppState,
  upsertProfile,
} from "./services/fuelTracker";
import { styles } from "./styles/appStyles";
import type {
  AuthMode,
  CloudAppState,
  DashboardPanel,
  EntryMetaRecord,
  FuelEntry,
  FuelFormState,
  Profile,
  UserLocalData,
  UserSettings,
  VehicleFormState,
  VehicleRecord,
} from "./types/fuel";
import { calculateTotals, enrichEntries, sortEntries } from "./utils/entries";
import {
  convertCurrency,
  convertCurrencyPerDistance,
  convertDistancePerVolume,
  convertVolume,
  convertVolumePerHundredDistance,
  currentTimeValue,
  formatCurrency,
  formatDistance,
  formatNumber,
  formatVolume,
  getLocalizedDistanceUnitLabel,
  getLocalizedVolumeUnitLabel,
  todayValue,
} from "./utils/format";
import {
  createVehicleId,
  loadUserLocalData,
  mergePrimaryVehicle,
  resolveEntryMeta,
  saveUserLocalData,
} from "./utils/userData";

const initialVehicleForm: VehicleFormState = {
  manufacturer: "",
  model: "",
  year: "",
  fuelType: "fuel95",
  licensePlate: "",
  benchmarkLitersPer100Km: "",
  tankCapacity: "",
};

const defaultSettings: UserSettings = {
  language: "en",
  distanceUnit: "km",
  volumeUnit: "l",
  currency: "ILS",
  consumptionView: "distance_per_volume",
  theme: "light",
};

const vehicleTextTranslations: Record<string, { en: string; ru: string }> = {
  טויוטה: { en: "Toyota", ru: "Тойота" },
  קורולה: { en: "Corolla", ru: "Королла" },
  "קורולה קרוס": { en: "Corolla Cross", ru: "Королла Кросс" },
  יאריס: { en: "Yaris", ru: "Ярис" },
  "יאריס קרוס": { en: "Yaris Cross", ru: "Ярис Кросс" },
  קאמרי: { en: "Camry", ru: "Камри" },
  יונדאי: { en: "Hyundai", ru: "Хендай" },
  אלנטרה: { en: "Elantra", ru: "Элантра" },
  קונה: { en: "Kona", ru: "Кона" },
  טוסון: { en: "Tucson", ru: "Тусон" },
  סונטה: { en: "Sonata", ru: "Соната" },
  "סנטה פה": { en: "Santa Fe", ru: "Санта-Фе" },
  קיה: { en: "Kia", ru: "Киа" },
  פיקנטו: { en: "Picanto", ru: "Пиканто" },
  נירו: { en: "Niro", ru: "Ниро" },
  "ספורטאז'": { en: "Sportage", ru: "Спортейдж" },
  סלטוס: { en: "Seltos", ru: "Селтос" },
  סטוניק: { en: "Stonic", ru: "Стоник" },
  סורנטו: { en: "Sorento", ru: "Соренто" },
  מאזדה: { en: "Mazda", ru: "Мазда" },
  סקודה: { en: "Skoda", ru: "Шкода" },
  אוקטביה: { en: "Octavia", ru: "Октавия" },
  קאמיק: { en: "Kamiq", ru: "Камик" },
  קארוק: { en: "Karoq", ru: "Карок" },
  קודיאק: { en: "Kodiaq", ru: "Кодиак" },
  סופרב: { en: "Superb", ru: "Суперб" },
  פאביה: { en: "Fabia", ru: "Фабия" },
  מיצובישי: { en: "Mitsubishi", ru: "Мицубиси" },
  אאוטלנדר: { en: "Outlander", ru: "Аутлендер" },
  "ספייס סטאר": { en: "Space Star", ru: "Спейс Стар" },
  "אקליפס קרוס": { en: "Eclipse Cross", ru: "Эклипс Кросс" },
  סוזוקי: { en: "Suzuki", ru: "Сузуки" },
  סוויפט: { en: "Swift", ru: "Свифт" },
  בלנו: { en: "Baleno", ru: "Балено" },
  ויטרה: { en: "Vitara", ru: "Витара" },
  קרוסאובר: { en: "Crossover", ru: "Кроссовер" },
  איגניס: { en: "Ignis", ru: "Игнис" },
  סובארו: { en: "Subaru", ru: "Субару" },
  פורסטר: { en: "Forester", ru: "Форестер" },
  אימפרזה: { en: "Impreza", ru: "Импреза" },
  אאוטבק: { en: "Outback", ru: "Аутбек" },
  ניסאן: { en: "Nissan", ru: "Ниссан" },
  קשקאי: { en: "Qashqai", ru: "Кашкай" },
  "ג'וק": { en: "Juke", ru: "Джук" },
  סנטרה: { en: "Sentra", ru: "Сентра" },
  "אקס-טרייל": { en: "X-Trail", ru: "Икс-Трейл" },
  פולקסווגן: { en: "Volkswagen", ru: "Фольксваген" },
  גולף: { en: "Golf", ru: "Гольф" },
  טיגואן: { en: "Tiguan", ru: "Тигуан" },
  פולו: { en: "Polo", ru: "Поло" },
  "טי-רוק": { en: "T-Roc", ru: "Ти-Рок" },
  פאסאט: { en: "Passat", ru: "Пассат" },
  סיאט: { en: "SEAT", ru: "Сеат" },
  איביזה: { en: "Ibiza", ru: "Ибица" },
  לאון: { en: "Leon", ru: "Леон" },
  אטקה: { en: "Ateca", ru: "Атека" },
  ארונה: { en: "Arona", ru: "Арона" },
  רנו: { en: "Renault", ru: "Рено" },
  קליאו: { en: "Clio", ru: "Клио" },
  "קפצ'ור": { en: "Captur", ru: "Каптюр" },
  מגאן: { en: "Megane", ru: "Меган" },
  ארקנה: { en: "Arkana", ru: "Аркана" },
  "פיג'ו": { en: "Peugeot", ru: "Пежо" },
  סיטרואן: { en: "Citroen", ru: "Ситроен" },
  "פורד": { en: "Ford", ru: "Форд" },
  פוקוס: { en: "Focus", ru: "Фокус" },
  פיאסטה: { en: "Fiesta", ru: "Фиеста" },
  קוגה: { en: "Kuga", ru: "Куга" },
  אקספלורר: { en: "Explorer", ru: "Эксплорер" },
  שברולט: { en: "Chevrolet", ru: "Шевроле" },
  ספארק: { en: "Spark", ru: "Спарк" },
  מאליבו: { en: "Malibu", ru: "Малибу" },
  טראוורס: { en: "Traverse", ru: "Траверс" },
  אקוינוקס: { en: "Equinox", ru: "Эквинокс" },
  הונדה: { en: "Honda", ru: "Хонда" },
  סיוויק: { en: "Civic", ru: "Сивик" },
  "ג'אז": { en: "Jazz", ru: "Джаз" },
  "צ'רי": { en: "Chery", ru: "Чери" },
  "ג'אקו": { en: "Jaecoo", ru: "Джейку" },
  טסלה: { en: "Tesla", ru: "Тесла" },
  אאודי: { en: "Audi", ru: "Ауди" },
  "סדרה 1": { en: "Series 1", ru: "Серия 1" },
  "סדרה 3": { en: "Series 3", ru: "Серия 3" },
  מרצדס: { en: "Mercedes", ru: "Мерседес" },
  "C3 איירקרוס": { en: "C3 Aircross", ru: "C3 Эйркросс" },
  "C5 איירקרוס": { en: "C5 Aircross", ru: "C5 Эйркросс" },
  Honda: { en: "Honda", ru: "Хонда" },
  Civic: { en: "Civic", ru: "Сивик" },
  "Gasoline 95": { en: "Gasoline 95", ru: "Бензин 95" },
};

const vehicleAliasLookup = createVehicleAliasLookup(vehicleTextTranslations);

function normalizeVehicleAliasText(value: string) {
  return value
    .toLowerCase()
    .replace(/["'`׳´׳³]/g, "")
    .replace(/[-_/]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function compactVehicleAliasText(value: string) {
  return normalizeVehicleAliasText(value).replace(/\s+/g, "");
}

function calculateVehicleAliasSimilarity(a: string, b: string) {
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (a.includes(b) || b.includes(a)) return 0.9;

  const aTokens = new Set(a.split(" ").filter(Boolean));
  const bTokens = new Set(b.split(" ").filter(Boolean));
  const union = new Set([...aTokens, ...bTokens]).size;
  const overlap = [...aTokens].filter((token) => bTokens.has(token)).length;
  const tokenScore = union > 0 ? overlap / union : 0;

  const aCompact = a.replace(/\s+/g, "");
  const bCompact = b.replace(/\s+/g, "");
  const minLength = Math.min(aCompact.length, bCompact.length);
  let prefixMatches = 0;
  for (let index = 0; index < minLength; index += 1) {
    if (aCompact[index] !== bCompact[index]) break;
    prefixMatches += 1;
  }
  const prefixScore = minLength > 0 ? prefixMatches / minLength : 0;

  return Math.max(tokenScore, prefixScore * 0.8);
}

function createVehicleAliasLookup(
  translations: Record<string, { en: string; ru: string }>
) {
  const lookup = new Map<string, Set<string>>();

  const addAlias = (alias: string, canonical: string) => {
    const normalizedAlias = normalizeVehicleAliasText(alias);
    if (!normalizedAlias) return;
    const existing = lookup.get(normalizedAlias) ?? new Set<string>();
    existing.add(canonical);
    lookup.set(normalizedAlias, existing);
  };

  Object.entries(translations).forEach(([canonical, translation]) => {
    addAlias(canonical, canonical);
    addAlias(translation.en, canonical);
    addAlias(translation.ru, canonical);
  });

  return lookup;
}

function getVehicleLookupVariants(value: string) {
  const variants = new Set<string>();
  const addVariant = (candidate: string) => {
    const normalized = normalizeVehicleAliasText(candidate);
    if (!normalized) return;
    variants.add(normalized);
  };

  const compact = compactVehicleAliasText(value);
  if (compact) {
    variants.add(compact);
  }

  addVariant(value);
  const aliasMatches = vehicleAliasLookup.get(normalizeVehicleAliasText(value));
  if (aliasMatches && aliasMatches.size > 0) {
    aliasMatches.forEach((canonical) => {
      addVariant(canonical);
      const canonicalCompact = compactVehicleAliasText(canonical);
      if (canonicalCompact) {
        variants.add(canonicalCompact);
      }
      const translation = vehicleTextTranslations[canonical];
      if (translation) {
        addVariant(translation.en);
        addVariant(translation.ru);
      }
    });
  }

  const directTranslation = vehicleTextTranslations[value];
  if (directTranslation) {
    addVariant(directTranslation.en);
    addVariant(directTranslation.ru);
  }

  return [...variants];
}

function getBestVariantScore(targetVariants: string[], candidateVariants: string[]) {
  let bestScore = 0;

  for (const target of targetVariants) {
    for (const candidate of candidateVariants) {
      if (!target || !candidate) continue;
      if (target === candidate) return 1;
      if (target.includes(candidate) || candidate.includes(target)) {
        bestScore = Math.max(bestScore, 0.92);
        continue;
      }
      const similarity = calculateVehicleAliasSimilarity(target, candidate);
      if (similarity > bestScore) {
        bestScore = similarity;
      }
    }
  }

  return bestScore;
}

function detectRegionalDefaults(): Partial<UserSettings> {
  if (typeof navigator === "undefined" || typeof Intl === "undefined") {
    return { language: "en" };
  }

  const nav = navigator as Navigator & { userLanguage?: string };
  const candidates = [
    nav.language,
    ...(nav.languages ?? []),
    nav.userLanguage,
  ]
    .filter(Boolean)
    .map((value) => String(value).toLowerCase());

  const timezone =
    Intl.DateTimeFormat().resolvedOptions().timeZone?.toLowerCase() ?? "";

  const hasIsraeliSignal =
    candidates.some(
      (value) =>
        value.startsWith("he") ||
        value.endsWith("-il") ||
        value.includes("_il")
    ) || timezone.includes("jerusalem");

  if (hasIsraeliSignal) {
    return {
      language: "he",
      distanceUnit: "km",
      volumeUnit: "l",
      currency: "ILS",
    };
  }

  const hasRussianSignal =
    candidates.some(
      (value) =>
        value.startsWith("ru") ||
        value.endsWith("-ru") ||
        value.includes("_ru")
    ) || timezone.includes("moscow");

  if (hasRussianSignal) {
    return {
      language: "ru",
      distanceUnit: "km",
      volumeUnit: "l",
      currency: "RUB",
    };
  }

  const hasUsSignal =
    candidates.some(
      (value) =>
        value.endsWith("-us") ||
        value.includes("_us") ||
        value === "en-us"
    ) ||
    timezone.includes("america/") ||
    timezone.includes("us/");

  if (hasUsSignal) {
    return {
      language: "en",
      distanceUnit: "mi",
      volumeUnit: "gal",
      currency: "USD",
    };
  }

  return { language: "en" };
}

function normalizeSettings(settings: Partial<UserSettings> | null | undefined): UserSettings {
  return {
    language: settings?.language ?? defaultSettings.language,
    distanceUnit: settings?.distanceUnit ?? defaultSettings.distanceUnit,
    volumeUnit: settings?.volumeUnit ?? defaultSettings.volumeUnit,
    currency: settings?.currency ?? defaultSettings.currency,
    consumptionView: settings?.consumptionView ?? defaultSettings.consumptionView,
    theme: settings?.theme ?? defaultSettings.theme,
  };
}

const initialFuelForm = (vehicleId = ""): FuelFormState => ({
  date: todayValue(),
  time: currentTimeValue(),
  vehicleId,
  liters: "",
  totalPrice: "",
  odometer: "",
  fuelType: "fuel95",
  station: "",
  notes: "",
});

const demoVehicle: VehicleRecord = {
  id: "demo-vehicle-1",
  manufacturer: "הונדה",
  model: "סיוויק",
  year: 2021,
  fuelType: "fuel95",
  licensePlate: "",
  benchmarkLitersPer100Km: 7.2,
  tankCapacity: 50,
};

const demoEntries: FuelEntry[] = [
  {
    id: "demo-entry-1",
    user_id: "demo-user",
    date: "2026-03-03",
    fuel_time: "08:40",
    liters: 34.2,
    total_price: 231.85,
    odometer: 200120,
    fuel_type: "fuel95",
    station: "דור אלון",
    notes: "",
    vehicle_local_id: "demo-vehicle-1",
  },
  {
    id: "demo-entry-2",
    user_id: "demo-user",
    date: "2026-03-09",
    fuel_time: "19:10",
    liters: 32.8,
    total_price: 223.04,
    odometer: 200612,
    fuel_type: "fuel95",
    station: "סונול",
    notes: "",
    vehicle_local_id: "demo-vehicle-1",
  },
  {
    id: "demo-entry-3",
    user_id: "demo-user",
    date: "2026-03-16",
    fuel_time: "20:05",
    liters: 35.6,
    total_price: 248.49,
    odometer: 201184,
    fuel_type: "fuel95",
    station: "פז",
    notes: "",
    vehicle_local_id: "demo-vehicle-1",
  },
  {
    id: "demo-entry-4",
    user_id: "demo-user",
    date: "2026-03-24",
    fuel_time: "07:55",
    liters: 33.4,
    total_price: 230.46,
    odometer: 201706,
    fuel_type: "fuel95",
    station: "טן",
    notes: "",
    vehicle_local_id: "demo-vehicle-1",
  },
  {
    id: "demo-entry-5",
    user_id: "demo-user",
    date: "2026-04-01",
    fuel_time: "18:35",
    liters: 34.9,
    total_price: 243.95,
    odometer: 202258,
    fuel_type: "fuel95",
    station: "yellow",
    notes: "",
    vehicle_local_id: "demo-vehicle-1",
  },
];

function vehicleToForm(vehicle: VehicleRecord | null): VehicleFormState {
  if (!vehicle) return initialVehicleForm;
  return {
    id: vehicle.id,
    manufacturer: vehicle.manufacturer,
    model: vehicle.model,
    year: String(vehicle.year),
    fuelType: vehicle.fuelType ?? "fuel95",
    licensePlate: vehicle.licensePlate ?? "",
    benchmarkLitersPer100Km:
      vehicle.benchmarkLitersPer100Km !== null &&
      vehicle.benchmarkLitersPer100Km !== undefined
        ? String(vehicle.benchmarkLitersPer100Km)
        : "",
    tankCapacity:
      vehicle.tankCapacity !== null && vehicle.tankCapacity !== undefined
        ? String(vehicle.tankCapacity)
        : "",
  };
}

function withVehicleDefaults(vehicle: VehicleRecord): VehicleRecord {
  return {
    ...vehicle,
    fuelType: vehicle.fuelType ?? "fuel95",
    licensePlate: vehicle.licensePlate ?? "",
  };
}

type ParsedVoiceFields = {
  liters?: string;
  totalPrice?: string;
  odometer?: string;
};

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeNumberValue(raw: string | undefined) {
  if (!raw) return undefined;
  const cleaned = raw.replace(",", ".").replace(/[^0-9.]/g, "");
  if (!cleaned) return undefined;
  const numeric = Number(cleaned);
  if (Number.isNaN(numeric) || numeric <= 0) return undefined;
  return cleaned;
}

function extractValueByKeywords(transcript: string, keywords: string[]) {
  const keywordPattern = keywords.map(escapeRegex).join("|");
  const valueBeforeKeyword = new RegExp(
    `([0-9]+(?:[.,][0-9]+)?)\\s*(?:${keywordPattern})`,
    "i"
  );
  const keywordBeforeValue = new RegExp(
    `(?:${keywordPattern})\\s*([0-9]+(?:[.,][0-9]+)?)`,
    "i"
  );

  const beforeMatch = transcript.match(valueBeforeKeyword)?.[1];
  const afterMatch = transcript.match(keywordBeforeValue)?.[1];
  return normalizeNumberValue(beforeMatch ?? afterMatch);
}

function parseVoiceFuelCommand(transcript: string): ParsedVoiceFields {
  const liters = extractValueByKeywords(transcript, [
    "ליטר",
    "ליטרים",
    "liter",
    "liters",
    "литр",
    "литра",
  ]);
  const totalPrice = extractValueByKeywords(transcript, [
    "שקל",
    "שקלים",
    "שח",
    "ש\"ח",
    "דולר",
    "אירו",
    "רובל",
    "nis",
    "ils",
    "usd",
    "eur",
    "rub",
    "dollar",
    "euro",
    "евро",
    "руб",
  ]);
  const odometer = extractValueByKeywords(transcript, [
    "קילומטר",
    "קילומטרים",
    "קמ",
    "ק\"מ",
    "km",
    "kilometer",
    "kilometers",
    "километр",
    "километров",
    "mile",
    "miles",
    "миля",
  ]);

  const fallbackNumbers = transcript.match(/[0-9]+(?:[.,][0-9]+)?/g) ?? [];

  return {
    liters: liters ?? normalizeNumberValue(fallbackNumbers[0]),
    totalPrice: totalPrice ?? normalizeNumberValue(fallbackNumbers[1]),
    odometer: odometer ?? normalizeNumberValue(fallbackNumbers[2]),
  };
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [entries, setEntries] = useState<FuelEntry[]>([]);
  const [loadingEntries, setLoadingEntries] = useState(false);
  const [vehicles, setVehicles] = useState<VehicleRecord[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [vehicleForm, setVehicleForm] =
    useState<VehicleFormState>(initialVehicleForm);
  const [form, setForm] = useState<FuelFormState>(initialFuelForm);
  const [activePanel, setActivePanel] = useState<DashboardPanel | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [voiceListening, setVoiceListening] = useState(false);
  const [plateLookupLoading, setPlateLookupLoading] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const optimisticCounterRef = useRef(0);
  const [settings, setSettings] = useState<UserSettings>(() => {
    const saved = localStorage.getItem("fuel-tracker-settings");
    if (saved) {
      return normalizeSettings(JSON.parse(saved) as Partial<UserSettings>);
    }
    return normalizeSettings({ ...defaultSettings, ...detectRegionalDefaults() });
  });

  const t = getTranslations(settings.language);
  const dir = settings.language === "he" ? "rtl" : "ltr";
  const pageThemeStyle =
    settings.theme === "dark" ? styles.pageThemeDark : styles.pageThemeLight;
  const voiceInputSupported = useMemo(() => {
    if (typeof window === "undefined") return false;
    const speechWindow = window as Window & {
      SpeechRecognition?: new () => {
        lang: string;
        interimResults: boolean;
        continuous: boolean;
        maxAlternatives: number;
        start: () => void;
        onresult: ((event: unknown) => void) | null;
        onerror: (() => void) | null;
        onend: (() => void) | null;
      };
      webkitSpeechRecognition?: new () => {
        lang: string;
        interimResults: boolean;
        continuous: boolean;
        maxAlternatives: number;
        start: () => void;
        onresult: ((event: unknown) => void) | null;
        onerror: (() => void) | null;
        onend: (() => void) | null;
      };
    };
    return Boolean(
      speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition
    );
  }, []);

  useEffect(() => {
    localStorage.setItem("fuel-tracker-settings", JSON.stringify(settings));
  }, [settings]);

  const manufacturers = useMemo(() => VEHICLES.map((item) => item.brand), []);

  const syncCloudState = useCallback(
    async (userId: string, state: CloudAppState) => {
      const { error } = await upsertCloudAppState(userId, state);
      if (error) {
        console.error("Failed to sync cloud app state", error);
      }
    },
    []
  );

  const availableModels = useMemo(() => {
    const selectedBrandData = VEHICLES.find(
      (item) => item.brand === vehicleForm.manufacturer
    );

    return selectedBrandData ? selectedBrandData.models : [];
  }, [vehicleForm.manufacturer]);

  const availableYears = useMemo(
    () =>
      Array.from(
        { length: new Date().getFullYear() - 1995 + 1 },
        (_, index) => String(new Date().getFullYear() - index)
      ),
    []
  );

  const hydrateUserData = useCallback(
    (
      userId: string,
      loadedProfile: Profile | null,
      fuelEntries: FuelEntry[],
      cloudState: CloudAppState | null
    ) => {
      const localSettingsRaw = localStorage.getItem("fuel-tracker-settings");
      let fallbackSettings: UserSettings = normalizeSettings({
        ...defaultSettings,
        ...detectRegionalDefaults(),
      });
      if (localSettingsRaw) {
        try {
          fallbackSettings = normalizeSettings(
            JSON.parse(localSettingsRaw) as Partial<UserSettings>
          );
        } catch {
          fallbackSettings = normalizeSettings({
            ...defaultSettings,
            ...detectRegionalDefaults(),
          });
        }
      }
      const localData = loadUserLocalData(userId);
      const sourceData = cloudState?.userData ?? localData;
      let data = sourceData;
      data = {
        ...data,
        vehicles: data.vehicles.map(withVehicleDefaults),
      };
      data = mergePrimaryVehicle(data, loadedProfile);

      const fallbackVehicleId =
        data.selectedVehicleId ?? data.vehicles[0]?.id ?? null;

      const augmentedEntries = fuelEntries.map((entry) => {
        const meta = resolveEntryMeta(entry.id, data.entryMeta, fallbackVehicleId);
        data.entryMeta[entry.id] = meta;

        return {
          ...entry,
          fuel_time: meta.time,
          vehicle_local_id: meta.vehicleId,
        };
      });

      data.selectedVehicleId =
        data.selectedVehicleId ?? data.vehicles[0]?.id ?? null;

      saveUserLocalData(userId, data);
      setSettings(normalizeSettings(cloudState?.settings ?? fallbackSettings));
      setVehicles(data.vehicles);
      setSelectedVehicleId(data.selectedVehicleId);
      setEntries(augmentedEntries);
      setVehicleForm(
        vehicleToForm(
          data.vehicles.find((vehicle) => vehicle.id === data.selectedVehicleId) ??
            data.vehicles[0] ??
            null
        )
      );
      setForm((currentForm) =>
        currentForm.vehicleId || !data.selectedVehicleId
          ? currentForm
          : {
              ...currentForm,
              vehicleId: data.selectedVehicleId,
              fuelType:
                data.vehicles.find((vehicle) => vehicle.id === data.selectedVehicleId)
                  ?.fuelType ?? currentForm.fuelType,
            }
      );

      if (!cloudState) {
        void syncCloudState(userId, {
          settings: fallbackSettings,
          userData: data,
        });
      }
    },
    [syncCloudState]
  );

  const loadProfile = useCallback(
    async (userId: string, userEmail: string | null) => {
      setLoadingProfile(true);
      const { data, error } = await getProfile(userId);
      setLoadingProfile(false);

      if (error) {
        console.error("Failed to load vehicle profile", error);
        return null;
      }

      if (!data) {
        setProfile(null);
        return null;
      }

      const loadedProfile = toProfile(data);
      setProfile(loadedProfile);

      if (!loadedProfile.email && userEmail) {
        await updateProfileEmail(userId, userEmail);
      }

      return loadedProfile;
    },
    []
  );

  const loadEntries = useCallback(async (userId: string) => {
    setLoadingEntries(true);
    const { data, error } = await getFuelEntries(userId);
    setLoadingEntries(false);

    if (error) {
      console.error("Failed to load fuel entries", error);
      return [];
    }

    return toEntries(data);
  }, []);

  useEffect(() => {
    let isMounted = true;
    let authInitialized = false;

    async function syncSession(
      nextSession: Session | null,
      options?: { clearOnNull?: boolean }
    ) {
      const clearOnNull = options?.clearOnNull ?? true;
      setSession(nextSession);

      if (nextSession?.user?.id) {
        const [loadedProfile, fuelEntries, cloudStateResult] = await Promise.all([
          loadProfile(nextSession.user.id, nextSession.user.email ?? null),
          loadEntries(nextSession.user.id),
          getCloudAppState(nextSession.user.id),
        ]);
        if (cloudStateResult.error) {
          console.error("Failed to load cloud app state", cloudStateResult.error);
        }
        hydrateUserData(
          nextSession.user.id,
          loadedProfile,
          fuelEntries,
          cloudStateResult.data
        );
        setShowAuth(false);
        return;
      }

      if (!clearOnNull) {
        return;
      }

      setProfile(null);
      setEntries([]);
      setVehicles([]);
      setSelectedVehicleId(null);
      setVehicleForm(initialVehicleForm);
      setForm(initialFuelForm());
    }

    supabase.auth.getSession().then(({ data }) => {
      authInitialized = true;
      void syncSession(data.session ?? null, { clearOnNull: true });
      if (isMounted) {
        setAuthReady(true);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === "INITIAL_SESSION") {
        return;
      }

      if (!authInitialized && !nextSession) {
        return;
      }

      const shouldClearOnNull = event === "SIGNED_OUT";
      void syncSession(nextSession, { clearOnNull: shouldClearOnNull });
      if (isMounted) {
        setAuthReady(true);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [hydrateUserData, loadEntries, loadProfile]);

  const filteredEntries = useMemo(() => {
    if (!selectedVehicleId) return entries;
    return entries.filter((entry) => entry.vehicle_local_id === selectedVehicleId);
  }, [entries, selectedVehicleId]);

  const sortedEntries = useMemo(() => sortEntries(filteredEntries), [filteredEntries]);
  const enrichedEntries = useMemo(() => enrichEntries(sortedEntries), [sortedEntries]);
  const totals = useMemo(() => calculateTotals(enrichedEntries), [enrichedEntries]);

  const activeVehicle = useMemo(
    () =>
      vehicles.find((vehicle) => vehicle.id === selectedVehicleId) ??
      vehicles[0] ??
      null,
    [selectedVehicleId, vehicles]
  );

  const lastOdometer =
    sortedEntries.length > 0 ? sortedEntries[sortedEntries.length - 1].odometer : null;

  const averageDistancePerVolume = convertDistancePerVolume(
    totals.avgKmPerLiter,
    settings.distanceUnit,
    settings.volumeUnit
  );
  const averageVolumePerHundred = convertVolumePerHundredDistance(
    totals.avgLitersPer100Km,
    settings.distanceUnit,
    settings.volumeUnit
  );
  const averageCostPerDistance = convertCurrencyPerDistance(
    totals.avgCostPerKm,
    settings.distanceUnit,
    settings.currency
  );
  const locale =
    settings.language === "en"
      ? "en-US"
      : settings.language === "ru"
        ? "ru-RU"
        : "he-IL";
  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const currentMonthLabel = new Intl.DateTimeFormat(locale, {
    month: "long",
    year: "numeric",
  }).format(currentMonthStart);
  const daysInCurrentMonth = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0
  ).getDate();
  const elapsedDaysInCurrentMonth = Math.max(now.getDate(), 1);
  const currentMonthCostSoFar = sortedEntries
    .filter((entry) => {
      const entryDate = new Date(`${entry.date}T00:00:00`);
      return (
        entryDate.getFullYear() === now.getFullYear() &&
        entryDate.getMonth() === now.getMonth()
      );
    })
    .reduce((sum, entry) => sum + entry.total_price, 0);
  const monthlyFuelCostForecast =
    currentMonthCostSoFar > 0
      ? (currentMonthCostSoFar / elapsedDaysInCurrentMonth) * daysInCurrentMonth
      : null;
  const monthlyFuelCostText =
    monthlyFuelCostForecast !== null
      ? formatCurrency(
          monthlyFuelCostForecast,
          settings.language,
          settings.currency
        )
      : t.forecastNotEnoughData;
  const monthlyFuelCostSentence =
    monthlyFuelCostForecast !== null
      ? t.monthlyFuelCostSentence.replace(
          "{month}",
          currentMonthLabel
        ).replace(
          "{amount}",
          formatCurrency(
            monthlyFuelCostForecast,
            settings.language,
            settings.currency
          )
        )
      : "";
  const annualFuelCostForecast =
    totals.avgCostPerDay && totals.avgCostPerDay > 0
      ? totals.avgCostPerDay * 365
      : null;
  const annualFuelCostText =
    annualFuelCostForecast !== null
      ? formatCurrency(
          annualFuelCostForecast,
          settings.language,
          settings.currency
        )
      : t.forecastNotEnoughData;
  const annualFuelCostSentence =
    annualFuelCostForecast !== null
      ? t.annualFuelCostSentence.replace(
          "{amount}",
          formatCurrency(
            annualFuelCostForecast,
            settings.language,
            settings.currency
          )
        )
      : "";
  const monthlyExpenseRows = useMemo(() => {
    const grouped = new Map<
      string,
      { totalCost: number; fillUps: number; year: number; month: number }
    >();
    for (const entry of sortedEntries) {
      const entryDate = new Date(`${entry.date}T00:00:00`);
      const year = entryDate.getFullYear();
      const month = entryDate.getMonth();
      const key = `${year}-${String(month + 1).padStart(2, "0")}`;
      const current = grouped.get(key) ?? { totalCost: 0, fillUps: 0, year, month };
      current.totalCost += entry.total_price;
      current.fillUps += 1;
      grouped.set(key, current);
    }

    return Array.from(grouped.entries())
      .sort(([keyA], [keyB]) => keyB.localeCompare(keyA))
      .map(([monthKey, value]) => ({
        monthKey,
        monthLabel: new Intl.DateTimeFormat(locale, {
          month: "long",
          year: "numeric",
        }).format(new Date(value.year, value.month, 1)),
        totalCost: value.totalCost,
        fillUps: value.fillUps,
      }));
  }, [locale, sortedEntries]);
  const demoSortedEntries = useMemo(() => sortEntries(demoEntries), []);
  const demoEnrichedEntries = useMemo(
    () => enrichEntries(demoSortedEntries),
    [demoSortedEntries]
  );
  const demoTotals = useMemo(
    () => calculateTotals(demoEnrichedEntries),
    [demoEnrichedEntries]
  );
  const demoAverageDistancePerVolume = convertDistancePerVolume(
    demoTotals.avgKmPerLiter,
    settings.distanceUnit,
    settings.volumeUnit
  );
  const demoAverageVolumePerHundred = convertVolumePerHundredDistance(
    demoTotals.avgLitersPer100Km,
    settings.distanceUnit,
    settings.volumeUnit
  );
  const demoAverageCostPerDistance = convertCurrencyPerDistance(
    demoTotals.avgCostPerKm,
    settings.distanceUnit,
    settings.currency
  );
  const demoPrimaryConsumptionValue =
    settings.consumptionView === "distance_per_volume"
      ? `${formatNumber(
          demoAverageDistancePerVolume,
          settings.language
        )} ${getLocalizedDistanceUnitLabel(
          settings.distanceUnit,
          settings.language
        )}/${getLocalizedVolumeUnitLabel(
          settings.volumeUnit,
          settings.language
        )}`
      : `${formatNumber(
          demoAverageVolumePerHundred,
          settings.language
        )} ${getLocalizedVolumeUnitLabel(
          settings.volumeUnit,
          settings.language
        )}/100 ${getLocalizedDistanceUnitLabel(
          settings.distanceUnit,
          settings.language
        )}`;
  const demoLastOdometer =
    demoSortedEntries.length > 0
      ? demoSortedEntries[demoSortedEntries.length - 1].odometer
      : null;
  const demoCurrentMonthCostSoFar = demoSortedEntries
    .filter((entry) => {
      const entryDate = new Date(`${entry.date}T00:00:00`);
      return (
        entryDate.getFullYear() === now.getFullYear() &&
        entryDate.getMonth() === now.getMonth()
      );
    })
    .reduce((sum, entry) => sum + entry.total_price, 0);
  const demoMonthlyFuelCostForecast =
    demoCurrentMonthCostSoFar > 0
      ? (demoCurrentMonthCostSoFar / elapsedDaysInCurrentMonth) * daysInCurrentMonth
      : null;
  const demoMonthlyFuelCostText =
    demoMonthlyFuelCostForecast !== null
      ? formatCurrency(
          demoMonthlyFuelCostForecast,
          settings.language,
          settings.currency
        )
      : t.forecastNotEnoughData;
  const demoMonthlyFuelCostSentence =
    demoMonthlyFuelCostForecast !== null
      ? t.monthlyFuelCostSentence.replace("{month}", currentMonthLabel).replace(
          "{amount}",
          formatCurrency(
            demoMonthlyFuelCostForecast,
            settings.language,
            settings.currency
          )
        )
      : "";
  const demoBenchmarkComparisonText = (() => {
    const benchmark = demoVehicle.benchmarkLitersPer100Km;
    if (!benchmark || !demoTotals.avgLitersPer100Km) {
      return t.benchmarkMissing;
    }
    const diff = demoTotals.avgLitersPer100Km - benchmark;
    if (Math.abs(diff) < 0.15) {
      return `${t.equalToAverage} (${formatNumber(benchmark, settings.language)} / 100)`;
    }
    return diff < 0
      ? `${t.betterThanAverage} (${formatNumber(benchmark, settings.language)} / 100)`
      : `${t.worseThanAverage} (${formatNumber(benchmark, settings.language)} / 100)`;
  })();
  const demoBenchmarkTone: "good" | "warning" | "bad" | "default" = (() => {
    const benchmark = demoVehicle.benchmarkLitersPer100Km;
    if (!benchmark || !demoTotals.avgLitersPer100Km) return "default";
    const diff = demoTotals.avgLitersPer100Km - benchmark;
    if (Math.abs(diff) < 0.15) return "warning";
    if (diff < 0) return "good";
    return "bad";
  })();
  const demoConsumptionTrendValues = demoEnrichedEntries
    .filter(
      (entry) =>
        entry.daysFromPrev !== null &&
        entry.daysFromPrev > 0 &&
        entry.distanceFromPrev !== null &&
        entry.distanceFromPrev > 0 &&
        entry.liters > 0
    )
    .slice(-10)
    .map((entry) => convertVolume(entry.liters, settings.volumeUnit) ?? 0);
  const demoPriceTrendValues = demoEnrichedEntries
    .filter((entry) => entry.liters > 0 && entry.total_price > 0)
    .slice(-10)
    .map((entry) => {
      const selectedVolume = convertVolume(entry.liters, settings.volumeUnit);
      const selectedCurrency = convertCurrency(entry.total_price, settings.currency);
      if (!selectedVolume || !selectedCurrency) return 0;
      return Number((selectedCurrency / selectedVolume).toFixed(3));
    });
  const demoLocalizedEntries = demoEnrichedEntries.map((entry) => {
    const tankCapacity = demoVehicle.tankCapacity ?? null;
    const tankPercentBeforeRefuel =
      tankCapacity && tankCapacity > 0
        ? Math.max(0, Math.min(100, ((tankCapacity - entry.liters) / tankCapacity) * 100))
        : null;
    return {
      ...entry,
      fuel_type: getFuelTypeLabel(entry.fuel_type),
      tankPercentBeforeRefuel,
    };
  });

  const primaryConsumptionLabel =
    settings.consumptionView === "distance_per_volume"
      ? t.avgDistancePerVolume
      : t.avgVolumePerHundred;
  const primaryConsumptionValue =
    settings.consumptionView === "distance_per_volume"
      ? `${formatNumber(
          averageDistancePerVolume,
          settings.language
        )} ${getLocalizedDistanceUnitLabel(
          settings.distanceUnit,
          settings.language
        )}/${getLocalizedVolumeUnitLabel(
          settings.volumeUnit,
          settings.language
        )}`
      : `${formatNumber(
          averageVolumePerHundred,
          settings.language
        )} ${getLocalizedVolumeUnitLabel(
          settings.volumeUnit,
          settings.language
        )}/100 ${getLocalizedDistanceUnitLabel(
          settings.distanceUnit,
          settings.language
        )}`;

  const nextRefuelForecast = (() => {
    if (!lastOdometer) {
      return {
        primary: t.forecastNotEnoughData,
        secondary: "",
      };
    }

    const tankCapacity = activeVehicle?.tankCapacity ?? null;
    if (!tankCapacity || tankCapacity <= 0) {
      return {
        primary: t.tankCapacityMissing,
        secondary: "",
      };
    }

    const avgLitersPer100Km = totals.avgLitersPer100Km;
    if (!avgLitersPer100Km || avgLitersPer100Km <= 0) {
      return {
        primary: t.forecastNotEnoughData,
        secondary: "",
      };
    }

    const expectedRangeKm = (tankCapacity / avgLitersPer100Km) * 100;
    const predictedOdometer = lastOdometer + expectedRangeKm;

    let predictedDateLabel = "-";
    if (totals.avgKmPerDay && totals.avgKmPerDay > 0) {
      const daysUntilRefuel = Math.max(
        0,
        Math.round(expectedRangeKm / totals.avgKmPerDay)
      );
      const predictedDate = new Date();
      predictedDate.setDate(predictedDate.getDate() + daysUntilRefuel);
      predictedDateLabel = predictedDate.toLocaleDateString(
        settings.language === "en"
          ? "en-US"
          : settings.language === "ru"
            ? "ru-RU"
            : "he-IL"
      );
    }

    return {
      primary: `${t.forecastDateLabel}: ${predictedDateLabel}`,
      secondary: `${t.forecastOdometerLabel}: ${formatDistance(
        predictedOdometer,
        settings.language,
        settings.distanceUnit
      )} ${getLocalizedDistanceUnitLabel(
        settings.distanceUnit,
        settings.language
      )}`,
    };
  })();

  async function handleGoogleLogin() {
    const { error } = await signInWithGoogle();
    if (error) alert(error.message);
  }

  async function handleAuth() {
    if (!email || !password) {
      alert(t.authMissing);
      return;
    }

    if (authMode === "signup") {
      const { error } = await signUpWithPassword(email, password);
      if (error) {
        alert(error.message);
        return;
      }

      alert(t.authCreated);
      return;
    }

    const { error } = await signInWithPassword(email, password);
    if (error) alert(error.message);
  }

  async function handleLogout() {
    await signOut();
  }

  function persistLocalData(updater: (data: UserLocalData) => UserLocalData) {
    if (!session?.user?.id) return null;
    const current = loadUserLocalData(session.user.id);
    const next = updater(current);
    saveUserLocalData(session.user.id, next);
    void syncCloudState(session.user.id, {
      settings,
      userData: next,
    });
    return next;
  }

  function handleSettingsChange(nextSettings: UserSettings) {
    const normalized = normalizeSettings(nextSettings);
    setSettings(normalized);
    if (!session?.user?.id) return;
    const currentData = loadUserLocalData(session.user.id);
    void syncCloudState(session.user.id, {
      settings: normalized,
      userData: currentData,
    });
  }

  function handleUseCurrentLocation() {
    if (!navigator.geolocation) {
      alert(t.locationNotSupported);
      return;
    }
    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude.toFixed(5);
        const lon = position.coords.longitude.toFixed(5);
        setForm((currentForm) => ({
          ...currentForm,
          station: `${t.gpsLocationPrefix}: ${lat}, ${lon}`,
        }));
        setLocationLoading(false);
      },
      () => {
        alert(t.locationPermissionDenied);
        setLocationLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
      }
    );
  }

  function handleStartVoiceInput() {
    if (typeof window === "undefined") return;
    const speechWindow = window as Window & {
      SpeechRecognition?: new () => {
        lang: string;
        interimResults: boolean;
        continuous: boolean;
        maxAlternatives: number;
        start: () => void;
        onresult: ((event: unknown) => void) | null;
        onerror: (() => void) | null;
        onend: (() => void) | null;
      };
      webkitSpeechRecognition?: new () => {
        lang: string;
        interimResults: boolean;
        continuous: boolean;
        maxAlternatives: number;
        start: () => void;
        onresult: ((event: unknown) => void) | null;
        onerror: (() => void) | null;
        onend: (() => void) | null;
      };
    };
    const SpeechRecognitionClass =
      speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
    if (!SpeechRecognitionClass) {
      alert(t.voiceInputNotSupported);
      return;
    }

    const recognition = new SpeechRecognitionClass();
    recognition.lang =
      settings.language === "en"
        ? "en-US"
        : settings.language === "ru"
          ? "ru-RU"
          : "he-IL";
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;
    setVoiceListening(true);

    recognition.onresult = (event: unknown) => {
      const resultEvent = event as {
        results?: ArrayLike<ArrayLike<{ transcript?: string }>>;
      };
      const transcript =
        resultEvent.results?.[0]?.[0]?.transcript?.trim().toLowerCase() ?? "";
      if (!transcript) {
        alert(t.voiceInputFailed);
        return;
      }

      const parsed = parseVoiceFuelCommand(transcript);
      if (!parsed.liters && !parsed.totalPrice && !parsed.odometer) {
        alert(t.voiceInputFailed);
        return;
      }

      setForm((currentForm) => ({
        ...currentForm,
        liters: parsed.liters ?? currentForm.liters,
        totalPrice: parsed.totalPrice ?? currentForm.totalPrice,
        odometer: parsed.odometer ?? currentForm.odometer,
      }));
      alert(t.voiceInputApplied);
    };

    recognition.onerror = () => {
      alert(t.voiceInputFailed);
    };

    recognition.onend = () => {
      setVoiceListening(false);
    };

    try {
      recognition.start();
    } catch {
      setVoiceListening(false);
      alert(t.voiceInputFailed);
    }
  }

  function updateVehicleForm(field: keyof VehicleFormState, value: string) {
    setVehicleForm((currentForm) => ({
      ...currentForm,
      [field]: value,
      ...(field === "manufacturer" ? { model: "" } : {}),
    }));
  }

  async function handleLookupByPlate() {
    const plate = (vehicleForm.licensePlate ?? "").trim();
    if (!plate) {
      alert(t.plateRequired);
      return;
    }

    setPlateLookupLoading(true);
    const { data, error } = await findVehicleByLicensePlate(plate);
    setPlateLookupLoading(false);

    if (error) {
      if (
        error.message?.includes("vehicle_registry_il") ||
        error.message?.includes("schema cache")
      ) {
        alert(t.plateLookupSetupNeeded);
        return;
      }
      alert(error.message);
      return;
    }

    if (!data) {
      alert(t.plateNotFound);
      return;
    }

    const yearValue = String(data.shnat_yitzur ?? "").trim();
    const numericPlate = plate.replace(/\D/g, "");
    const rawManufacturer = String(data.tozeret_nm ?? "").trim();
    const mappedManufacturer =
      findBestManufacturerFromRegistry(rawManufacturer, manufacturers) ||
      rawManufacturer;

    const rawModelCandidates = [
      String(data.kinuy_mishari ?? "").trim(),
      String(data.degem_nm ?? "").trim(),
    ].filter((value) => value.length > 0);
    const knownModels =
      VEHICLES.find((item) => item.brand === mappedManufacturer)?.models ?? [];
    const mappedModel =
      rawModelCandidates
        .map((candidate) => findBestModelFromRegistry(candidate, knownModels))
        .find((value) => Boolean(value)) ??
      rawModelCandidates[0] ??
      "";

    const normalizedFuelType = normalizeFuelTypeKey(
      String(data.sug_delek_nm ?? "").trim()
    );

    setVehicleForm((currentForm) => ({
      ...currentForm,
      licensePlate: numericPlate || currentForm.licensePlate || "",
      manufacturer: mappedManufacturer || currentForm.manufacturer,
      model: mappedModel || currentForm.model,
      year: yearValue || currentForm.year,
      fuelType: normalizedFuelType,
    }));

    alert(t.plateLookupSuccess);
  }

  function handleSelectVehicle(vehicleId: string) {
    const vehicle = vehicles.find((item) => item.id === vehicleId) ?? null;
    setSelectedVehicleId(vehicleId || null);
    setVehicleForm(vehicleToForm(vehicle));
    setForm((currentForm) => ({
      ...currentForm,
      vehicleId: vehicleId || currentForm.vehicleId,
      fuelType: vehicle?.fuelType ?? currentForm.fuelType,
    }));

    persistLocalData((data) => ({
      ...data,
      selectedVehicleId: vehicleId || null,
    }));
  }

  function handleAddNewVehicle() {
    setSelectedVehicleId(null);
    setVehicleForm(initialVehicleForm);
  }

  async function saveVehicleProfile() {
    if (!session?.user?.id) return;

    const yearNumber = Number(vehicleForm.year);
    if (
      !vehicleForm.manufacturer ||
      !vehicleForm.model ||
      !vehicleForm.year ||
      !vehicleForm.fuelType
    ) {
      alert(t.vehicleRequired);
      return;
    }

    if (!yearNumber || yearNumber < 1950 || yearNumber > 2100) {
      alert(t.vehicleYearInvalid);
      return;
    }

    const existingVehicle = selectedVehicleId
      ? vehicles.find((vehicle) => vehicle.id === selectedVehicleId) ?? null
      : null;

    const vehicleId = existingVehicle?.id ?? createVehicleId();
    const nextVehicle: VehicleRecord = {
      id: vehicleId,
      manufacturer: vehicleForm.manufacturer,
      model: vehicleForm.model,
      year: yearNumber,
      fuelType: normalizeFuelTypeKey(vehicleForm.fuelType),
      licensePlate: (vehicleForm.licensePlate ?? "").replace(/\D/g, ""),
      benchmarkLitersPer100Km: vehicleForm.benchmarkLitersPer100Km
        ? Number(vehicleForm.benchmarkLitersPer100Km)
        : null,
      tankCapacity: vehicleForm.tankCapacity
        ? Number(vehicleForm.tankCapacity)
        : null,
      isPrimary: existingVehicle?.isPrimary ?? vehicles.length === 0,
    };

    const local = persistLocalData((data) => {
      const existingIndex = data.vehicles.findIndex((vehicle) => vehicle.id === vehicleId);
      const nextVehicles = [...data.vehicles];

      if (existingIndex >= 0) {
        nextVehicles[existingIndex] = nextVehicle;
      } else {
        nextVehicles.push(nextVehicle);
      }

      return {
        ...data,
        vehicles: nextVehicles,
        selectedVehicleId: vehicleId,
      };
    });

    if (nextVehicle.isPrimary) {
      const { error } = await upsertProfile(
        session.user.id,
        session.user.email ?? null,
        vehicleToForm(nextVehicle)
      );

      if (error) {
        alert(error.message);
        return;
      }
    }

    if (local) {
      setVehicles(local.vehicles);
      setSelectedVehicleId(local.selectedVehicleId);
      setVehicleForm(vehicleToForm(nextVehicle));
      setForm((currentForm) => ({
        ...currentForm,
        vehicleId,
        fuelType: nextVehicle.fuelType,
      }));
      setProfile((currentProfile) =>
        nextVehicle.isPrimary
          ? {
              id: session.user.id,
              email: session.user.email ?? null,
              manufacturer: nextVehicle.manufacturer,
              model: nextVehicle.model,
              year: nextVehicle.year,
              created_at: currentProfile?.created_at,
            }
          : currentProfile
      );
    }

    alert(t.vehicleSaved);
    setActivePanel(null);
  }

  function handleDeleteVehicle() {
    if (!session?.user?.id || !selectedVehicleId) return;
    if (vehicles.length <= 1) {
      alert(t.saveVehicleHint);
      return;
    }

    const remaining = vehicles.filter((vehicle) => vehicle.id !== selectedVehicleId);
    const nextSelected = remaining[0] ?? null;
    const local = persistLocalData((data) => ({
      ...data,
      vehicles: remaining,
      selectedVehicleId: nextSelected?.id ?? null,
    }));

    if (local) {
      setVehicles(local.vehicles);
      setSelectedVehicleId(local.selectedVehicleId);
      setVehicleForm(vehicleToForm(nextSelected));
      setForm((currentForm) => ({
        ...currentForm,
        vehicleId: nextSelected?.id ?? "",
        fuelType: nextSelected?.fuelType ?? currentForm.fuelType,
      }));
    }

    alert(t.vehicleDeleted);
  }

  function updateForm(field: keyof FuelFormState, value: string) {
    setForm((currentForm) => {
      if (field === "vehicleId") {
        const selected = vehicles.find((vehicle) => vehicle.id === value) ?? null;
        return {
          ...currentForm,
          vehicleId: value,
          fuelType: selected?.fuelType ?? currentForm.fuelType,
        };
      }
      return { ...currentForm, [field]: value };
    });
  }

  function resetFuelForm(vehicleId = selectedVehicleId ?? "") {
    setEditingEntryId(null);
    setForm(initialFuelForm(vehicleId));
  }

  async function saveEntryMeta(entryId: string, meta: EntryMetaRecord) {
    const local = persistLocalData((data) => ({
      ...data,
      entryMeta: {
        ...data.entryMeta,
        [entryId]: meta,
      },
    }));

    if (!local) return;

    setEntries((currentEntries) =>
      currentEntries.map((entry) =>
        entry.id === entryId
          ? { ...entry, fuel_time: meta.time, vehicle_local_id: meta.vehicleId }
          : entry
      )
    );
  }

  async function saveFuelEntry() {
    if (!session?.user?.id) return;
    if (!form.vehicleId) {
      alert(t.saveVehicleFirst);
      return;
    }

    const liters = Number(form.liters);
    const totalPrice = Number(form.totalPrice);
    const odometer = Number(form.odometer);
    const selectedVehicle =
      vehicles.find((vehicle) => vehicle.id === form.vehicleId) ?? null;
    const normalizedFuelType = normalizeFuelTypeKey(
      selectedVehicle?.fuelType ?? form.fuelType
    );

    if (!form.date || !form.time || !liters || !totalPrice || !odometer) {
      alert(t.fuelRequired);
      return;
    }

    const parseEntryTimestamp = (dateValue: string, timeValue?: string) =>
      new Date(`${dateValue}T${timeValue && timeValue.length > 0 ? timeValue : "00:00"}`).getTime();

    const vehicleEntries = entries.filter(
      (entry) =>
        entry.vehicle_local_id === form.vehicleId &&
        (!editingEntryId || entry.id !== editingEntryId)
    );

    const candidateId = editingEntryId ?? "__new_entry__";
    const candidateEntry = {
      id: candidateId,
      vehicle_local_id: form.vehicleId,
      date: form.date,
      fuel_time: form.time,
      odometer,
    };

    const orderedEntries = [...vehicleEntries, candidateEntry].sort(
      (a, b) =>
        parseEntryTimestamp(a.date, a.fuel_time) -
          parseEntryTimestamp(b.date, b.fuel_time) || a.odometer - b.odometer
    );

    const candidateIndex = orderedEntries.findIndex(
      (entry) => entry.id === candidateId
    );
    const previousVehicleEntry =
      candidateIndex > 0 ? orderedEntries[candidateIndex - 1] : null;
    const nextVehicleEntry =
      candidateIndex >= 0 && candidateIndex < orderedEntries.length - 1
        ? orderedEntries[candidateIndex + 1]
        : null;

    if (previousVehicleEntry && odometer <= previousVehicleEntry.odometer) {
      alert(t.odometerInvalid);
      return;
    }

    if (nextVehicleEntry && odometer >= nextVehicleEntry.odometer) {
      alert(t.odometerInvalid);
      return;
    }

    if (editingEntryId) {
      const previousEntry =
        entries.find((entry) => entry.id === editingEntryId) ?? null;
      const optimisticUpdatedEntry: FuelEntry = {
        id: editingEntryId,
        user_id: session.user.id,
        date: form.date,
        liters,
        total_price: totalPrice,
        odometer,
        fuel_type: normalizedFuelType,
        station: form.station,
        notes: form.notes,
        fuel_time: form.time,
        vehicle_local_id: form.vehicleId,
      };
      setEntries((currentEntries) =>
        currentEntries.map((entry) =>
          entry.id === editingEntryId ? optimisticUpdatedEntry : entry
        )
      );

      const { data, error } = await updateFuelEntry(editingEntryId, {
        ...form,
        fuelType: normalizedFuelType,
      });
      if (error) {
        if (previousEntry) {
          setEntries((currentEntries) =>
            currentEntries.map((entry) =>
              entry.id === editingEntryId ? previousEntry : entry
            )
          );
        }
        alert(error.message);
        return;
      }

      await saveEntryMeta(editingEntryId, {
        vehicleId: form.vehicleId,
        time: form.time,
      });

      setEntries((currentEntries) =>
        currentEntries.map((entry) =>
          entry.id === editingEntryId
            ? {
                ...entry,
                ...toEntries([data])[0],
                fuel_type: normalizedFuelType,
                fuel_time: form.time,
                vehicle_local_id: form.vehicleId,
              }
            : entry
        )
      );

      alert(t.fuelUpdated);
    } else {
      optimisticCounterRef.current += 1;
      const tempId = `temp-${optimisticCounterRef.current}`;
      const optimisticEntry: FuelEntry = {
        id: tempId,
        user_id: session.user.id,
        date: form.date,
        liters,
        total_price: totalPrice,
        odometer,
        fuel_type: normalizedFuelType,
        station: form.station,
        notes: form.notes,
        fuel_time: form.time,
        vehicle_local_id: form.vehicleId,
      };
      setEntries((currentEntries) => [...currentEntries, optimisticEntry]);

      const { data, error } = await createFuelEntry(session.user.id, {
        ...form,
        fuelType: normalizedFuelType,
      });
      if (error) {
        setEntries((currentEntries) =>
          currentEntries.filter((entry) => entry.id !== tempId)
        );
        alert(error.message);
        return;
      }

      await saveEntryMeta(data.id, {
        vehicleId: form.vehicleId,
        time: form.time,
      });

      setEntries((currentEntries) =>
        currentEntries.map((entry) =>
          entry.id === tempId
            ? {
                ...data,
                fuel_type: normalizedFuelType,
                fuel_time: form.time,
                vehicle_local_id: form.vehicleId,
              }
            : entry
        )
      );

      alert(t.fuelSaved);
    }

    resetFuelForm(form.vehicleId);
    setActivePanel(null);
  }

  async function deleteEntry(id: string) {
    const { error } = await removeFuelEntry(id);
    if (error) {
      if (
        error.message?.includes("feedback_messages") ||
        error.message?.includes("schema cache")
      ) {
        alert(t.feedbackSetupNeeded);
        return;
      }
      alert(error.message);
      return;
    }

    const local = persistLocalData((data) => {
      const nextMeta = { ...data.entryMeta };
      delete nextMeta[id];
      return {
        ...data,
        entryMeta: nextMeta,
      };
    });

    if (local) {
      setEntries((currentEntries) => currentEntries.filter((entry) => entry.id !== id));
    }

    alert(t.fuelDeleted);
  }

  function handleEditEntry(id: string) {
    const entry = entries.find((item) => item.id === id);
    if (!entry) return;
    const entryVehicleId = entry.vehicle_local_id ?? selectedVehicleId ?? "";
    const entryVehicle =
      vehicles.find((vehicle) => vehicle.id === entryVehicleId) ?? null;

    setEditingEntryId(id);
    setForm({
      id: entry.id,
      date: entry.date,
      time: entry.fuel_time ?? currentTimeValue(),
      vehicleId: entryVehicleId,
      liters: String(entry.liters),
      totalPrice: String(entry.total_price),
      odometer: String(entry.odometer),
      fuelType: normalizeFuelTypeKey(entryVehicle?.fuelType ?? entry.fuel_type),
      station: entry.station,
      notes: entry.notes,
    });
    setActivePanel("add-entry");
  }

  function handleOpenPanel(panel: DashboardPanel) {
    if (panel === "add-entry" && !editingEntryId) {
      const fallbackVehicleId = form.vehicleId || selectedVehicleId || "";
      const fallbackVehicle =
        vehicles.find((vehicle) => vehicle.id === fallbackVehicleId) ?? null;
      setForm((currentForm) => ({
        ...initialFuelForm(fallbackVehicleId),
        vehicleId: fallbackVehicleId,
        fuelType: normalizeFuelTypeKey(
          fallbackVehicle?.fuelType ?? currentForm.fuelType
        ),
      }));
    }
    setActivePanel((currentPanel) => (currentPanel === panel ? null : panel));
  }

  async function handleSendFeedback() {
    const message = feedbackText.trim();
    if (!message) {
      alert(t.feedbackEmpty);
      return;
    }

    setSubmittingFeedback(true);
    const { error } = await createFeedbackMessage({
      message,
      language: settings.language,
      userId: session?.user?.id ?? null,
      email: session?.user?.email ?? null,
    });
    setSubmittingFeedback(false);

    if (error) {
      alert(error.message);
      return;
    }

    setFeedbackText("");
    setActivePanel(null);
    alert(t.feedbackThanks);
  }

  function getFuelTypeLabel(value: string) {
    const normalized = value.trim().toLowerCase();
    if (
      normalized === "fuel95" ||
      normalized === "בנזין 95" ||
      normalized === "gasoline 95" ||
      normalized === "бензин 95"
    ) {
      return t.fuel95;
    }
    if (
      normalized === "fuel98" ||
      normalized === "בנזין 98" ||
      normalized === "gasoline 98" ||
      normalized === "бензин 98"
    ) {
      return t.fuel98;
    }
    if (
      normalized === "diesel" ||
      normalized === "סולר" ||
      normalized === "дизель"
    ) {
      return t.diesel;
    }
    if (
      normalized === "other" ||
      normalized === "אחר" ||
      normalized === "другое"
    ) {
      return t.other;
    }
    return value;
  }

function normalizeFuelTypeKey(value: string) {
    const normalized = value.trim().toLowerCase();
    if (
      normalized === "fuel95" ||
      normalized === "בנזין" ||
      normalized === "בנזין 95" ||
      normalized === "gasoline 95" ||
      normalized === "gasoline" ||
      normalized === "бензин 95"
    ) {
      return "fuel95";
    }
    if (
      normalized === "fuel98" ||
      normalized === "בנזין 98" ||
      normalized === "gasoline 98" ||
      normalized === "бензин 98"
    ) {
      return "fuel98";
    }
    if (
      normalized === "diesel" ||
      normalized === "סולר" ||
      normalized === "дизель"
    ) {
      return "diesel";
    }
    if (
      normalized === "other" ||
      normalized === "חשמלי" ||
      normalized === "היברידי" ||
      normalized === "אחר" ||
      normalized === "другое"
    ) {
      return "other";
    }
  return "other";
}

const registryManufacturerNoiseTokens = new Set([
  "יפן",
  "גרמניה",
  "ארהב",
  "ארה\"ב",
  "ארה״ב",
  "קוריאה",
  "סין",
  "צכיה",
  "צרפת",
  "איטליה",
  "ספרד",
  "אנגליה",
  "הודו",
  "תורכיה",
  "טורקיה",
  "בריטניה",
  "רומניה",
  "סלובקיה",
  "מקסיקו",
  "ברזיל",
  "ארגנטינה",
  "בעמ",
  "בע\"מ",
  "בע״מ",
]);

function normalizeLookupText(value: string) {
  return value
    .toLowerCase()
    .replace(/["'`״׳]/g, "")
    .replace(/[-_/]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function compactLookupText(value: string) {
  return normalizeLookupText(value).replace(/\s+/g, "");
}

function calculateTextSimilarity(a: string, b: string) {
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (a.includes(b) || b.includes(a)) return 0.9;

  const aTokens = new Set(a.split(" ").filter(Boolean));
  const bTokens = new Set(b.split(" ").filter(Boolean));
  const union = new Set([...aTokens, ...bTokens]).size;
  const overlap = [...aTokens].filter((token) => bTokens.has(token)).length;
  const tokenScore = union > 0 ? overlap / union : 0;

  const aCompact = a.replace(/\s+/g, "");
  const bCompact = b.replace(/\s+/g, "");
  const minLength = Math.min(aCompact.length, bCompact.length);
  let prefixMatches = 0;
  for (let index = 0; index < minLength; index += 1) {
    if (aCompact[index] !== bCompact[index]) break;
    prefixMatches += 1;
  }
  const prefixScore = minLength > 0 ? prefixMatches / minLength : 0;

  return Math.max(tokenScore, prefixScore * 0.8);
}

function normalizeManufacturerFromRegistry(value: string) {
  const cleaned = normalizeLookupText(value);
  const filtered = cleaned
    .split(" ")
    .filter((token) => token && !registryManufacturerNoiseTokens.has(token));
  return filtered.join(" ").trim();
}

function findBestManufacturerFromRegistry(
  registryManufacturer: string,
  knownManufacturers: string[]
) {
  const target = normalizeManufacturerFromRegistry(registryManufacturer);
  const targetCompact = compactLookupText(target);
  if (!target) return "";

  const normalizedKnown = knownManufacturers.map((manufacturer) => ({
    manufacturer,
    normalized: normalizeLookupText(manufacturer),
    compact: compactLookupText(manufacturer),
  }));

  const exact = normalizedKnown.find(
    (item) => item.normalized === target || item.compact === targetCompact
  );
  if (exact) return exact.manufacturer;

  const contains = normalizedKnown.find(
    (item) =>
      item.normalized.includes(target) || target.includes(item.normalized)
  );
  if (contains) return contains.manufacturer;

  const firstWord = target.split(" ")[0] ?? "";
  if (firstWord) {
    const firstWordMatch = normalizedKnown.find(
      (item) => item.normalized === firstWord || item.normalized.startsWith(firstWord)
    );
    if (firstWordMatch) return firstWordMatch.manufacturer;
  }

  let bestManufacturer = "";
  let bestScore = 0;
  for (const item of normalizedKnown) {
    const score = calculateTextSimilarity(target, item.normalized);
    if (score > bestScore) {
      bestScore = score;
      bestManufacturer = item.manufacturer;
    }
  }
  if (bestScore >= 0.45) return bestManufacturer;

  return "";
}

function findBestModelFromRegistry(registryModel: string, knownModels: string[]) {
  const targetVariants = getVehicleLookupVariants(registryModel);
  if (targetVariants.length === 0) return "";

  const knownWithVariants = knownModels.map((model) => ({
    model,
    variants: getVehicleLookupVariants(model),
  }));

  const exact = knownWithVariants.find((item) =>
    item.variants.some((variant) => targetVariants.includes(variant))
  );
  if (exact) return exact.model;

  const contains = knownWithVariants.find(
    (item) =>
      item.variants.some((variant) =>
        targetVariants.some(
          (targetVariant) =>
            variant.includes(targetVariant) || targetVariant.includes(variant)
        )
      )
  );
  if (contains) return contains.model;

  let bestModel = "";
  let bestScore = 0;
  for (const item of knownWithVariants) {
    const score = getBestVariantScore(targetVariants, item.variants);
    if (score > bestScore) {
      bestScore = score;
      bestModel = item.model;
    }
  }
  if (bestScore >= 0.45) return bestModel;

  return "";
}

function localizeVehicleText(value: string) {
    if (settings.language === "he") return value;
    const mapped = vehicleTextTranslations[value];
    if (!mapped) return value;
    if (settings.language === "en") return mapped.en ?? value;
    if (settings.language === "ru") return mapped.ru ?? mapped.en ?? value;
    return value;
  }

  const localizedEntries = enrichedEntries.map((entry) => {
    const vehicle = vehicles.find((item) => item.id === entry.vehicle_local_id);
    const tankCapacity = vehicle?.tankCapacity ?? null;
    const tankPercentBeforeRefuel =
      tankCapacity && tankCapacity > 0
        ? Math.max(0, Math.min(100, ((tankCapacity - entry.liters) / tankCapacity) * 100))
        : null;

    return {
      ...entry,
      fuel_type: getFuelTypeLabel(entry.fuel_type),
      tankPercentBeforeRefuel,
    };
  });

  const benchmarkComparisonData = (() => {
    const benchmark = activeVehicle?.benchmarkLitersPer100Km;
    if (!benchmark || !totals.avgLitersPer100Km) {
      return null;
    }

    if (settings.consumptionView === "distance_per_volume") {
      const benchmarkDistancePerVolume = convertDistancePerVolume(
        100 / benchmark,
        settings.distanceUnit,
        settings.volumeUnit
      );
      if (!benchmarkDistancePerVolume || !averageDistancePerVolume) {
        return null;
      }
      const diff = averageDistancePerVolume - benchmarkDistancePerVolume;
      const benchmarkLabel = `${formatNumber(
        benchmarkDistancePerVolume,
        settings.language
      )} ${getLocalizedDistanceUnitLabel(
        settings.distanceUnit,
        settings.language
      )}/${getLocalizedVolumeUnitLabel(settings.volumeUnit, settings.language)}`;
      return { diff, benchmarkLabel, higherIsBetter: true };
    }

    const benchmarkVolumePerHundred = convertVolumePerHundredDistance(
      benchmark,
      settings.distanceUnit,
      settings.volumeUnit
    );
    if (!benchmarkVolumePerHundred || !averageVolumePerHundred) {
      return null;
    }
    const diff = averageVolumePerHundred - benchmarkVolumePerHundred;
    const benchmarkLabel = `${formatNumber(
      benchmarkVolumePerHundred,
      settings.language
    )} ${getLocalizedVolumeUnitLabel(
      settings.volumeUnit,
      settings.language
    )}/100 ${getLocalizedDistanceUnitLabel(
      settings.distanceUnit,
      settings.language
    )}`;
    return { diff, benchmarkLabel, higherIsBetter: false };
  })();

  const benchmarkComparisonText = (() => {
    if (!benchmarkComparisonData) {
      return t.benchmarkMissing;
    }

    const { diff, benchmarkLabel, higherIsBetter } = benchmarkComparisonData;
    if (Math.abs(diff) < 0.15) {
      return `${t.equalToAverage} (${benchmarkLabel})`;
    }
    if ((higherIsBetter && diff > 0) || (!higherIsBetter && diff < 0)) {
      return `${t.betterThanAverage} (${benchmarkLabel})`;
    }
    return `${t.worseThanAverage} (${benchmarkLabel})`;
  })();

  const benchmarkStatusTone: "good" | "warning" | "bad" | "default" = (() => {
    if (!benchmarkComparisonData) return "default";
    const { diff, higherIsBetter } = benchmarkComparisonData;
    if (Math.abs(diff) < 0.15) return "warning";
    if ((higherIsBetter && diff > 0) || (!higherIsBetter && diff < 0)) {
      return "good";
    }
    return "bad";
  })();

  function formatTrendDate(dateValue: string) {
    const locale =
      settings.language === "en"
        ? "en-US"
        : settings.language === "ru"
          ? "ru-RU"
          : "he-IL";
    const parsed = new Date(`${dateValue}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) return dateValue;
    return parsed.toLocaleDateString(locale);
  }

  const consumptionTrendEntries = enrichedEntries
    .filter(
      (entry) =>
        entry.daysFromPrev !== null &&
        entry.daysFromPrev > 0 &&
        entry.distanceFromPrev !== null &&
        entry.distanceFromPrev > 0 &&
        entry.liters > 0
    )
    .slice(-10);
  const consumptionTrendValues = consumptionTrendEntries.map(
    (entry) => {
      const value = convertVolume(entry.liters, settings.volumeUnit);
      if (value === null) return 0;
      return Number(value.toFixed(2));
    }
  );
  const consumptionTrendStartLabel =
    consumptionTrendEntries.length > 0
      ? formatTrendDate(consumptionTrendEntries[0].date)
      : undefined;
  const consumptionTrendEndLabel =
    consumptionTrendEntries.length > 0
      ? formatTrendDate(
          consumptionTrendEntries[consumptionTrendEntries.length - 1].date
        )
      : undefined;

  const priceTrendEntries = enrichedEntries
    .filter((entry) => entry.liters > 0 && entry.total_price > 0)
    .slice(-10);
  const priceTrendValues = priceTrendEntries.map((entry) => {
    const selectedVolume = convertVolume(entry.liters, settings.volumeUnit);
    const selectedCurrency = convertCurrency(entry.total_price, settings.currency);
    if (!selectedVolume || !selectedCurrency) return 0;
    return Number((selectedCurrency / selectedVolume).toFixed(3));
  });
  const priceTrendStartLabel =
    priceTrendEntries.length > 0
      ? formatTrendDate(priceTrendEntries[0].date)
      : undefined;
  const priceTrendEndLabel =
    priceTrendEntries.length > 0
      ? formatTrendDate(priceTrendEntries[priceTrendEntries.length - 1].date)
      : undefined;

  const averageFillRatioText = (() => {
    const tankCapacity = activeVehicle?.tankCapacity;
    if (!tankCapacity || tankCapacity <= 0 || enrichedEntries.length === 0) {
      return t.tankCapacityMissing;
    }

    const comparableEntries = enrichedEntries.filter(
      (entry) => entry.liters > 0
    );

    if (comparableEntries.length === 0) {
      return t.tankCapacityMissing;
    }

    const averageFill =
      comparableEntries.reduce((sum, entry) => sum + entry.liters, 0) /
      comparableEntries.length;

    const fillRatio = (averageFill / tankCapacity) * 100;
    return `${formatNumber(fillRatio, settings.language, 0)}%`;
  })();

  const refuelTimingInsightText = (() => {
    const tankCapacity = activeVehicle?.tankCapacity;
    if (!tankCapacity || tankCapacity <= 0 || enrichedEntries.length === 0) {
      return t.tankCapacityMissing;
    }

    const averageFill =
      enrichedEntries.reduce((sum, entry) => sum + entry.liters, 0) /
      enrichedEntries.length;
    const fillRatio = averageFill / tankCapacity;

    if (fillRatio >= 0.7) return t.refuelVeryLate;
    if (fillRatio >= 0.45) return t.refuelBalanced;
    return t.refuelEarly;
  })();

  function handleExportExcel() {
    exportEntriesToExcel({
      entries: localizedEntries,
      vehicles,
      language: settings.language,
      distanceUnit: settings.distanceUnit,
      volumeUnit: settings.volumeUnit,
      currency: settings.currency,
      labels: t as Record<string, string>,
    });
    alert(t.exportReady);
  }

  if (!authReady) {
    return (
      <div style={{ ...styles.page, ...pageThemeStyle }} dir={dir}>
        <div style={styles.container}>
          <div style={styles.topBar}>
            <div style={styles.brandRow}>
              <img src="/app-logo.png" alt="Fuel Tracker logo" style={styles.brandLogo} />
              <p style={styles.subtitle}>{t.loading}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!session) {
    if (showAuth) {
      return (
        <AuthScreen
          authMode={authMode}
          dir={dir}
          email={email}
          password={password}
          labels={t}
          onAuthModeChange={setAuthMode}
          onEmailChange={setEmail}
          onPasswordChange={setPassword}
          onSubmit={handleAuth}
          onGoogleLogin={handleGoogleLogin}
          onBackToDemo={() => setShowAuth(false)}
          themeStyle={pageThemeStyle}
        />
      );
    }

    return (
      <div style={{ ...styles.page, ...pageThemeStyle }} dir={dir}>
        <div style={styles.container}>
          <div style={styles.demoBanner}>{t.demoModeBanner}</div>
          <div style={styles.topBar}>
            <div style={styles.brandRow}>
              <img src="/app-logo.png" alt="Fuel Tracker logo" style={styles.brandLogo} />
              <div>
                <h1 style={styles.title}>{t.demoWelcomeTitle}</h1>
                <p style={styles.subtitle}>{t.demoWelcomeText}</p>
              </div>
            </div>
            <button style={styles.buttonPrimary} onClick={() => setShowAuth(true)}>
              {t.startWithAccount}
            </button>
          </div>

          <section style={styles.heroCard}>
            <div style={styles.heroEyebrow}>{t.dashboardEyebrow}</div>
            <h2 style={styles.heroTitle}>
              {`${localizeVehicleText(demoVehicle.manufacturer)} ${localizeVehicleText(
                demoVehicle.model
              )}`}
            </h2>
            <p style={styles.heroText}>{t.dashboardText}</p>
            <div style={styles.heroMetrics}>
              <div style={styles.heroMetric}>
                <div style={styles.heroMetricLabel}>{t.lastOdometer}</div>
                <div style={styles.heroMetricValue}>
                  {demoLastOdometer
                    ? `${formatDistance(
                        demoLastOdometer,
                        settings.language,
                        settings.distanceUnit
                      )} ${getLocalizedDistanceUnitLabel(
                        settings.distanceUnit,
                        settings.language
                      )}`
                    : "-"}
                </div>
              </div>
              <div style={styles.heroMetric}>
                <div style={styles.heroMetricLabel}>{t.totalFillUps}</div>
                <div style={styles.heroMetricValue}>
                  {formatNumber(demoEnrichedEntries.length, settings.language, 0)}
                </div>
              </div>
              <div style={styles.heroMetric}>
                <div style={styles.heroMetricLabel}>{primaryConsumptionLabel}</div>
                <div style={styles.heroMetricValue}>{demoPrimaryConsumptionValue}</div>
              </div>
            </div>
          </section>

          <div style={styles.statsGrid}>
            <StatCard
              title={t.totalVolume}
              value={`${formatVolume(
                demoTotals.totalLiters,
                settings.language,
                settings.volumeUnit
              )} ${getLocalizedVolumeUnitLabel(
                settings.volumeUnit,
                settings.language
              )}`}
            />
            <StatCard
              title={t.totalCost}
              value={formatCurrency(
                demoTotals.totalCost,
                settings.language,
                settings.currency
              )}
            />
            <StatCard
              title={t.totalDistance}
              value={`${formatDistance(
                demoTotals.totalDistance,
                settings.language,
                settings.distanceUnit
              )} ${getLocalizedDistanceUnitLabel(
                settings.distanceUnit,
                settings.language
              )}`}
            />
            <StatCard title={primaryConsumptionLabel} value={demoPrimaryConsumptionValue} emphasis />
            <StatCard
              title={t.avgPricePerVolume}
              value={formatCurrency(
                demoTotals.avgPricePerLiter,
                settings.language,
                settings.currency
              )}
            />
            <StatCard
              title={t.avgCostPerDistance}
              value={formatCurrency(
                demoAverageCostPerDistance,
                settings.language,
                settings.currency
              )}
            />
            <StatCard
              title={t.avgDistancePerDay}
              value={`${formatDistance(
                demoTotals.avgKmPerDay,
                settings.language,
                settings.distanceUnit
              )} ${getLocalizedDistanceUnitLabel(
                settings.distanceUnit,
                settings.language
              )}`}
            />
            <StatCard
              title={t.avgCostPerDay}
              value={formatCurrency(
                demoTotals.avgCostPerDay,
                settings.language,
                settings.currency
              )}
            />
            <StatCard
              title={t.monthlyFuelCostForecast}
              value={demoMonthlyFuelCostText}
              secondaryValue={demoMonthlyFuelCostSentence}
            />
            <StatCard
              title={t.benchmarkComparison}
              value={demoBenchmarkComparisonText}
              tone={demoBenchmarkTone}
              compactValue
            />
          </div>

          <div style={styles.chartGrid}>
            <TrendMiniChart
              title={t.consumptionTrendTitle}
              subtitle={t.consumptionTrendSubtitle}
              values={demoConsumptionTrendValues}
              stroke="#0ea5e9"
            />
            <TrendMiniChart
              title={t.priceTrendTitle}
              subtitle={t.priceTrendSubtitle}
              values={demoPriceTrendValues}
              stroke="#16a34a"
            />
          </div>

          <EntriesTable
            entries={demoLocalizedEntries}
            labels={t}
            language={settings.language}
            distanceUnit={settings.distanceUnit}
            volumeUnit={settings.volumeUnit}
            currency={settings.currency}
            consumptionView={settings.consumptionView}
            loadingEntries={false}
            onDelete={() => undefined}
            onEdit={() => undefined}
          />
        </div>

        <button
          style={{
            ...styles.feedbackFab,
            ...(activePanel === "feedback" ? styles.feedbackFabActive : {}),
            ...(dir === "rtl" ? { left: "12px", right: "auto" } : {}),
          }}
          onClick={() => handleOpenPanel("feedback")}
        >
          {t.feedbackButton}
        </button>

        {activePanel === "feedback" ? (
          <ActionModal
            title={t.feedbackTitle}
            closeLabel={t.close}
            onClose={() => setActivePanel(null)}
          >
            <textarea
              style={styles.feedbackTextArea}
              value={feedbackText}
              onChange={(event) => setFeedbackText(event.target.value)}
              placeholder={t.feedbackPlaceholder}
            />
            <button
              style={styles.buttonPrimary}
              onClick={handleSendFeedback}
              disabled={submittingFeedback}
            >
              {submittingFeedback ? t.feedbackSending : t.sendFeedback}
            </button>
          </ActionModal>
        ) : null}
      </div>
    );
  }

  return (
    <div style={{ ...styles.page, ...pageThemeStyle }} dir={dir}>
      <div style={styles.container}>
        <div style={styles.topBar}>
          <div style={styles.brandRow}>
            <img src="/app-logo.png" alt="Fuel Tracker logo" style={styles.brandLogo} />
            <div>
              <h1 style={styles.title}>{t.appTitle}</h1>
              <p style={styles.subtitle}>
                {activeVehicle
                  ? `${localizeVehicleText(activeVehicle.manufacturer)} ${localizeVehicleText(activeVehicle.model)} ${activeVehicle.year}`
                  : t.allVehicles}
              </p>
            </div>
          </div>
          <details style={styles.accountMenu}>
            <summary style={styles.accountMenuTrigger}>☰</summary>
            <div style={styles.accountMenuPanel}>
              <div style={styles.accountMenuEmail}>{session.user.email}</div>
              <button style={styles.buttonDanger} onClick={handleLogout}>
                {t.logout}
              </button>
            </div>
          </details>
        </div>

        <section style={styles.heroCard}>
          <div style={styles.heroEyebrow}>{t.dashboardEyebrow}</div>
          <h2 style={styles.heroTitle}>
            {activeVehicle
              ? `${localizeVehicleText(activeVehicle.manufacturer)} ${localizeVehicleText(activeVehicle.model)}`
              : t.dashboardFallback}
          </h2>
          <p style={styles.heroText}>{t.dashboardText}</p>

          <div style={styles.heroMetrics}>
            <div style={styles.heroMetric}>
              <div style={styles.heroMetricLabel}>{t.lastOdometer}</div>
              <div style={styles.heroMetricValue}>
                {lastOdometer
                  ? `${formatDistance(
                      lastOdometer,
                      settings.language,
                      settings.distanceUnit
                    )} ${getLocalizedDistanceUnitLabel(
                      settings.distanceUnit,
                      settings.language
                    )}`
                  : "-"}
              </div>
            </div>

            <div style={styles.heroMetric}>
              <div style={styles.heroMetricLabel}>{t.totalFillUps}</div>
              <div style={styles.heroMetricValue}>
                {formatNumber(enrichedEntries.length, settings.language, 0)}
              </div>
            </div>

            <div style={styles.heroMetric}>
              <div style={styles.heroMetricLabel}>{primaryConsumptionLabel}</div>
              <div style={styles.heroMetricValue}>{primaryConsumptionValue}</div>
            </div>
          </div>
        </section>

        <div style={styles.statsGrid}>
          <StatCard
            title={t.totalVolume}
            value={`${formatVolume(
              totals.totalLiters,
              settings.language,
              settings.volumeUnit
            )} ${getLocalizedVolumeUnitLabel(
              settings.volumeUnit,
              settings.language
            )}`}
          />
          <StatCard
            title={t.totalCost}
            value={formatCurrency(
              totals.totalCost,
              settings.language,
              settings.currency
            )}
          />
          <StatCard
            title={t.totalDistance}
            value={`${formatDistance(
              totals.totalDistance,
              settings.language,
              settings.distanceUnit
            )} ${getLocalizedDistanceUnitLabel(
              settings.distanceUnit,
              settings.language
            )}`}
          />
          <StatCard
            title={primaryConsumptionLabel}
            value={primaryConsumptionValue}
            emphasis
          />
          <StatCard
            title={t.avgPricePerVolume}
            value={formatCurrency(
              totals.avgPricePerLiter,
              settings.language,
              settings.currency
            )}
          />
          <StatCard
            title={t.avgCostPerDistance}
            value={formatCurrency(
              averageCostPerDistance,
              settings.language,
              settings.currency
            )}
          />
          <StatCard
            title={t.avgDistancePerDay}
            value={`${formatDistance(
              totals.avgKmPerDay,
              settings.language,
              settings.distanceUnit
            )} ${getLocalizedDistanceUnitLabel(
              settings.distanceUnit,
              settings.language
            )}`}
          />
          <StatCard
            title={t.avgCostPerDay}
            value={formatCurrency(
              totals.avgCostPerDay,
              settings.language,
              settings.currency
            )}
          />
          <StatCard
            title={t.monthlyFuelCostForecast}
            value={monthlyFuelCostText}
            secondaryValue={monthlyFuelCostSentence}
          />
          <StatCard
            title={t.benchmarkComparison}
            value={benchmarkComparisonText}
            tone={benchmarkStatusTone}
            compactValue
          />
          <StatCard
            title={t.nextRefuelForecast}
            value={nextRefuelForecast.primary}
            secondaryValue={nextRefuelForecast.secondary}
          />
        </div>

        <div style={styles.chartGrid}>
          <TrendMiniChart
            title={t.consumptionTrendTitle}
            subtitle={t.consumptionTrendSubtitle}
            values={consumptionTrendValues}
            stroke="#0ea5e9"
            startLabel={consumptionTrendStartLabel}
            endLabel={consumptionTrendEndLabel}
          />
          <TrendMiniChart
            title={t.priceTrendTitle}
            subtitle={t.priceTrendSubtitle}
            values={priceTrendValues}
            stroke="#16a34a"
            startLabel={priceTrendStartLabel}
            endLabel={priceTrendEndLabel}
          />
        </div>

        <EntriesTable
          entries={localizedEntries}
          labels={t}
          language={settings.language}
          distanceUnit={settings.distanceUnit}
          volumeUnit={settings.volumeUnit}
          currency={settings.currency}
          consumptionView={settings.consumptionView}
          loadingEntries={loadingEntries}
          onDelete={deleteEntry}
          onEdit={handleEditEntry}
        />
      </div>

      <BottomActionBar
        activePanel={activePanel}
        labels={t}
        onSelect={handleOpenPanel}
      />

      <button
        style={{
          ...styles.feedbackFab,
          ...(activePanel === "feedback" ? styles.feedbackFabActive : {}),
          ...(dir === "rtl" ? { left: "12px", right: "auto" } : {}),
        }}
        onClick={() => handleOpenPanel("feedback")}
      >
        {t.feedbackButton}
      </button>

      {activePanel === "vehicle" ? (
        <ActionModal
          title={t.vehicleSettings}
          closeLabel={t.close}
          onClose={() => setActivePanel(null)}
        >
          <VehicleProfileCard
            labels={t}
            settings={settings}
            vehicles={vehicles}
            selectedVehicleId={selectedVehicleId}
            loadingProfile={loadingProfile}
            manufacturers={manufacturers}
            availableModels={availableModels}
            availableYears={availableYears}
            vehicleForm={vehicleForm}
            plateLookupLoading={plateLookupLoading}
            embedded
            localizeVehicleText={localizeVehicleText}
            onSelectVehicle={handleSelectVehicle}
            onAddNewVehicle={handleAddNewVehicle}
            onDeleteVehicle={handleDeleteVehicle}
            onVehicleFieldChange={updateVehicleForm}
            onLookupByPlate={handleLookupByPlate}
            onSettingsChange={handleSettingsChange}
            onSave={saveVehicleProfile}
          />
        </ActionModal>
      ) : null}

      {activePanel === "add-entry" ? (
        <ActionModal
          title={editingEntryId ? t.editFuelEntryTitle : t.addFuel}
          closeLabel={t.close}
          onClose={() => {
            setActivePanel(null);
            resetFuelForm();
          }}
        >
          <FuelEntryFormCard
            form={form}
            vehicles={vehicles}
            labels={t}
            unitLabel={getLocalizedVolumeUnitLabel(
              settings.volumeUnit,
              settings.language
            )}
            isEditing={Boolean(editingEntryId)}
            embedded
            locationLoading={locationLoading}
            voiceListening={voiceListening}
            voiceSupported={voiceInputSupported}
            onFieldChange={updateForm}
            onUseCurrentLocation={handleUseCurrentLocation}
            onStartVoiceInput={handleStartVoiceInput}
            onSave={saveFuelEntry}
          />
        </ActionModal>
      ) : null}

      {activePanel === "more" ? (
        <ActionModal
          title={t.settingsTitle}
          closeLabel={t.close}
          onClose={() => setActivePanel(null)}
        >
          <MoreDataCard
            monthlyExpenseRows={monthlyExpenseRows}
            labels={t}
            settings={settings}
            totals={totals}
            entries={localizedEntries}
            lastOdometer={lastOdometer}
            totalEntries={enrichedEntries.length}
            comparisonText={benchmarkComparisonText}
            tankInsightText={refuelTimingInsightText}
            averageFillText={averageFillRatioText}
            annualFuelForecastText={annualFuelCostText}
            annualFuelForecastSentence={annualFuelCostSentence}
            savedVehicleDisplayName={
              profile?.manufacturer && profile?.model && profile?.year
                ? `${localizeVehicleText(profile.manufacturer)} ${localizeVehicleText(profile.model)} ${profile.year}`
                : undefined
            }
            embedded
            onExport={handleExportExcel}
          />
        </ActionModal>
      ) : null}

      {activePanel === "feedback" ? (
        <ActionModal
          title={t.feedbackTitle}
          closeLabel={t.close}
          onClose={() => setActivePanel(null)}
        >
          <textarea
            style={styles.feedbackTextArea}
            value={feedbackText}
            onChange={(event) => setFeedbackText(event.target.value)}
            placeholder={t.feedbackPlaceholder}
          />
          <button
            style={styles.buttonPrimary}
            onClick={handleSendFeedback}
            disabled={submittingFeedback}
          >
            {submittingFeedback ? t.feedbackSending : t.sendFeedback}
          </button>
        </ActionModal>
      ) : null}
    </div>
  );
}
