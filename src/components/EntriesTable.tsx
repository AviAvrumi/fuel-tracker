import { useEffect, useMemo, useState } from "react";
import type {
  CurrencyUnit,
  ConsumptionView,
  DistanceUnit,
  EnrichedFuelEntry,
  Language,
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
} from "../utils/format";
import { styles } from "../styles/appStyles";

type EntriesTableProps = {
  entries: EnrichedFuelEntry[];
  labels: {
    entriesTitle: string;
    date: string;
    createdAtTime: string;
    volumeAmount: string;
    totalPrice: string;
    avgPricePerVolume: string;
    odometer: string;
    fuelType: string;
    station: string;
    tankPercentBeforeRefuel: string;
    previousDistance: string;
    days: string;
    avgDistancePerVolume: string;
    avgVolumePerHundred: string;
    avgCostPerDistance: string;
    distancePerDay: string;
    avgCostPerDay: string;
    delete: string;
    edit: string;
    noData: string;
  };
  language: Language;
  distanceUnit: DistanceUnit;
  volumeUnit: VolumeUnit;
  currency: CurrencyUnit;
  consumptionView: ConsumptionView;
  loadingEntries: boolean;
  onDelete: (id: string) => void;
  onEdit: (id: string) => void;
};

export function EntriesTable({
  entries,
  labels,
  language,
  distanceUnit,
  volumeUnit,
  currency,
  consumptionView,
  loadingEntries,
  onDelete,
  onEdit,
}: EntriesTableProps) {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(max-width: 760px)").matches
      : false
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mediaQuery = window.matchMedia("(max-width: 760px)");
    const onChange = (event: MediaQueryListEvent) => setIsMobile(event.matches);
    mediaQuery.addEventListener("change", onChange);
    return () => mediaQuery.removeEventListener("change", onChange);
  }, []);
  const [mobileSectionOpen, setMobileSectionOpen] = useState(() =>
    typeof window !== "undefined"
      ? !window.matchMedia("(max-width: 760px)").matches
      : true
  );

  const consumptionLabel = useMemo(
    () =>
      consumptionView === "distance_per_volume"
        ? labels.avgDistancePerVolume
        : labels.avgVolumePerHundred,
    [consumptionView, labels.avgDistancePerVolume, labels.avgVolumePerHundred]
  );

  const formatConsumptionValue = (entry: EnrichedFuelEntry) => {
    if (consumptionView === "distance_per_volume") {
      return `${formatNumber(
        convertDistancePerVolume(entry.kmPerLiter, distanceUnit, volumeUnit),
        language
      )} ${getLocalizedDistanceUnitLabel(
        distanceUnit,
        language
      )}/${getLocalizedVolumeUnitLabel(volumeUnit, language)}`;
    }

    return `${formatNumber(
      convertVolumePerHundredDistance(
        entry.litersPer100Km,
        distanceUnit,
        volumeUnit
      ),
      language
    )} ${getLocalizedVolumeUnitLabel(
      volumeUnit,
      language
    )}/100 ${getLocalizedDistanceUnitLabel(distanceUnit, language)}`;
  };

  const formatTankPercent = (value: number | null | undefined) => {
    if (value === null || value === undefined) return "-";
    return `${formatNumber(value, language, 0)}%`;
  };

  const getTankPercentVisualStyle = (value: number | null | undefined) => {
    if (value === null || value === undefined) {
      return {
        background: "var(--soft-bg)",
        border: "1px solid var(--soft-border)",
        color: "var(--text-primary)",
      };
    }

    if (value < 20) {
      return {
        background: "linear-gradient(135deg, rgba(239,68,68,0.24), rgba(185,28,28,0.2))",
        border: "1px solid rgba(239,68,68,0.58)",
        color: "#fef2f2",
      };
    }

    if (value >= 70) {
      return {
        background: "linear-gradient(135deg, rgba(34,197,94,0.24), rgba(22,163,74,0.2))",
        border: "1px solid rgba(34,197,94,0.6)",
        color: "#f0fdf4",
      };
    }

    return {
      background: "linear-gradient(135deg, rgba(249,115,22,0.24), rgba(217,119,6,0.2))",
      border: "1px solid rgba(249,115,22,0.58)",
      color: "#fff7ed",
    };
  };

  const mobileHeader = (
    <button
      type="button"
      style={styles.mobileCollapseHeader}
      onClick={() => setMobileSectionOpen((current) => !current)}
      aria-expanded={mobileSectionOpen}
    >
      <span>{labels.entriesTitle}</span>
      <span
        style={{
          ...styles.mobileCollapseChevron,
          transform: mobileSectionOpen ? "rotate(180deg)" : "rotate(0deg)",
        }}
      >
        ▼
      </span>
    </button>
  );

  return (
    <div style={styles.card}>
      {mobileHeader}

      {loadingEntries ? (
        <div>{labels.noData}</div>
      ) : isMobile ? (
        mobileSectionOpen ? (
        <div style={styles.entryCardsList}>
          {entries.length === 0 ? (
            <div style={styles.detailLabel}>{labels.noData}</div>
          ) : (
            entries.map((entry) => (
              <details key={entry.id} style={styles.entryCardCompact}>
                <summary style={styles.entryCardSummary}>
                  <div style={styles.entryCardSummaryMain}>
                    <div style={styles.entryCardTitle}>{entry.date}</div>
                    <div style={styles.entryCardSubTitle}>
                      {formatVolume(entry.liters, language, volumeUnit)} •{" "}
                      {formatCurrency(entry.total_price, language, currency)}
                    </div>
                  </div>
                  <div style={styles.entryCardSummaryRight}>
                    <div style={styles.entryCardItemLabel}>{labels.odometer}</div>
                    <div style={styles.entryCardItemValue}>
                      {formatDistance(entry.odometer, language, distanceUnit)}
                    </div>
                  </div>
                </summary>

                <div style={styles.entryCardGrid}>
                  <div style={styles.entryCardItem}>
                    <div style={styles.entryCardItemLabel}>{labels.createdAtTime}</div>
                    <div style={styles.entryCardItemValue}>{entry.fuel_time || "-"}</div>
                  </div>
                  <div style={styles.entryCardItem}>
                    <div style={styles.entryCardItemLabel}>{labels.fuelType}</div>
                    <div style={styles.entryCardItemValue}>{entry.fuel_type || "-"}</div>
                  </div>
                  <div style={styles.entryCardItem}>
                    <div style={styles.entryCardItemLabel}>{labels.station}</div>
                    <div style={styles.entryCardItemValue}>{entry.station || "-"}</div>
                  </div>
                  <div style={styles.entryCardItem}>
                    <div style={styles.entryCardItemLabel}>{labels.previousDistance}</div>
                    <div style={styles.entryCardItemValue}>
                      {formatDistance(entry.distanceFromPrev, language, distanceUnit)}
                    </div>
                  </div>
                  <div style={styles.entryCardItem}>
                    <div style={styles.entryCardItemLabel}>{consumptionLabel}</div>
                    <div style={styles.entryCardItemValue}>{formatConsumptionValue(entry)}</div>
                  </div>
                  <div style={styles.entryCardItem}>
                    <div style={styles.entryCardItemLabel}>{labels.avgCostPerDistance}</div>
                    <div style={styles.entryCardItemValue}>
                      {formatCurrency(
                        convertCurrencyPerDistance(entry.costPerKm, distanceUnit, currency),
                        language,
                        currency
                      )}
                    </div>
                  </div>
                  <div style={styles.entryCardItem}>
                    <div style={styles.entryCardItemLabel}>{labels.tankPercentBeforeRefuel}</div>
                    <div
                      style={{
                        ...styles.entryCardItemValue,
                        ...getTankPercentVisualStyle(entry.tankPercentBeforeRefuel),
                        borderRadius: "8px",
                        padding: "6px 8px",
                        textAlign: "center",
                      }}
                    >
                      {formatTankPercent(entry.tankPercentBeforeRefuel)}
                    </div>
                  </div>
                </div>

                <div style={styles.entryCardActions}>
                  <button style={styles.button} onClick={() => onEdit(entry.id)}>
                    {labels.edit}
                  </button>
                  <button style={styles.deleteSmall} onClick={() => onDelete(entry.id)}>
                    {labels.delete}
                  </button>
                </div>
              </details>
            ))
          )}
        </div>
        ) : null
      ) : mobileSectionOpen ? (
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>{labels.date}</th>
                <th style={styles.th}>{labels.createdAtTime}</th>
                <th style={styles.th}>{labels.volumeAmount}</th>
                <th style={styles.th}>{labels.totalPrice}</th>
                <th style={styles.th}>{labels.avgPricePerVolume}</th>
                <th style={styles.th}>{labels.odometer}</th>
                <th style={styles.th}>{labels.fuelType}</th>
                <th style={styles.th}>{labels.station}</th>
                <th style={styles.th}>{labels.tankPercentBeforeRefuel}</th>
                <th style={styles.th}>{labels.previousDistance}</th>
                <th style={styles.th}>{labels.days}</th>
                <th style={styles.th}>{consumptionLabel}</th>
                <th style={styles.th}>{labels.avgCostPerDistance}</th>
                <th style={styles.th}>{labels.distancePerDay}</th>
                <th style={styles.th}>{labels.avgCostPerDay}</th>
                <th style={styles.th}>{labels.edit}</th>
                <th style={styles.th}>{labels.delete}</th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 ? (
                <tr>
                  <td style={styles.td} colSpan={17}>
                    {labels.noData}
                  </td>
                </tr>
              ) : (
                entries.map((entry) => (
                  <tr key={entry.id}>
                    <td style={styles.td}>{entry.date}</td>
                    <td style={styles.td}>{entry.fuel_time || "-"}</td>
                    <td style={styles.td}>
                      {formatVolume(entry.liters, language, volumeUnit)}
                    </td>
                    <td style={styles.td}>
                      {formatCurrency(entry.total_price, language, currency)}
                    </td>
                    <td style={styles.td}>
                      {formatCurrency(entry.pricePerLiter, language, currency)}
                    </td>
                    <td style={styles.td}>
                      {formatDistance(entry.odometer, language, distanceUnit)}
                    </td>
                    <td style={styles.td}>{entry.fuel_type || "-"}</td>
                    <td style={styles.td}>{entry.station || "-"}</td>
                    <td style={styles.td}>
                      <span
                        style={{
                          ...getTankPercentVisualStyle(entry.tankPercentBeforeRefuel),
                          borderRadius: "999px",
                          padding: "4px 10px",
                          fontWeight: 700,
                          display: "inline-block",
                          minWidth: "52px",
                          textAlign: "center",
                        }}
                      >
                        {formatTankPercent(entry.tankPercentBeforeRefuel)}
                      </span>
                    </td>
                    <td style={styles.td}>
                      {formatDistance(entry.distanceFromPrev, language, distanceUnit)}
                    </td>
                    <td style={styles.td}>
                      {formatNumber(entry.daysFromPrev, language, 0)}
                    </td>
                    <td style={styles.td}>{formatConsumptionValue(entry)}</td>
                    <td style={styles.td}>
                      {formatCurrency(
                        convertCurrencyPerDistance(
                          entry.costPerKm,
                          distanceUnit,
                          currency
                        ),
                        language,
                        currency
                      )}
                    </td>
                    <td style={styles.td}>
                      {formatDistance(entry.kmPerDay, language, distanceUnit)}
                    </td>
                    <td style={styles.td}>
                      {formatCurrency(entry.costPerDay, language, currency)}
                    </td>
                    <td style={styles.td}>
                      <button style={styles.button} onClick={() => onEdit(entry.id)}>
                        {labels.edit}
                      </button>
                    </td>
                    <td style={styles.td}>
                      <button
                        style={styles.deleteSmall}
                        onClick={() => onDelete(entry.id)}
                      >
                        {labels.delete}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : null
      }
    </div>
  );
}
