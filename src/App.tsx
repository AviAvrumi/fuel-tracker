import { useEffect, useMemo, useRef, useState } from "react";

type FuelEntry = {
  id: string;
  date: string;
  liters: number;
  totalPrice: number;
  odometer: number;
  fuelType: string;
  station: string;
  notes: string;
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

const STORAGE_KEY = "fuel-tracker-hebrew-entries";

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

function downloadFile(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function csvEscape(value: unknown): string {
  const str = String(value ?? "");
  if (str.includes(",") || str.includes("\n") || str.includes('"')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export default function App() {
  const [entries, setEntries] = useState<FuelEntry[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return [];
    try {
      return JSON.parse(saved) as FuelEntry[];
    } catch {
      return [];
    }
  });

  const [form, setForm] = useState({
    date: todayValue(),
    liters: "",
    totalPrice: "",
    odometer: "",
    fuelType: "בנזין 95",
    station: "",
    notes: "",
  });

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  }, [entries]);

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
      const pricePerLiter = entry.totalPrice / entry.liters;

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
          ? entry.totalPrice / distanceFromPrev
          : null;

      const costPerDay =
        prev !== undefined &&
        daysFromPrev !== null &&
        daysFromPrev > 0
          ? entry.totalPrice / daysFromPrev
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
    const totalCost = enrichedEntries.reduce((sum, e) => sum + e.totalPrice, 0);

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

  function updateForm(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function addEntry() {
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

    const newEntry: FuelEntry = {
      id: crypto.randomUUID(),
      date: form.date,
      liters,
      totalPrice,
      odometer,
      fuelType: form.fuelType,
      station: form.station,
      notes: form.notes,
    };

    setEntries((prev) => [...prev, newEntry]);

    setForm({
      date: todayValue(),
      liters: "",
      totalPrice: "",
      odometer: "",
      fuelType: "בנזין 95",
      station: "",
      notes: "",
    });
  }

  function deleteEntry(id: string) {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }

  function clearAll() {
    const ok = window.confirm("למחוק את כל הנתונים?");
    if (!ok) return;
    setEntries([]);
    localStorage.removeItem(STORAGE_KEY);
  }

  function exportJson() {
    downloadFile(
      `fuel-backup-${todayValue()}.json`,
      JSON.stringify(entries, null, 2),
      "application/json;charset=utf-8"
    );
  }

  function exportCsv() {
    const headers = [
      "תאריך",
      "ליטרים",
      "מחיר כולל",
      "מחיר לליטר",
      "קילומטראז׳",
      "סוג דלק",
      "תחנה",
      "הערות",
      "מרחק מהתדלוק הקודם",
      "ימים מהתדלוק הקודם",
      'ק"מ לליטר',
      'ליטר ל-100 ק"מ',
      'עלות לק"מ',
      'ק"מ ליום',
      "עלות ליום",
    ];

    const rows = enrichedEntries.map((entry) => [
      entry.date,
      entry.liters,
      entry.totalPrice,
      entry.pricePerLiter,
      entry.odometer,
      entry.fuelType,
      entry.station,
      entry.notes,
      entry.distanceFromPrev ?? "",
      entry.daysFromPrev ?? "",
      entry.kmPerLiter ?? "",
      entry.litersPer100Km ?? "",
      entry.costPerKm ?? "",
      entry.kmPerDay ?? "",
      entry.costPerDay ?? "",
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map(csvEscape).join(","))
      .join("\n");

    downloadFile(
      `fuel-report-${todayValue()}.csv`,
      "\uFEFF" + csv,
      "text/csv;charset=utf-8"
    );
  }

  async function importJson(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as FuelEntry[];
      if (!Array.isArray(parsed)) throw new Error("Invalid file");
      setEntries(parsed);
      alert("הגיבוי נטען בהצלחה");
    } catch {
      alert("הקובץ לא תקין");
    }

    event.target.value = "";
  }

  const lastOdometer =
    sortedEntries.length > 0 ? sortedEntries[sortedEntries.length - 1].odometer : null;

  return (
    <div style={styles.page} dir="rtl">
      <div style={styles.container}>
        <h1 style={styles.title}>מעקב תדלוקים וצריכת דלק</h1>
        <p style={styles.subtitle}>
          ממלאים בכל תדלוק: ליטרים, מחיר כולל, קילומטראז׳, סוג דלק ותחנה.
          האתר שומר את הנתונים ומחשב אוטומטית את כל המדדים החשובים.
        </p>

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
            <button style={styles.button} onClick={exportCsv}>
              ייצוא CSV
            </button>
            <button style={styles.button} onClick={exportJson}>
              גיבוי JSON
            </button>
            <button style={styles.button} onClick={() => fileInputRef.current?.click()}>
              טעינת גיבוי
            </button>
            <button style={styles.buttonDanger} onClick={clearAll}>
              מחק הכל
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              style={{ display: "none" }}
              onChange={importJson}
            />
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
                      <td style={styles.td}>{formatCurrency(entry.totalPrice)}</td>
                      <td style={styles.td}>{formatCurrency(entry.pricePerLiter)}</td>
                      <td style={styles.td}>{formatNumber(entry.odometer, 0)}</td>
                      <td style={styles.td}>{entry.fuelType || "-"}</td>
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