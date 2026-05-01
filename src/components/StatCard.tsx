import { styles } from "../styles/appStyles";

type StatCardProps = {
  title: string;
  value: string;
  secondaryValue?: string;
  tone?: "default" | "good" | "warning" | "bad";
  emphasis?: boolean;
  compactValue?: boolean;
};

export function StatCard({
  title,
  value,
  secondaryValue,
  tone = "default",
  emphasis = false,
  compactValue = false,
}: StatCardProps) {
  const toneStyle =
    tone === "good"
      ? styles.statCardGood
      : tone === "warning"
        ? styles.statCardWarning
        : tone === "bad"
          ? styles.statCardBad
          : undefined;
  return (
    <div style={{ ...styles.statCard, ...(toneStyle ?? {}), ...(emphasis ? styles.statCardEmphasis : {}) }}>
      <div style={{ ...styles.statTitle, ...(emphasis ? styles.statTitleOnDark : {}) }}>{title}</div>
      <div
        style={{
          ...styles.statValue,
          ...(emphasis ? styles.statValueOnDark : {}),
          ...(compactValue ? styles.statValueCompact : {}),
        }}
      >
        {value}
      </div>
      {secondaryValue ? (
        <div style={{ ...styles.statSecondaryValue, ...(emphasis ? styles.statSecondaryOnDark : {}) }}>
          {secondaryValue}
        </div>
      ) : null}
    </div>
  );
}
