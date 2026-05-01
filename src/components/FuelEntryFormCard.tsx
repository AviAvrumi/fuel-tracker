import { useEffect, useState } from "react";
import type { FuelFormState, VehicleRecord } from "../types/fuel";
import { styles } from "../styles/appStyles";

type FuelEntryFormCardProps = {
  form: FuelFormState;
  vehicles: VehicleRecord[];
  labels: {
    fuelEntryTitle: string;
    editFuelEntryTitle: string;
    date: string;
    time: string;
    volumeAmount: string;
    totalPrice: string;
    odometer: string;
    station: string;
    notes: string;
    saveFuelEntry: string;
    updateFuelEntry: string;
    vehicleSelectForFuel: string;
    chooseVehicle: string;
    useCurrentLocation: string;
    locating: string;
    startVoiceInput: string;
    listening: string;
    voiceInputHint: string;
    quickFuelFormHint: string;
  };
  unitLabel: string;
  isEditing: boolean;
  embedded?: boolean;
  locationLoading?: boolean;
  voiceListening?: boolean;
  voiceSupported?: boolean;
  onFieldChange: (field: keyof FuelFormState, value: string) => void;
  onUseCurrentLocation: () => void;
  onStartVoiceInput: () => void;
  onSave: () => void;
};

export function FuelEntryFormCard({
  form,
  vehicles,
  labels,
  unitLabel,
  isEditing,
  embedded = false,
  locationLoading = false,
  voiceListening = false,
  voiceSupported = true,
  onFieldChange,
  onUseCurrentLocation,
  onStartVoiceInput,
  onSave,
}: FuelEntryFormCardProps) {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(max-width: 640px)").matches;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mediaQuery = window.matchMedia("(max-width: 640px)");
    const handleChange = (event: MediaQueryListEvent) => {
      setIsMobile(event.matches);
    };
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  if (isMobile) {
    return (
      <div style={embedded ? styles.sheetContent : styles.card}>
        <div style={styles.mobileQuickForm}>
          <div style={styles.mobileQuickField}>
            <label style={styles.label}>{labels.odometer}</label>
            <input
              style={styles.mobileBigInput}
              type="number"
              step="1"
              value={form.odometer}
              onChange={(event) => onFieldChange("odometer", event.target.value)}
            />
          </div>

          <div style={styles.mobileQuickField}>
            <label style={styles.label}>
              {labels.volumeAmount} ({unitLabel})
            </label>
            <input
              style={styles.mobileBigInput}
              type="number"
              step="0.01"
              value={form.liters}
              onChange={(event) => onFieldChange("liters", event.target.value)}
            />
          </div>

          <div style={styles.mobileQuickField}>
            <label style={styles.label}>{labels.totalPrice}</label>
            <input
              style={styles.mobileBigInput}
              type="number"
              step="0.01"
              value={form.totalPrice}
              onChange={(event) => onFieldChange("totalPrice", event.target.value)}
            />
          </div>
        </div>

        <div style={styles.buttonRow}>
          <button
            style={styles.button}
            type="button"
            onClick={onUseCurrentLocation}
            disabled={locationLoading}
          >
            {locationLoading ? labels.locating : labels.useCurrentLocation}
          </button>
          {voiceSupported ? (
            <button
              style={styles.button}
              type="button"
              onClick={onStartVoiceInput}
              disabled={voiceListening}
            >
              {voiceListening ? labels.listening : labels.startVoiceInput}
            </button>
          ) : null}
          <button style={styles.mobileSaveButton} onClick={onSave}>
            {isEditing ? labels.updateFuelEntry : labels.saveFuelEntry}
          </button>
        </div>
        <div style={styles.subtitle}>{labels.quickFuelFormHint}</div>
        {voiceSupported ? (
          <div style={styles.subtitle}>{labels.voiceInputHint}</div>
        ) : null}
      </div>
    );
  }

  return (
    <div style={embedded ? styles.sheetContent : styles.card}>
      {!embedded ? (
        <h2 style={styles.sectionTitle}>
          {isEditing ? labels.editFuelEntryTitle : labels.fuelEntryTitle}
        </h2>
      ) : null}

      <div style={styles.formGrid}>
        <div>
          <label style={styles.label}>{labels.vehicleSelectForFuel}</label>
          <select
            style={styles.input}
            value={form.vehicleId}
            onChange={(event) => onFieldChange("vehicleId", event.target.value)}
          >
            <option value="">{labels.chooseVehicle}</option>
            {vehicles.map((vehicle) => (
              <option key={vehicle.id} value={vehicle.id}>
                {vehicle.manufacturer} {vehicle.model} {vehicle.year}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label style={styles.label}>{labels.date}</label>
          <input
            style={styles.input}
            type="date"
            value={form.date}
            onChange={(event) => onFieldChange("date", event.target.value)}
          />
        </div>

        <div>
          <label style={styles.label}>{labels.time}</label>
          <input
            style={styles.input}
            type="time"
            value={form.time}
            onChange={(event) => onFieldChange("time", event.target.value)}
          />
        </div>

        <div>
          <label style={styles.label}>
            {labels.volumeAmount} ({unitLabel})
          </label>
          <input
            style={styles.input}
            type="number"
            step="0.01"
            value={form.liters}
            onChange={(event) => onFieldChange("liters", event.target.value)}
          />
        </div>

        <div>
          <label style={styles.label}>{labels.totalPrice}</label>
          <input
            style={styles.input}
            type="number"
            step="0.01"
            value={form.totalPrice}
            onChange={(event) => onFieldChange("totalPrice", event.target.value)}
          />
        </div>

        <div>
          <label style={styles.label}>{labels.odometer}</label>
          <input
            style={styles.input}
            type="number"
            step="1"
            value={form.odometer}
            onChange={(event) => onFieldChange("odometer", event.target.value)}
          />
        </div>

        <div>
          <label style={styles.label}>{labels.station}</label>
          <input
            style={styles.input}
            type="text"
            value={form.station}
            onChange={(event) => onFieldChange("station", event.target.value)}
          />
          <div style={styles.buttonRow}>
            <button
              style={styles.button}
              type="button"
              onClick={onUseCurrentLocation}
              disabled={locationLoading}
            >
              {locationLoading ? labels.locating : labels.useCurrentLocation}
            </button>
          </div>
        </div>

        <div style={{ gridColumn: "1 / -1" }}>
          <label style={styles.label}>{labels.notes}</label>
          <input
            style={styles.input}
            type="text"
            value={form.notes}
            onChange={(event) => onFieldChange("notes", event.target.value)}
          />
        </div>

      </div>

      <div style={styles.buttonRow}>
        {voiceSupported ? (
          <button
            style={styles.button}
            type="button"
            onClick={onStartVoiceInput}
            disabled={voiceListening}
          >
            {voiceListening ? labels.listening : labels.startVoiceInput}
          </button>
        ) : null}
        <button style={styles.buttonPrimary} onClick={onSave}>
          {isEditing ? labels.updateFuelEntry : labels.saveFuelEntry}
        </button>
      </div>
      {voiceSupported ? (
        <div style={styles.subtitle}>{labels.voiceInputHint}</div>
      ) : null}
    </div>
  );
}
