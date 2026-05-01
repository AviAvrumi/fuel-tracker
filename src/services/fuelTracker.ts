import { supabase } from "../lib/supabase";
import type {
  CloudAppState,
  FuelEntry,
  FuelFormState,
  Language,
  Profile,
  VehicleFormState,
} from "../types/fuel";

const APP_STATE_FUEL_TYPE = "__app_state__";
const APP_STATE_STATION = "__app_state__";

export type VehicleRegistryRow = {
  mispar_rechev: string;
  tozeret_nm: string | null;
  degem_nm: string | null;
  kinuy_mishari: string | null;
  shnat_yitzur: string | null;
  sug_delek_nm: string | null;
};

export async function signInWithGoogle() {
  return supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: window.location.origin,
    },
  });
}

export async function signInWithPassword(email: string, password: string) {
  return supabase.auth.signInWithPassword({
    email,
    password,
  });
}

export async function signUpWithPassword(email: string, password: string) {
  return supabase.auth.signUp({
    email,
    password,
  });
}

export async function signOut() {
  return supabase.auth.signOut();
}

export async function getProfile(userId: string) {
  return supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
}

export async function updateProfileEmail(userId: string, email: string) {
  return supabase.from("profiles").update({ email }).eq("id", userId);
}

export async function upsertProfile(
  userId: string,
  email: string | null,
  vehicleForm: VehicleFormState
) {
  return supabase.from("profiles").upsert({
    id: userId,
    email,
    manufacturer: vehicleForm.manufacturer,
    model: vehicleForm.model,
    year: Number(vehicleForm.year),
  });
}

export async function getFuelEntries(userId: string) {
  return supabase
    .from("fuel_entries")
    .select("*")
    .eq("user_id", userId)
    .neq("fuel_type", APP_STATE_FUEL_TYPE)
    .order("date", { ascending: true })
    .order("odometer", { ascending: true });
}

export async function getCloudAppState(userId: string) {
  const { data, error } = await supabase
    .from("fuel_entries")
    .select("id,notes")
    .eq("user_id", userId)
    .eq("fuel_type", APP_STATE_FUEL_TYPE)
    .eq("station", APP_STATE_STATION)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return { data: null, error };
  }

  if (!data?.notes) {
    return { data: null, error: null };
  }

  try {
    return {
      data: JSON.parse(data.notes) as CloudAppState,
      error: null,
    };
  } catch {
    return { data: null, error: null };
  }
}

export async function upsertCloudAppState(userId: string, state: CloudAppState) {
  const payload = JSON.stringify(state);

  const existing = await supabase
    .from("fuel_entries")
    .select("id")
    .eq("user_id", userId)
    .eq("fuel_type", APP_STATE_FUEL_TYPE)
    .eq("station", APP_STATE_STATION)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing.error) {
    return { error: existing.error };
  }

  if (existing.data?.id) {
    return supabase
      .from("fuel_entries")
      .update({
        notes: payload,
        date: new Date().toISOString().slice(0, 10),
      })
      .eq("id", existing.data.id);
  }

  return supabase.from("fuel_entries").insert({
    user_id: userId,
    date: new Date().toISOString().slice(0, 10),
    liters: 0,
    total_price: 0,
    odometer: 0,
    fuel_type: APP_STATE_FUEL_TYPE,
    station: APP_STATE_STATION,
    notes: payload,
  });
}

export async function createFuelEntry(userId: string, form: FuelFormState) {
  return supabase
    .from("fuel_entries")
    .insert({
      user_id: userId,
      date: form.date,
      liters: Number(form.liters),
      total_price: Number(form.totalPrice),
      odometer: Number(form.odometer),
      fuel_type: form.fuelType,
      station: form.station,
      notes: form.notes,
    })
    .select("*")
    .single();
}

export async function updateFuelEntry(entryId: string, form: FuelFormState) {
  return supabase
    .from("fuel_entries")
    .update({
      date: form.date,
      liters: Number(form.liters),
      total_price: Number(form.totalPrice),
      odometer: Number(form.odometer),
      fuel_type: form.fuelType,
      station: form.station,
      notes: form.notes,
    })
    .eq("id", entryId)
    .select("*")
    .single();
}

export async function removeFuelEntry(entryId: string) {
  return supabase.from("fuel_entries").delete().eq("id", entryId);
}

export async function createFeedbackMessage(payload: {
  message: string;
  language: Language;
  userId?: string | null;
  email?: string | null;
}) {
  return supabase.from("feedback_messages").insert({
    user_id: payload.userId ?? null,
    user_email: payload.email ?? null,
    message: payload.message,
    language: payload.language,
  });
}

export async function findVehicleByLicensePlate(plate: string) {
  const normalized = plate.replace(/\D/g, "");
  if (!normalized) {
    return { data: null as VehicleRegistryRow | null, error: null };
  }

  const candidates = Array.from(
    new Set([
      normalized,
      normalized.padStart(7, "0"),
      normalized.padStart(8, "0"),
    ])
  );

  const { data, error } = await supabase
    .from("vehicle_registry_il")
    .select(
      "mispar_rechev,tozeret_nm,degem_nm,kinuy_mishari,shnat_yitzur,sug_delek_nm"
    )
    .in("mispar_rechev", candidates)
    .limit(1)
    .maybeSingle();

  return {
    data: (data as VehicleRegistryRow | null) ?? null,
    error,
  };
}

export function toProfile(data: unknown): Profile {
  return data as Profile;
}

export function toEntries(data: unknown): FuelEntry[] {
  return (data ?? []) as FuelEntry[];
}
