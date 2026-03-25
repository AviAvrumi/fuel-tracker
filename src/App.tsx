import { useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./lib/supabase";

// ─── Types ────────────────────────────────────────────────────────────────────

type AuthMode = "login" | "signup";

type Profile = {
  id: string;
  email: string | null;
  manufacturer: string | null;
  model: string | null;
  year: number | null;
  created_at?: string;
};

type FuelEntry = {
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
};

type EnrichedFuelEntry = FuelEntry & {
  pricePerLiter: number;
  daysFromPrev: number | null;
  distanceFromPrev: number | null;
  kmPerLiter: number | null;
  litersPer100Km: number | null;
  costPerKm: number | null;
  costPerDay: number | null;
  kmPerDay: number | null;
};

type VehicleFormState = {
  manufacturer: string;
  model: string;
  year: string;
};

type FuelFormState = {
  date: string;
  liters: string;
  totalPrice: string;
  odometer: string;
  fuelType: string;
  station: string;
  notes: string;
};

type Totals = {
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayValue(): string {
  return new Date().toISOString().split("T")[0];
}

function formatNumber(value: number | null | undefined, digits = 2): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  return new Intl.NumberFormat("he-IL", {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  }).format(value);
}

function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  return new Intl.NumberFormat("he-IL", {
    style: "currency",
    currency: "ILS",
    maximumFractionDigits: 2,
  }).format(value);
}

function enrichEntries(sorted: FuelEntry[]): EnrichedFuelEntry[] {
  return sorted.map((entry, index) => {
    const prev = sorted[index - 1];
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
      distanceFromPrev !== null && distanceFromPrev > 0 && entry.liters > 0
        ? distanceFromPrev / entry.liters
        : null;

    const litersPer100Km =
      distanceFromPrev !== null && distanceFromPrev > 0 && entry.liters > 0
        ? (entry.liters / distanceFromPrev) * 100
        : null;

    const costPerKm =
      distanceFromPrev !== null && distanceFromPrev > 0
        ? entry.total_price / distanceFromPrev
        : null;

    const costPerDay =
      daysFromPrev !== null && daysFromPrev > 0
        ? entry.total_price / daysFromPrev
        : null;

    const kmPerDay =
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

function calcTotals(enriched: EnrichedFuelEntry[]): Totals {
  const totalLiters = enriched.reduce((sum, e) => sum + e.liters, 0);
  const totalCost = enriched.reduce((sum, e) => sum + e.total_price, 0);
  let totalDistance = 0;
  let totalDays = 0;

  for (const e of enriched) {
    if (e.distanceFromPrev !== null && e.distanceFromPrev > 0) {
      totalDistance += e.distanceFromPrev;
    }
    if (e.daysFromPrev !== null && e.daysFromPrev > 0) {
      totalDays += e.daysFromPrev;
    }
  }

  return {
    totalLiters,
    totalCost,
    totalDistance,
    avgPricePerLiter: totalLiters > 0 ? totalCost / totalLiters : null,
    avgKmPerLiter:
      totalLiters > 0 && totalDistance > 0 ? totalDistance / totalLiters : null,
    avgLitersPer100Km:
      totalDistance > 0 && totalLiters > 0
        ? (totalLiters / totalDistance) * 100
        : null,
    avgCostPerKm: totalDistance > 0 ? totalCost / totalDistance : null,
    avgKmPerDay: totalDays > 0 ? totalDistance / totalDays : null,
    avgCostPerDay: totalDays > 0 ? totalCost / totalDays : null,
  };
}

function defaultFuelForm(): FuelFormState {
  return {
    date: todayValue(),
    liters: "",
    totalPrice: "",
    odometer: "",
    fuelType: "בנזין 95",
    station: "",
    notes: "",
  };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ title, value }: { title: string; value: string }) {
  return (
    <div style={styles.statCard}>
      <div style={styles.statTitle}>{title}</div>
      <div style={styles.statValue}>{value}</div>
    </div>
  );
}

function LoadingScreen() {
  return <div style={styles.centered}>טוען...</div>;
}

// ─── Auth Screen ──────────────────────────────────────────────────────────────

type AuthScreenProps = {
  authMode: AuthMode;
  email: string;
  password: string;
  onModeChange: (mode: AuthMode) => void;
  onEmailChange: (v: string) => void;
  onPasswordChange: (v: string) => void;
  onSubmit: () => void;
  onGoogleLogin: () => void;
};

function AuthScreen({
  authMode,
  email,
  password,
  onModeChange,
  onEmailChange,
  onPasswordChange,
  onSubmit,
  onGoogleLogin,
}: AuthScreenProps) {
  return (
    <div style={styles.page} dir="rtl">
      <div style={styles.authCard}>
        <h1 style={styles.title}>מעקב תדלוקים</h1>
        <p style={styles.subtitle}>
          צור משתמש עם אימייל וסיסמה, או התחבר אם כבר נרשמת.
        </p>

        <div style={styles.authTabs}>
          <button
            style={authMode === "login" ? styles.buttonPrimary : styles.button}
            onClick={() => onModeChange("login")}
          >
            התחברות
          </button>
          <button
            style={authMode === "signup" ? styles.buttonPrimary : styles.button}
            onClick={() => onModeChange("signup")}
          >
            הרשמה
          </button>
        </div>

        <div style={styles.formGrid}>
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={styles.label}>אימייל</label>
            <input
              style={styles.input}
              type="email"
              value={email}
              onChange={(e) => onEmailChange(e.target.value)}
            />
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={styles.label}>סיסמה</label>
            <input
              style={styles.input}
              type="password"
              value={password}
              onChange={(e) => onPasswordChange(e.target.value)}
            />
          </div>
        </div>

        <div style={styles.buttonRow}>
          <button style={styles.buttonPrimary} onClick={onSubmit}>
            {authMode === "signup" ? "צור משתמש" : "התחבר"}
          </button>
        </div>

        <div style={styles.divider}>
          <span style={styles.dividerText}>או</span>
        </div>

        <button style={styles.buttonGoogle} onClick={onGoogleLogin}>
          <span style={{ marginLeft: "8px", fontWeight: 900 }}>G</span>
          התחבר עם Google
        </button>
      </div>
    </div>
  );
}

// ─── Vehicle Profile Form ─────────────────────────────────────────────────────

type VehicleProfileFormProps = {
  vehicleForm: VehicleFormState;
  profile: Profile | null;
  loading: boolean;
  onFieldChange: (field: keyof VehicleFormState, value: string) => void;
  onSave: () => void;
};

function VehicleProfileForm({
  vehicleForm,
  profile,
  loading,
  onFieldChange,
  onSave,
}: VehicleProfileFormProps) {
  return (
    <div style={styles.card}>
      <h2 style={styles.sectionTitle}>פרטי הרכב</h2>

      {loading ? (
        <div>טוען פרטי רכב...</div>
      ) : (
        <>
          <div style={styles.formGrid}>
            <div>
              <label style={styles.label}>יצרן</label>
              <input
                style={styles.input}
                type="text"
                value={vehicleForm.manufacturer}
                onChange={(e) => onFieldChange("manufacturer", e.target.value)}
              />
            </div>
            <div>
              <label style={styles.label}>דגם</label>
              <input
                style={styles.input}
                type="text"
                value={vehicleForm.model}
                onChange={(e) => onFieldChange("model", e.target.value)}
              />
            </div>
            <div>
              <label style={styles.label}>שנה</label>
              <input
                style={styles.input}
                type="number"
                value={vehicleForm.year}
                onChange={(e) => onFieldChange("year", e.target.value)}
              />
            </div>
          </div>

          <div style={styles.buttonRow}>
            <button style={styles.buttonPrimary} onClick={onSave}>
              שמור פרטי רכב
            </button>
          </div>

          <div style={styles.vehicleBox}>
            {profile?.manufacturer && profile?.model && profile?.year
              ? `הרכב השמור שלך: ${profile.manufacturer} ${profile.model} ${profile.year}`
              : "עדיין לא שמרת פרטי רכב. צריך לשמור כדי להתחיל להוסיף תדלוקים."}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Fuel Entry Form ──────────────────────────────────────────────────────────

type FuelEntryFormProps = {
  form: FuelFormState;
  onFieldChange: (field: keyof FuelFormState, value: string) => void;
  onSave: () => void;
};

function FuelEntryForm({ form, onFieldChange, onSave }: FuelEntryFormProps) {
  return (
    <div style={styles.card}>
      <h2 style={styles.sectionTitle}>הוספת תדלוק</h2>

      <div style={styles.formGrid}>
        <div>
          <label style={styles.label}>תאריך</label>
          <input
            style={styles.input}
            type="date"
            value={form.date}
            onChange={(e) => onFieldChange("date", e.target.value)}
          />
        </div>
        <div>
          <label style={styles.label}>כמות דלק (ליטרים)</label>
          <input
            style={styles.input}
            type="number"
            step="0.01"
            value={form.liters}
            onChange={(e) => onFieldChange("liters", e.target.value)}
          />
        </div>
        <div>
          <label style={styles.label}>מחיר כולל</label>
          <input
            style={styles.input}
            type="number"
            step="0.01"
            value={form.totalPrice}
            onChange={(e) => onFieldChange("totalPrice", e.target.value)}
          />
        </div>
        <div>
          <label style={styles.label}>קילומטראז׳</label>
          <input
            style={styles.input}
            type="number"
            step="1"
            value={form.odometer}
            onChange={(e) => onFieldChange("odometer", e.target.value)}
          />
        </div>
        <div>
          <label style={styles.label}>סוג דלק</label>
          <select
            style={styles.input}
            value={form.fuelType}
            onChange={(e) => onFieldChange("fuelType", e.target.value)}
          >
            <option>בנזין 95</option>
            <option>בנזין 98</option>
            <option>סולר</option>
            <option>אחר</option>
          </select>
        </div>
        <div>
          <label style={styles.label}>תחנת דלק</label>
          <input
            style={styles.input}
            type="text"
            value={form.station}
            onChange={(e) => onFieldChange("station", e.target.value)}
          />
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          <label style={styles.label}>הערות</label>
          <input
            style={styles.input}
            type="text"
            value={form.notes}
            onChange={(e) => onFieldChange("notes", e.target.value)}
          />
        </div>
      </div>

      <div style={styles.buttonRow}>
        <button style={styles.buttonPrimary} onClick={onSave}>
          שמור תדלוק
        </button>
      </div>
    </div>
  );
}

// ─── Entries Table ────────────────────────────────────────────────────────────

type EntriesTableProps = {
  enriched: EnrichedFuelEntry[];
  loading: boolean;
  onDelete: (id: string) => void;
};

const TABLE_HEADERS = [
  "תאריך",
  "ליטרים",
  "מחיר כולל",
  "מחיר לליטר",
  "קילומטראז׳",
  "סוג דלק",
  "תחנה",
  "מרחק קודם",
  "ימים",
  'ק"מ לליטר',
  "ליטר ל-100",
  'עלות לק"מ',
  'ק"מ ליום',
  "עלות ליום",
  "מחיקה",
];

function EntriesTable({ enriched, loading, onDelete }: EntriesTableProps) {
  return (
    <div style={styles.card}>
      <h2 style={styles.sectionTitle}>פירוט כל התדלוקים</h2>

      {loading ? (
        <div>טוען נתונים...</div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={styles.table}>
            <thead>
              <tr>
                {TABLE_HEADERS.map((h) => (
                  <th key={h} style={styles.th}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {enriched.length === 0 ? (
                <tr>
                  <td style={styles.td} colSpan={TABLE_HEADERS.length}>
                    עדיין אין נתונים
                  </td>
                </tr>
              ) : (
                enriched.map((entry) => (
                  <tr key={entry.id}>
                    <td style={styles.td}>{entry.date}</td>
                    <td style={styles.td}>{formatNumber(entry.liters)}</td>
                    <td style={styles.td}>{formatCurrency(entry.total_price)}</td>
                    <td style={styles.td}>{formatCurrency(entry.pricePerLiter)}</td>
                    <td style={styles.td}>{formatNumber(entry.odometer, 0)}</td>
                    <td style={styles.td}>{entry.fuel_type || "-"}</td>
                    <td style={styles.td}>{entry.station || "-"}</td>
                    <td style={styles.td}>
                      {formatNumber(entry.distanceFromPrev, 0)}
                    </td>
                    <td style={styles.td}>
                      {formatNumber(entry.daysFromPrev, 0)}
                    </td>
                    <td style={styles.td}>{formatNumber(entry.kmPerLiter)}</td>
                    <td style={styles.td}>
                      {formatNumber(entry.litersPer100Km)}
                    </td>
                    <td style={styles.td}>{formatCurrency(entry.costPerKm)}</td>
                    <td style={styles.td}>{formatNumber(entry.kmPerDay)}</td>
                    <td style={styles.td}>{formatCurrency(entry.costPerDay)}</td>
                    <td style={styles.td}>
                      <button
                        style={styles.deleteSmall}
                        onClick={() => onDelete(entry.id)}
                      >
                        מחק
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  const [entries, setEntries] = useState<FuelEntry[]>([]);
  const [loadingEntries, setLoadingEntries] = useState(false);

  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [vehicleForm, setVehicleForm] = useState<VehicleFormState>({
    manufacturer: "",
    model: "",
    year: "",
  });

  const [fuelForm, setFuelForm] = useState<FuelFormState>(defaultFuelForm());

  // ── Auth listener ──

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
      setLoadingAuth(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_, newSession) => {
      setSession(newSession);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session?.user?.id) {
      loadProfile(session.user.id, session.user.email ?? null);
      loadEntries(session.user.id);
    } else {
      setProfile(null);
      setEntries([]);
    }
  }, [session]);

  // ── Data loaders ──

  async function loadProfile(userId: string, userEmail: string | null) {
    setLoadingProfile(true);

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    setLoadingProfile(false);

    if (error) {
      alert("שגיאה בטעינת פרופיל הרכב");
      return;
    }

    if (!data) {
      setProfile(null);
      setVehicleForm({ manufacturer: "", model: "", year: "" });
      return;
    }

    const loaded = data as Profile;
    setProfile(loaded);
    setVehicleForm({
      manufacturer: loaded.manufacturer ?? "",
      model: loaded.model ?? "",
      year: loaded.year ? String(loaded.year) : "",
    });

    if (!loaded.email && userEmail) {
      await supabase
        .from("profiles")
        .update({ email: userEmail })
        .eq("id", userId);
    }
  }

  async function loadEntries(userId: string) {
    setLoadingEntries(true);

    const { data, error } = await supabase
      .from("fuel_entries")
      .select("*")
      .eq("user_id", userId)
      .order("date", { ascending: true })
      .order("odometer", { ascending: true });

    setLoadingEntries(false);

    if (error) {
      alert("שגיאה בטעינת הנתונים");
      return;
    }

    setEntries((data ?? []) as FuelEntry[]);
  }

  // ── Auth actions ──

  async function handleAuth() {
    if (!email || !password) {
      alert("מלא אימייל וסיסמה");
      return;
    }

    if (authMode === "signup") {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) {
        alert(error.message);
        return;
      }
      alert("המשתמש נוצר. אם נשלח מייל אימות, צריך לאשר אותו.");
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      alert(error.message);
    }
  }

  async function handleGoogleLogin() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    if (error) {
      alert(error.message);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
  }

  // ── Vehicle profile actions ──

  function updateVehicleForm(field: keyof VehicleFormState, value: string) {
    setVehicleForm((prev) => ({ ...prev, [field]: value }));
  }

  async function saveVehicleProfile() {
    if (!session?.user?.id) return;

    const yearNumber = Number(vehicleForm.year);

    if (!vehicleForm.manufacturer || !vehicleForm.model || !vehicleForm.year) {
      alert("צריך למלא יצרן, דגם ושנה");
      return;
    }

    if (!yearNumber || yearNumber < 1950 || yearNumber > 2100) {
      alert("שנת הרכב לא תקינה");
      return;
    }

    const payload = {
      id: session.user.id,
      email: session.user.email ?? null,
      manufacturer: vehicleForm.manufacturer,
      model: vehicleForm.model,
      year: yearNumber,
    };

    const { error } = await supabase.from("profiles").upsert(payload);

    if (error) {
      alert(error.message);
      return;
    }

    await loadProfile(session.user.id, session.user.email ?? null);
    alert("פרטי הרכב נשמרו");
  }

  // ── Fuel entry actions ──

  function updateFuelForm(field: keyof FuelFormState, value: string) {
    setFuelForm((prev) => ({ ...prev, [field]: value }));
  }

  async function addEntry() {
    if (!session?.user?.id) return;

    if (!profile?.manufacturer || !profile?.model || !profile?.year) {
      alert("צריך קודם לשמור את פרטי הרכב");
      return;
    }

    const liters = Number(fuelForm.liters);
    const totalPrice = Number(fuelForm.totalPrice);
    const odometer = Number(fuelForm.odometer);

    if (!fuelForm.date || !liters || !totalPrice || !odometer) {
      alert("צריך למלא תאריך, ליטרים, מחיר וקילומטראז׳");
      return;
    }

    const lastEntry = sortedEntries[sortedEntries.length - 1];
    if (lastEntry && odometer <= lastEntry.odometer) {
      alert("הקילומטראז׳ חייב להיות גדול מהתדלוק הקודם");
      return;
    }

    const { error } = await supabase.from("fuel_entries").insert({
      user_id: session.user.id,
      date: fuelForm.date,
      liters,
      total_price: totalPrice,
      odometer,
      fuel_type: fuelForm.fuelType,
      station: fuelForm.station,
      notes: fuelForm.notes,
    });

    if (error) {
      alert(error.message);
      return;
    }

    setFuelForm(defaultFuelForm());
    await loadEntries(session.user.id);
  }

  async function deleteEntry(id: string) {
    const { error } = await supabase
      .from("fuel_entries")
      .delete()
      .eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    if (session?.user?.id) {
      await loadEntries(session.user.id);
    }
  }

  // ── Derived data ──

  const sortedEntries = useMemo(
    () =>
      [...entries].sort((a, b) => {
        const dateDiff =
          new Date(a.date).getTime() - new Date(b.date).getTime();
        if (dateDiff !== 0) return dateDiff;
        return a.odometer - b.odometer;
      }),
    [entries]
  );

  const enrichedEntries = useMemo(
    () => enrichEntries(sortedEntries),
    [sortedEntries]
  );

  const totals = useMemo(() => calcTotals(enrichedEntries), [enrichedEntries]);

  const lastOdometer =
    sortedEntries.length > 0
      ? sortedEntries[sortedEntries.length - 1].odometer
      : null;

  // ── Render ──

  if (loadingAuth) return <LoadingScreen />;

  if (!session) {
    return (
      <AuthScreen
        authMode={authMode}
        email={email}
        password={password}
        onModeChange={setAuthMode}
        onEmailChange={setEmail}
        onPasswordChange={setPassword}
        onSubmit={handleAuth}
        onGoogleLogin={handleGoogleLogin}
      />
    );
  }

  return (
    <div style={styles.page} dir="rtl">
      <div style={styles.container}>
        <div style={styles.topBar}>
          <div>
            <h1 style={styles.title}>מעקב תדלוקים וצריכת דלק</h1>
            <p style={styles.subtitle}>מחובר בתור: {session.user.email}</p>
          </div>
          <button style={styles.buttonDanger} onClick={handleLogout}>
            התנתק
          </button>
        </div>

        <VehicleProfileForm
          vehicleForm={vehicleForm}
          profile={profile}
          loading={loadingProfile}
          onFieldChange={updateVehicleForm}
          onSave={saveVehicleProfile}
        />

        <div style={styles.infoBox}>
          קילומטראז׳ אחרון:{" "}
          {lastOdometer !== null ? formatNumber(lastOdometer, 0) : "-"} ק"מ
        </div>

        {profile?.manufacturer && profile?.model && profile?.year && (
          <FuelEntryForm
            form={fuelForm}
            onFieldChange={updateFuelForm}
            onSave={addEntry}
          />
        )}

        <div style={styles.statsGrid}>
          <StatCard
            title='סה"כ ליטרים'
            value={`${formatNumber(totals.totalLiters)} ל׳`}
          />
          <StatCard
            title='סה"כ עלות'
            value={formatCurrency(totals.totalCost)}
          />
          <StatCard
            title='סה"כ מרחק'
            value={`${formatNumber(totals.totalDistance)} ק"מ`}
          />
          <StatCard
            title='ממוצע ק"מ לליטר'
            value={formatNumber(totals.avgKmPerLiter)}
          />
          <StatCard
            title='ממוצע ליטר ל-100 ק"מ'
            value={formatNumber(totals.avgLitersPer100Km)}
          />
          <StatCard
            title="ממוצע מחיר לליטר"
            value={formatCurrency(totals.avgPricePerLiter)}
          />
          <StatCard
            title='ממוצע עלות לק"מ'
            value={formatCurrency(totals.avgCostPerKm)}
          />
          <StatCard
            title='ממוצע ק"מ ליום'
            value={formatNumber(totals.avgKmPerDay)}
          />
          <StatCard
            title="ממוצע עלות ליום"
            value={formatCurrency(totals.avgCostPerDay)}
          />
        </div>

        <EntriesTable
          enriched={enrichedEntries}
          loading={loadingEntries}
          onDelete={deleteEntry}
        />
      </div>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#f3f4f6",
    padding: "24px",
    fontFamily: "Arial, sans-serif",
    color: "#111827",
  },
  container: {
    maxWidth: "1200px",
    margin: "0 auto",
  },
  authCard: {
    maxWidth: "480px",
    margin: "60px auto",
    background: "#ffffff",
    borderRadius: "16px",
    padding: "24px",
    boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
  },
  centered: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "Arial, sans-serif",
  },
  topBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
    marginBottom: "12px",
  },
  title: {
    fontSize: "32px",
    marginBottom: "8px",
    marginTop: 0,
  },
  subtitle: {
    color: "#4b5563",
    marginBottom: "16px",
    marginTop: 0,
  },
  infoBox: {
    background: "#e5e7eb",
    padding: "12px 16px",
    borderRadius: "12px",
    marginBottom: "20px",
    display: "inline-block",
  },
  vehicleBox: {
    marginTop: "14px",
    background: "#eef2ff",
    padding: "12px 16px",
    borderRadius: "12px",
  },
  card: {
    background: "#ffffff",
    borderRadius: "16px",
    padding: "20px",
    marginBottom: "20px",
    boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
  },
  sectionTitle: {
    marginTop: 0,
    marginBottom: "16px",
    fontSize: "22px",
  },
  authTabs: {
    display: "flex",
    gap: "10px",
    marginBottom: "16px",
  },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "14px",
    marginBottom: "16px",
  },
  label: {
    display: "block",
    marginBottom: "6px",
    fontWeight: 700,
  },
  input: {
    width: "100%",
    padding: "10px",
    borderRadius: "10px",
    border: "1px solid #d1d5db",
    fontSize: "16px",
    boxSizing: "border-box",
  },
  buttonRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: "10px",
  },
  buttonPrimary: {
    background: "#2563eb",
    color: "#ffffff",
    border: "none",
    padding: "10px 16px",
    borderRadius: "10px",
    cursor: "pointer",
    fontSize: "15px",
  },
  button: {
    background: "#ffffff",
    color: "#111827",
    border: "1px solid #d1d5db",
    padding: "10px 16px",
    borderRadius: "10px",
    cursor: "pointer",
    fontSize: "15px",
  },
  buttonDanger: {
    background: "#b91c1c",
    color: "#ffffff",
    border: "none",
    padding: "10px 16px",
    borderRadius: "10px",
    cursor: "pointer",
    fontSize: "15px",
  },
  buttonGoogle: {
    width: "100%",
    background: "#ffffff",
    color: "#111827",
    border: "1px solid #d1d5db",
    padding: "10px 16px",
    borderRadius: "10px",
    cursor: "pointer",
    fontSize: "15px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 700,
    gap: "8px",
  },
  divider: {
    display: "flex",
    alignItems: "center",
    margin: "16px 0",
  },
  dividerText: {
    color: "#9ca3af",
    fontSize: "14px",
    margin: "0 auto",
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "14px",
    marginBottom: "20px",
  },
  statCard: {
    background: "#ffffff",
    borderRadius: "16px",
    padding: "18px",
    boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
  },
  statTitle: {
    color: "#6b7280",
    marginBottom: "8px",
  },
  statValue: {
    fontSize: "24px",
    fontWeight: 700,
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: "1200px",
  },
  th: {
    textAlign: "right",
    padding: "10px",
    borderBottom: "2px solid #d1d5db",
    background: "#f9fafb",
    fontSize: "14px",
  },
  td: {
    textAlign: "right",
    padding: "10px",
    borderBottom: "1px solid #e5e7eb",
    fontSize: "14px",
  },
  deleteSmall: {
    background: "#dc2626",
    color: "#fff",
    border: "none",
    padding: "6px 10px",
    borderRadius: "8px",
    cursor: "pointer",
  },
};