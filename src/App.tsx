import { useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./lib/supabase";
import { VEHICLES } from "./data/vehicles";

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

type Profile = {
  id: string;
  email: string | null;
  manufacturer: string | null;
  model: string | null;
  year: number | null;
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

type AuthMode = "login" | "signup";

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

  const [vehicleForm, setVehicleForm] = useState({
    manufacturer: "",
    model: "",
    year: "",
  });

  const [brandSearch, setBrandSearch] = useState("");

  const [form, setForm] = useState({
    date: todayValue(),
    liters: "",
    totalPrice: "",
    odometer: "",
    fuelType: "בנזין 95",
    station: "",
    notes: "",
  });

  const filteredBrands = VEHICLES.filter((item) =>
    item.brand.toLowerCase().includes(brandSearch.toLowerCase())
  );

  const selectedBrandData = VEHICLES.find(
    (item) => item.brand === vehicleForm.manufacturer
  );

  const availableModels = selectedBrandData ? selectedBrandData.models : [];

  const availableYears = Array.from(
    { length: new Date().getFullYear() - 1995 + 1 },
    (_, i) => String(new Date().getFullYear() - i)
  );

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
      void loadProfile(session.user.id, session.user.email ?? null);
      void loadEntries(session.user.id);
    } else {
      setProfile(null);
      setEntries([]);
    }
  }, [session]);

  async function handleGoogleLogin() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
      },
    });

    if (error) {
      alert(error.message);
    }
  }

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
      setVehicleForm({
        manufacturer: "",
        model: "",
        year: "",
      });
      setBrandSearch("");
      return;
    }

    const loadedProfile = data as Profile;
    setProfile(loadedProfile);
    setVehicleForm({
      manufacturer: loadedProfile.manufacturer ?? "",
      model: loadedProfile.model ?? "",
      year: loadedProfile.year ? String(loadedProfile.year) : "",
    });
    setBrandSearch(loadedProfile.manufacturer ?? "");

    if (!loadedProfile.email && userEmail) {
      await supabase.from("profiles").update({ email: userEmail }).eq("id", userId);
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

  async function handleAuth() {
    if (!email || !password) {
      alert("מלא אימייל וסיסמה");
      return;
    }

    if (authMode === "signup") {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });

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

  async function handleLogout() {
    await supabase.auth.signOut();
  }

  function updateVehicleForm(field: "manufacturer" | "model" | "year", value: string) {
    setVehicleForm((prev) => {
      if (field === "manufacturer") {
        return {
          ...prev,
          manufacturer: value,
          model: "",
        };
      }

      return { ...prev, [field]: value };
    });
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

  const sortedEntries = useMemo(() => {
    return [...entries].sort((a, b) => {
      const dateDiff = new Date(a.date).getTime() - new Date(b.date).getTime();
      if (dateDiff !== 0) return dateDiff;
      return a.odometer - b.odometer;
    });
  }, [entries]);

  const enrichedEntries = useMemo<EnrichedFuelEntry[]>(() => {
    return sortedEntries.map((entry, index) => {
      const prev = sortedEntries[index - 1];
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
        prev !== undefined &&
        daysFromPrev !== null &&
        daysFromPrev > 0
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
  }, [sortedEntries]);

  const totals = useMemo(() => {
    const totalLiters = enrichedEntries.reduce((sum, e) => sum + e.liters, 0);
    const totalCost = enrichedEntries.reduce((sum, e) => sum + e.total_price, 0);

    let totalDistance = 0;
    let totalDays = 0;

    for (const e of enrichedEntries) {
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
  }, [enrichedEntries]);

  function updateForm(
    field: "date" | "liters" | "totalPrice" | "odometer" | "fuelType" | "station" | "notes",
    value: string
  ) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function addEntry() {
    if (!session?.user?.id) return;

    if (!profile?.manufacturer || !profile?.model || !profile?.year) {
      alert("צריך קודם לשמור את פרטי הרכב");
      return;
    }

    const liters = Number(form.liters);
    const totalPrice = Number(form.totalPrice);
    const odometer = Number(form.odometer);

    if (!form.date || !liters || !totalPrice || !odometer) {
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
      date: form.date,
      liters,
      total_price: totalPrice,
      odometer,
      fuel_type: form.fuelType,
      station: form.station,
      notes: form.notes,
    });

    if (error) {
      alert(error.message);
      return;
    }

    setForm({
      date: todayValue(),
      liters: "",
      totalPrice: "",
      odometer: "",
      fuelType: "בנזין 95",
      station: "",
      notes: "",
    });

    await loadEntries(session.user.id);
  }

  async function deleteEntry(id: string) {
    const { error } = await supabase.from("fuel_entries").delete().eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    if (session?.user?.id) {
      await loadEntries(session.user.id);
    }
  }

  if (loadingAuth) {
    return <div style={styles.centered}>טוען...</div>;
  }

  if (!session) {
    return (
      <div style={styles.page} dir="rtl">
        <div style={styles.authCard}>
          <h1 style={styles.title}>כניסה לאתר</h1>
          <p style={styles.subtitle}>צור משתמש עם אימייל וסיסמה, או התחבר אם כבר נרשמת.</p>

          <div style={styles.authTabs}>
            <button
              style={authMode === "login" ? styles.buttonPrimary : styles.button}
              onClick={() => setAuthMode("login")}
            >
              התחברות
            </button>
            <button
              style={authMode === "signup" ? styles.buttonPrimary : styles.button}
              onClick={() => setAuthMode("signup")}
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
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div style={{ gridColumn: "1 / -1" }}>
              <label style={styles.label}>סיסמה</label>
              <input
                style={styles.input}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button style={styles.buttonPrimary} onClick={handleAuth}>
            {authMode === "signup" ? "צור משתמש" : "התחבר"}
          </button>

          <div style={{ marginTop: "12px" }}>
            <button style={styles.button} onClick={handleGoogleLogin}>
              התחבר עם Google
            </button>
          </div>
        </div>
      </div>
    );
  }

  const lastOdometer =
    sortedEntries.length > 0 ? sortedEntries[sortedEntries.length - 1].odometer : null;

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

        <div style={styles.card}>
          <h2 style={styles.sectionTitle}>פרטי הרכב</h2>

          {loadingProfile ? (
            <div>טוען פרטי רכב...</div>
          ) : (
            <>
              <div style={styles.formGrid}>
                <div>
                  <label style={styles.label}>חיפוש יצרן</label>
                  <input
                    style={styles.input}
                    type="text"
                    value={brandSearch}
                    onChange={(e) => setBrandSearch(e.target.value)}
                    placeholder="למשל: מא"
                  />
                </div>

                <div>
                  <label style={styles.label}>יצרן</label>
                  <select
                    style={styles.input}
                    value={vehicleForm.manufacturer}
                    onChange={(e) => {
                      updateVehicleForm("manufacturer", e.target.value);
                      setBrandSearch(e.target.value);
                    }}
                  >
                    <option value="">בחר יצרן</option>
                    {filteredBrands.map((item) => (
                      <option key={item.brand} value={item.brand}>
                        {item.brand}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={styles.label}>דגם</label>
                  <select
                    style={styles.input}
                    value={vehicleForm.model}
                    onChange={(e) => updateVehicleForm("model", e.target.value)}
                    disabled={!vehicleForm.manufacturer}
                  >
                    <option value="">בחר דגם</option>
                    {availableModels.map((model) => (
                      <option key={model} value={model}>
                        {model}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={styles.label}>שנה</label>
                  <select
                    style={styles.input}
                    value={vehicleForm.year}
                    onChange={(e) => updateVehicleForm("year", e.target.value)}
                  >
                    <option value="">בחר שנה</option>
                    {availableYears.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={styles.buttonRow}>
                <button style={styles.buttonPrimary} onClick={saveVehicleProfile}>
                  שמור פרטי רכב
                </button>
              </div>

              {profile?.manufacturer && profile?.model && profile?.year ? (
                <div style={styles.vehicleBox}>
                  הרכב השמור שלך: {profile.manufacturer} {profile.model} {profile.year}
                </div>
              ) : (
                <div style={styles.vehicleBox}>
                  עדיין לא שמרת פרטי רכב. צריך לשמור כדי להתחיל להזין תדלוקים.
                </div>
              )}
            </>
          )}
        </div>

        <div style={styles.infoBox}>
          קילומטראז׳ אחרון: {lastOdometer ? formatNumber(lastOdometer, 0) : "-"} ק"מ
        </div>

        <div style={styles.card}>
          <h2 style={styles.sectionTitle}>הוספת תדלוק</h2>

          <div style={styles.formGrid}>
            <div>
              <label style={styles.label}>תאריך</label>
              <input
                style={styles.input}
                type="date"
                value={form.date}
                onChange={(e) => updateForm("date", e.target.value)}
              />
            </div>

            <div>
              <label style={styles.label}>כמות דלק בליטרים</label>
              <input
                style={styles.input}
                type="number"
                step="0.01"
                value={form.liters}
                onChange={(e) => updateForm("liters", e.target.value)}
              />
            </div>

            <div>
              <label style={styles.label}>מחיר כולל</label>
              <input
                style={styles.input}
                type="number"
                step="0.01"
                value={form.totalPrice}
                onChange={(e) => updateForm("totalPrice", e.target.value)}
              />
            </div>

            <div>
              <label style={styles.label}>קילומטראז׳</label>
              <input
                style={styles.input}
                type="number"
                step="1"
                value={form.odometer}
                onChange={(e) => updateForm("odometer", e.target.value)}
              />
            </div>

            <div>
              <label style={styles.label}>סוג דלק</label>
              <select
                style={styles.input}
                value={form.fuelType}
                onChange={(e) => updateForm("fuelType", e.target.value)}
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
                onChange={(e) => updateForm("station", e.target.value)}
              />
            </div>

            <div style={{ gridColumn: "1 / -1" }}>
              <label style={styles.label}>הערות</label>
              <input
                style={styles.input}
                type="text"
                value={form.notes}
                onChange={(e) => updateForm("notes", e.target.value)}
              />
            </div>
          </div>

          <div style={styles.buttonRow}>
            <button style={styles.buttonPrimary} onClick={addEntry}>
              שמור תדלוק
            </button>
          </div>
        </div>

        <div style={styles.statsGrid}>
          <StatCard title='סה"כ ליטרים' value={`${formatNumber(totals.totalLiters)} ל׳`} />
          <StatCard title='סה"כ עלות' value={formatCurrency(totals.totalCost)} />
          <StatCard title='סה"כ מרחק' value={`${formatNumber(totals.totalDistance)} ק"מ`} />
          <StatCard title='ממוצע ק"מ לליטר' value={formatNumber(totals.avgKmPerLiter)} />
          <StatCard title='ממוצע ליטר ל-100 ק"מ' value={formatNumber(totals.avgLitersPer100Km)} />
          <StatCard title='ממוצע מחיר לליטר' value={formatCurrency(totals.avgPricePerLiter)} />
          <StatCard title='ממוצע עלות לק"מ' value={formatCurrency(totals.avgCostPerKm)} />
          <StatCard title='ממוצע ק"מ ליום' value={formatNumber(totals.avgKmPerDay)} />
          <StatCard title='ממוצע עלות ליום' value={formatCurrency(totals.avgCostPerDay)} />
        </div>

        <div style={styles.card}>
          <h2 style={styles.sectionTitle}>פירוט כל התדלוקים</h2>

          {loadingEntries ? (
            <div>טוען נתונים...</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>תאריך</th>
                    <th style={styles.th}>ליטרים</th>
                    <th style={styles.th}>מחיר כולל</th>
                    <th style={styles.th}>מחיר לליטר</th>
                    <th style={styles.th}>קילומטראז׳</th>
                    <th style={styles.th}>סוג דלק</th>
                    <th style={styles.th}>תחנה</th>
                    <th style={styles.th}>מרחק קודם</th>
                    <th style={styles.th}>ימים</th>
                    <th style={styles.th}>ק"מ לליטר</th>
                    <th style={styles.th}>ליטר ל-100</th>
                    <th style={styles.th}>עלות לק"מ</th>
                    <th style={styles.th}>ק"מ ליום</th>
                    <th style={styles.th}>עלות ליום</th>
                    <th style={styles.th}>מחיקה</th>
                  </tr>
                </thead>
                <tbody>
                  {enrichedEntries.length === 0 ? (
                    <tr>
                      <td style={styles.td} colSpan={15}>
                        עדיין אין נתונים
                      </td>
                    </tr>
                  ) : (
                    enrichedEntries.map((entry) => (
                      <tr key={entry.id}>
                        <td style={styles.td}>{entry.date}</td>
                        <td style={styles.td}>{formatNumber(entry.liters)}</td>
                        <td style={styles.td}>{formatCurrency(entry.total_price)}</td>
                        <td style={styles.td}>{formatCurrency(entry.pricePerLiter)}</td>
                        <td style={styles.td}>{formatNumber(entry.odometer, 0)}</td>
                        <td style={styles.td}>{entry.fuel_type || "-"}</td>
                        <td style={styles.td}>{entry.station || "-"}</td>
                        <td style={styles.td}>{formatNumber(entry.distanceFromPrev, 0)}</td>
                        <td style={styles.td}>{formatNumber(entry.daysFromPrev, 0)}</td>
                        <td style={styles.td}>{formatNumber(entry.kmPerLiter)}</td>
                        <td style={styles.td}>{formatNumber(entry.litersPer100Km)}</td>
                        <td style={styles.td}>{formatCurrency(entry.costPerKm)}</td>
                        <td style={styles.td}>{formatNumber(entry.kmPerDay)}</td>
                        <td style={styles.td}>{formatCurrency(entry.costPerDay)}</td>
                        <td style={styles.td}>
                          <button
                            style={styles.deleteSmall}
                            onClick={() => deleteEntry(entry.id)}
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
      </div>
    </div>
  );
}

function StatCard({ title, value }: { title: string; value: string }) {
  return (
    <div style={styles.statCard}>
      <div style={styles.statTitle}>{title}</div>
      <div style={styles.statValue}>{value}</div>
    </div>
  );
}

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
  },
  subtitle: {
    color: "#4b5563",
    marginBottom: "16px",
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