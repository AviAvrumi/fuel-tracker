import { styles } from "../styles/appStyles";

type TrendMiniChartProps = {
  title: string;
  subtitle: string;
  values: number[];
  stroke: string;
  startLabel?: string;
  endLabel?: string;
};

function buildPath(values: number[], width: number, height: number, padding: number) {
  if (values.length === 0) return "";
  const min = Math.min(0, ...values);
  const max = Math.max(...values);
  const range = max - min;
  if (range <= 0.0001) {
    const y = height / 2;
    return values
      .map((_, index) => {
        const x =
          padding +
          (index / Math.max(values.length - 1, 1)) * (width - padding * 2);
        return `${index === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`;
      })
      .join(" ");
  }
  return values
    .map((value, index) => {
      const x =
        padding +
        (index / Math.max(values.length - 1, 1)) * (width - padding * 2);
      const y =
        padding +
        (1 - (value - min) / range) * (height - padding * 2);
      return `${index === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

export function TrendMiniChart({
  title,
  subtitle,
  values,
  stroke,
  startLabel,
  endLabel,
}: TrendMiniChartProps) {
  const width = 360;
  const height = 120;
  const path = buildPath(values, width, height, 12);

  return (
    <div style={styles.chartCard}>
      <div style={styles.chartTitle}>{title}</div>
      <div style={styles.chartSubtitle}>{subtitle}</div>
      <svg viewBox={`0 0 ${width} ${height}`} style={styles.chartSvg}>
        <rect x="0" y="0" width={width} height={height} fill="transparent" />
        <path d={path} fill="none" stroke={stroke} strokeWidth="3" />
      </svg>
      {startLabel || endLabel ? (
        <div style={styles.chartAxisRow}>
          <span style={styles.chartAxisLabel}>{startLabel ?? ""}</span>
          <span style={styles.chartAxisLabel}>{endLabel ?? ""}</span>
        </div>
      ) : null}
    </div>
  );
}
