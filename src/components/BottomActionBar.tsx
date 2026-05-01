import type { DashboardPanel } from "../types/fuel";
import { styles } from "../styles/appStyles";

type BottomActionBarProps = {
  activePanel: DashboardPanel | null;
  labels: {
    vehicleSettings: string;
    addFuel: string;
    moreData: string;
  };
  onSelect: (panel: DashboardPanel) => void;
};

export function BottomActionBar({
  activePanel,
  labels,
  onSelect,
}: BottomActionBarProps) {
  return (
    <div style={styles.bottomBarWrap}>
      <div style={styles.bottomBar}>
        <button
          style={
            activePanel === "vehicle"
              ? styles.bottomNavButtonActive
              : styles.bottomNavButton
          }
          onClick={() => onSelect("vehicle")}
        >
          {labels.vehicleSettings}
        </button>

        <button
          style={
            activePanel === "add-entry"
              ? styles.bottomNavButtonPrimaryActive
              : styles.bottomNavButtonPrimary
          }
          onClick={() => onSelect("add-entry")}
        >
          {labels.addFuel}
        </button>

        <button
          style={
            activePanel === "more"
              ? styles.bottomNavButtonActive
              : styles.bottomNavButton
          }
          onClick={() => onSelect("more")}
        >
          {labels.moreData}
        </button>
      </div>
    </div>
  );
}
