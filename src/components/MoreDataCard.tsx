import { useMemo, useState } from "react";
import type { EnrichedFuelEntry, Totals, UserSettings } from "../types/fuel";
import { styles } from "../styles/appStyles";
import {
  formatCurrency,
  formatDistance,
  formatNumber,
  getLocalizedDistanceUnitLabel,
} from "../utils/format";

type MoreDataCardProps = {
  monthlyExpenseRows: Array<{
    monthKey: string;
    monthLabel: string;
    totalCost: number;
    fillUps: number;
  }>;
  labels: {
    moreData: string;
    exportExcel: string;
    fuelingHabits: string;
    averageFillRatio: string;
    refuelTimingInsight: string;
    tankCapacityMissing: string;
    benchmarkComparison: string;
    betterThanAverage: string;
    worseThanAverage: string;
    equalToAverage: string;
    benchmarkMissing: string;
    savedVehicle: string;
    fillUpsCount: string;
    lastOdometer: string;
    avgCostPerDay: string;
    avgDistancePerDay: string;
    avgVolumePerHundred: string;
    noVehicleSaved: string;
    noData: string;
    monthlyExpensesSummary: string;
    monthlyTotalCost: string;
    annualFuelCostForecast: string;
    fuelCalendar: string;
    fuelCalendarNoData: string;
    fuelCalendarRefuels: string;
    fuelCalendarDistance: string;
    whereFueled: string;
    openFuelMap: string;
    fuelMapTitle: string;
    noFuelLocations: string;
  };
  settings: UserSettings;
  totals: Totals;
  entries: EnrichedFuelEntry[];
  lastOdometer: number | null;
  totalEntries: number;
  comparisonText: string;
  tankInsightText: string;
  averageFillText: string;
  annualFuelForecastText: string;
  annualFuelForecastSentence: string;
  embedded?: boolean;
  savedVehicleDisplayName?: string;
  onExport: () => void;
};

export function MoreDataCard({
  monthlyExpenseRows,
  labels,
  settings,
  totals,
  entries,
  lastOdometer,
  totalEntries,
  comparisonText,
  tankInsightText,
  averageFillText,
  annualFuelForecastText,
  annualFuelForecastSentence,
  embedded = false,
  savedVehicleDisplayName,
  onExport,
}: MoreDataCardProps) {
  const locale =
    settings.language === "en"
      ? "en-US"
      : settings.language === "ru"
        ? "ru-RU"
        : "he-IL";
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const latestDate = entries.at(-1)?.date;
    const base = latestDate ? new Date(`${latestDate}T00:00:00`) : new Date();
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });
  const [showFuelMap, setShowFuelMap] = useState(false);

  const locationQueries = useMemo(() => {
    const regex = /(-?\d{1,3}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)/;
    const points: string[] = [];

    for (const entry of entries) {
      const station = String(entry.station ?? "").trim();
      if (!station) continue;

      const match = station.match(regex);
      if (match) {
        const lat = Number(match[1]);
        const lon = Number(match[2]);
        if (
          Number.isFinite(lat) &&
          Number.isFinite(lon) &&
          lat >= -90 &&
          lat <= 90 &&
          lon >= -180 &&
          lon <= 180
        ) {
          points.push(`${lat},${lon}`);
          continue;
        }
      }

      points.push(station);
    }

    return Array.from(new Set(points));
  }, [entries]);

  const mapEmbedSrc = useMemo(() => {
    if (locationQueries.length === 0) return "";
    const joined = locationQueries.slice(0, 25).join(" | ");
    return `https://www.google.com/maps?q=${encodeURIComponent(joined)}&z=9&output=embed`;
  }, [locationQueries]);

  const calendarDataByDate = useMemo(() => {
    const byDate = new Map<string, { refuels: number; distance: number }>();
    for (const entry of entries) {
      const existing = byDate.get(entry.date) ?? { refuels: 0, distance: 0 };
      const distance = entry.distanceFromPrev && entry.distanceFromPrev > 0
        ? entry.distanceFromPrev
        : 0;
      byDate.set(entry.date, {
        refuels: existing.refuels + 1,
        distance: existing.distance + distance,
      });
    }
    return byDate;
  }, [entries]);

  const monthTitle = new Intl.DateTimeFormat(locale, {
    month: "long",
    year: "numeric",
  }).format(calendarMonth);
  const weekdayHeaders = Array.from({ length: 7 }, (_, index) => {
    const baseSunday = new Date(Date.UTC(2026, 0, 4 + index));
    return new Intl.DateTimeFormat(locale, { weekday: "short" }).format(baseSunday);
  });
  const monthStartWeekday = calendarMonth.getDay();
  const daysInMonth = new Date(
    calendarMonth.getFullYear(),
    calendarMonth.getMonth() + 1,
    0
  ).getDate();
  const monthDays = Array.from({ length: daysInMonth }, (_, index) => index + 1);

  const calendarCells: Array<{ day: number | null; key: string }> = [
    ...Array.from({ length: monthStartWeekday }, (_, index) => ({
      day: null,
      key: `blank-${index}`,
    })),
    ...monthDays.map((day) => ({
      day,
      key: `day-${day}`,
    })),
  ];

  while (calendarCells.length % 7 !== 0) {
    calendarCells.push({
      day: null,
      key: `tail-${calendarCells.length}`,
    });
  }

  function goToMonth(offset: number) {
    setCalendarMonth(
      (current) => new Date(current.getFullYear(), current.getMonth() + offset, 1)
    );
  }

  return (
    <div style={embedded ? styles.sheetContent : styles.card}>
      {!embedded ? <h2 style={styles.sectionTitle}>{labels.moreData}</h2> : null}

      <div style={styles.buttonRow}>
        <button style={styles.buttonPrimary} onClick={onExport}>
          {labels.exportExcel}
        </button>
        <button
          style={styles.button}
          onClick={() => setShowFuelMap((current) => !current)}
        >
          {labels.openFuelMap}
        </button>
      </div>

      {showFuelMap ? (
        <div style={{ ...styles.detailCard, marginBottom: "10px" }}>
          <div style={styles.detailLabel}>{labels.fuelMapTitle}</div>
          {locationQueries.length === 0 ? (
            <div style={styles.detailValue}>{labels.noFuelLocations}</div>
          ) : (
            <>
              <iframe
                title={labels.whereFueled}
                src={mapEmbedSrc}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                style={styles.fuelMapEmbed}
              />
              <div style={styles.fuelMapLinks}>
                {locationQueries.slice(0, 25).map((query, index) => (
                  <a
                    key={`${query}-${index}`}
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                      query
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    style={styles.fuelMapLink}
                  >
                    {query}
                  </a>
                ))}
              </div>
            </>
          )}
        </div>
      ) : null}

      <div style={styles.moreDataGrid}>
        <div style={styles.detailCard}>
          <div style={styles.detailLabel}>{labels.savedVehicle}</div>
          <div style={styles.detailValue}>
            {savedVehicleDisplayName
              ? savedVehicleDisplayName
              : labels.noVehicleSaved}
          </div>
        </div>

        <div style={styles.detailCard}>
          <div style={styles.detailLabel}>{labels.fillUpsCount}</div>
          <div style={styles.detailValue}>
            {formatNumber(totalEntries, settings.language, 0)}
          </div>
        </div>

        <div style={styles.detailCard}>
          <div style={styles.detailLabel}>{labels.lastOdometer}</div>
          <div style={styles.detailValue}>
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

        <div style={styles.detailCard}>
          <div style={styles.detailLabel}>{labels.avgCostPerDay}</div>
          <div style={styles.detailValue}>
            {formatCurrency(
              totals.avgCostPerDay,
              settings.language,
              settings.currency
            )}
          </div>
        </div>

        <div style={styles.detailCard}>
          <div style={styles.detailLabel}>{labels.avgDistancePerDay}</div>
          <div style={styles.detailValue}>
            {formatDistance(
              totals.avgKmPerDay,
              settings.language,
              settings.distanceUnit
            )}{" "}
            {getLocalizedDistanceUnitLabel(
              settings.distanceUnit,
              settings.language
            )}
          </div>
        </div>

        <div style={styles.detailCard}>
          <div style={styles.detailLabel}>{labels.avgVolumePerHundred}</div>
          <div style={styles.detailValue}>
            {formatNumber(totals.avgLitersPer100Km, settings.language)} / 100
          </div>
        </div>

        <div style={styles.detailCard}>
          <div style={styles.detailLabel}>{labels.benchmarkComparison}</div>
          <div style={styles.detailValue}>{comparisonText}</div>
        </div>

        <div style={styles.detailCard}>
          <div style={styles.detailLabel}>{labels.averageFillRatio}</div>
          <div style={styles.detailValue}>{averageFillText}</div>
        </div>

        <div style={styles.detailCard}>
          <div style={styles.detailLabel}>{labels.refuelTimingInsight}</div>
          <div style={styles.detailValue}>{tankInsightText}</div>
        </div>

        <div style={styles.detailCard}>
          <div style={styles.detailLabel}>{labels.annualFuelCostForecast}</div>
          <div style={styles.detailValue}>{annualFuelForecastText}</div>
          {annualFuelForecastSentence ? (
            <div style={styles.detailLabel}>{annualFuelForecastSentence}</div>
          ) : null}
        </div>

        <div style={{ ...styles.detailCard, gridColumn: "1 / -1" }}>
          <div style={styles.detailLabel}>{labels.monthlyExpensesSummary}</div>
          <div style={styles.monthlyCardsGrid}>
            {monthlyExpenseRows.length === 0 ? (
              <div style={styles.detailLabel}>{labels.noData}</div>
            ) : (
              monthlyExpenseRows.map((row) => (
                <div key={row.monthKey} style={styles.monthlyCard}>
                  <div style={styles.detailLabel}>{row.monthLabel}</div>
                  <div style={styles.detailValue}>
                    {formatCurrency(
                      row.totalCost,
                      settings.language,
                      settings.currency
                    )}
                  </div>
                  <div style={styles.detailLabel}>
                    {labels.fillUpsCount}: {formatNumber(row.fillUps, settings.language, 0)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div style={{ ...styles.detailCard, gridColumn: "1 / -1" }}>
          <div style={styles.calendarHeader}>
            <div style={styles.detailLabel}>{labels.fuelCalendar}</div>
            <div style={styles.calendarNav}>
              <button
                type="button"
                style={styles.button}
                onClick={() => goToMonth(-1)}
                aria-label="Previous month"
              >
                {"<"}
              </button>
              <div style={styles.detailValue}>{monthTitle}</div>
              <button
                type="button"
                style={styles.button}
                onClick={() => goToMonth(1)}
                aria-label="Next month"
              >
                {">"}
              </button>
            </div>
          </div>

          {entries.length === 0 ? (
            <div style={styles.detailLabel}>{labels.fuelCalendarNoData}</div>
          ) : (
            <>
              <div style={styles.calendarWeekHeaderGrid}>
                {weekdayHeaders.map((weekday, index) => (
                  <div key={`${weekday}-${index}`} style={styles.calendarWeekHeaderCell}>
                    {weekday}
                  </div>
                ))}
              </div>
              <div style={styles.calendarGrid}>
                {calendarCells.map((cell) => {
                  if (!cell.day) {
                    return <div key={cell.key} style={styles.calendarDayCellEmpty} />;
                  }

                  const dateKey = `${calendarMonth.getFullYear()}-${String(
                    calendarMonth.getMonth() + 1
                  ).padStart(2, "0")}-${String(cell.day).padStart(2, "0")}`;
                  const dayData = calendarDataByDate.get(dateKey);

                  return (
                    <div key={cell.key} style={styles.calendarDayCell}>
                      <div style={styles.calendarDayNumber}>{cell.day}</div>
                      {dayData ? (
                        <>
                          <div style={styles.calendarDayMeta}>
                            {labels.fuelCalendarRefuels}:{" "}
                            {formatNumber(dayData.refuels, settings.language, 0)}
                          </div>
                          <div style={styles.calendarDayMeta}>
                            {labels.fuelCalendarDistance}:{" "}
                            {formatDistance(
                              dayData.distance,
                              settings.language,
                              settings.distanceUnit
                            )}{" "}
                            {getLocalizedDistanceUnitLabel(
                              settings.distanceUnit,
                              settings.language
                            )}
                          </div>
                        </>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
