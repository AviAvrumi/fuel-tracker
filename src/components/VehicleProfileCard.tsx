import { useEffect, useMemo, useState } from "react";
import type { UserSettings, VehicleFormState, VehicleRecord } from "../types/fuel";
import { styles } from "../styles/appStyles";

type VehicleProfileCardProps = {
  labels: {
    vehicleTitle: string;
    manufacturer: string;
    chooseManufacturer: string;
    model: string;
    chooseModel: string;
    year: string;
    chooseYear: string;
    licensePlate: string;
    plateLookupHint: string;
    lookupByPlate: string;
    lookingUpPlate: string;
    vehicleName: string;
    chooseVehicle: string;
    addAnotherVehicle: string;
    removeVehicle: string;
    saveVehicle: string;
    benchmarkConsumption: string;
    tankCapacity: string;
    fuelType: string;
    chooseFuelType: string;
    fuel95: string;
    fuel98: string;
    diesel: string;
    other: string;
    savedVehicleText: string;
    saveVehicleHint: string;
    language: string;
    distanceUnit: string;
    volumeUnit: string;
    currency: string;
    preferredConsumptionView: string;
    distancePerVolumeOption: string;
    volumePerHundredOption: string;
    theme: string;
    lightMode: string;
    darkMode: string;
    hebrew: string;
    english: string;
    russian: string;
    kilometer: string;
    mile: string;
    liter: string;
    gallon: string;
    shekel: string;
    dollar: string;
    ruble: string;
    euro: string;
    saveSettings: string;
  };
  settings: UserSettings;
  vehicles: VehicleRecord[];
  selectedVehicleId: string | null;
  loadingProfile: boolean;
  manufacturers: string[];
  availableModels: string[];
  availableYears: string[];
  vehicleForm: VehicleFormState;
  plateLookupLoading?: boolean;
  embedded?: boolean;
  localizeVehicleText?: (value: string) => string;
  onSelectVehicle: (vehicleId: string) => void;
  onAddNewVehicle: () => void;
  onDeleteVehicle: () => void;
  onVehicleFieldChange: (
    field:
      | "manufacturer"
      | "model"
      | "year"
      | "fuelType"
      | "licensePlate"
      | "benchmarkLitersPer100Km"
      | "tankCapacity",
    value: string
  ) => void;
  onLookupByPlate: () => void;
  onSettingsChange: (settings: UserSettings) => void;
  onSave: () => void;
};

export function VehicleProfileCard({
  labels,
  settings,
  vehicles,
  selectedVehicleId,
  loadingProfile,
  manufacturers,
  availableModels,
  availableYears,
  vehicleForm,
  plateLookupLoading = false,
  embedded = false,
  localizeVehicleText,
  onSelectVehicle,
  onAddNewVehicle,
  onDeleteVehicle,
  onVehicleFieldChange,
  onLookupByPlate,
  onSettingsChange,
  onSave,
}: VehicleProfileCardProps) {
  const [showManufacturerOptions, setShowManufacturerOptions] = useState(false);
  const manufacturerOptions = useMemo(
    () =>
      manufacturers.map((manufacturer) => ({
        raw: manufacturer,
        label: localizeVehicleText
          ? localizeVehicleText(manufacturer)
          : manufacturer,
      })),
    [manufacturers, localizeVehicleText]
  );

  const [manufacturerInput, setManufacturerInput] = useState(() => {
    if (!vehicleForm.manufacturer) return "";
    return localizeVehicleText
      ? localizeVehicleText(vehicleForm.manufacturer)
      : vehicleForm.manufacturer;
  });

  useEffect(() => {
    if (!vehicleForm.manufacturer) {
      setManufacturerInput("");
      return;
    }

    setManufacturerInput(
      localizeVehicleText
        ? localizeVehicleText(vehicleForm.manufacturer)
        : vehicleForm.manufacturer
    );
  }, [vehicleForm.manufacturer, localizeVehicleText]);

  function resolveManufacturerInput(inputValue: string) {
    const normalized = inputValue.trim().toLowerCase();
    if (!normalized) return null;

    const exactMatch = manufacturerOptions.find(
      (option) =>
        option.raw.toLowerCase() === normalized ||
        option.label.toLowerCase() === normalized
    );

    return exactMatch?.raw ?? null;
  }

  const filteredManufacturerOptions = useMemo(() => {
    const normalized = manufacturerInput.trim().toLowerCase();
    if (!normalized) return manufacturerOptions;
    return manufacturerOptions.filter(
      (option) =>
        option.raw.toLowerCase().includes(normalized) ||
        option.label.toLowerCase().includes(normalized)
    );
  }, [manufacturerInput, manufacturerOptions]);

  function selectManufacturer(rawValue: string) {
    const selected = manufacturerOptions.find((option) => option.raw === rawValue);
    if (!selected) return;

    setManufacturerInput(selected.label);
    setShowManufacturerOptions(false);
    if (rawValue !== vehicleForm.manufacturer) {
      onVehicleFieldChange("manufacturer", rawValue);
      if (vehicleForm.model) {
        onVehicleFieldChange("model", "");
      }
    }
  }

  function handleManufacturerChange(inputValue: string) {
    setManufacturerInput(inputValue);
    setShowManufacturerOptions(true);
    const matchedRaw = resolveManufacturerInput(inputValue);

    if (!inputValue.trim()) {
      if (vehicleForm.manufacturer) {
        onVehicleFieldChange("manufacturer", "");
      }
      if (vehicleForm.model) {
        onVehicleFieldChange("model", "");
      }
      return;
    }

    if (!matchedRaw || matchedRaw === vehicleForm.manufacturer) {
      return;
    }

    onVehicleFieldChange("manufacturer", matchedRaw);
    if (vehicleForm.model) {
      onVehicleFieldChange("model", "");
    }
  }

  return (
    <div style={embedded ? styles.sheetContent : styles.card}>
      {!embedded ? <h2 style={styles.sectionTitle}>{labels.vehicleTitle}</h2> : null}

      {loadingProfile ? (
        <div>{labels.saveSettings}</div>
      ) : (
        <>
          <div style={styles.formGrid}>
            <div>
              <label style={styles.label}>{labels.vehicleName}</label>
              <select
                style={styles.input}
                value={selectedVehicleId ?? ""}
                onChange={(event) => onSelectVehicle(event.target.value)}
              >
                <option value="">{labels.chooseVehicle}</option>
                {vehicles.map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {localizeVehicleText
                      ? localizeVehicleText(vehicle.manufacturer)
                      : vehicle.manufacturer}{" "}
                    {localizeVehicleText
                      ? localizeVehicleText(vehicle.model)
                      : vehicle.model}{" "}
                    {vehicle.year}
                  </option>
                ))}
              </select>
            </div>

            <div style={styles.buttonRow}>
              <button style={styles.button} onClick={onAddNewVehicle}>
                {labels.addAnotherVehicle}
              </button>
              <button style={styles.buttonDanger} onClick={onDeleteVehicle}>
                {labels.removeVehicle}
              </button>
            </div>
          </div>

          <div style={styles.compactGridThree}>
            <div style={styles.compactControl}>
              <label style={styles.compactLabel}>{labels.licensePlate}</label>
              <input
                style={styles.compactInput}
                type="text"
                inputMode="numeric"
                value={vehicleForm.licensePlate ?? ""}
                onChange={(event) =>
                  onVehicleFieldChange("licensePlate", event.target.value)
                }
                placeholder={labels.plateLookupHint}
              />
              <div style={styles.buttonRow}>
                <button
                  type="button"
                  style={styles.button}
                  onClick={onLookupByPlate}
                  disabled={plateLookupLoading}
                >
                  {plateLookupLoading ? labels.lookingUpPlate : labels.lookupByPlate}
                </button>
              </div>
            </div>

            <div style={styles.compactControl}>
              <label style={styles.compactLabel}>{labels.manufacturer}</label>
              <input
                style={styles.compactInput}
                type="text"
                value={manufacturerInput}
                onChange={(event) => handleManufacturerChange(event.target.value)}
                onFocus={() => setShowManufacturerOptions(true)}
                onBlur={() => {
                  window.setTimeout(() => {
                    setShowManufacturerOptions(false);
                  }, 120);
                }}
                placeholder={labels.chooseManufacturer}
                inputMode="text"
                autoComplete="off"
              />
              {showManufacturerOptions ? (
                <div style={styles.suggestList}>
                  {filteredManufacturerOptions.slice(0, 30).map((option) => (
                    <button
                      key={option.raw}
                      type="button"
                      style={styles.suggestOption}
                      onMouseDown={(event) => {
                        event.preventDefault();
                        selectManufacturer(option.raw);
                      }}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <div style={styles.compactControl}>
              <label style={styles.compactLabel}>{labels.model}</label>
              <input
                style={styles.compactInput}
                type="text"
                list="model-options"
                value={vehicleForm.model}
                onChange={(event) =>
                  onVehicleFieldChange("model", event.target.value)
                }
                disabled={!vehicleForm.manufacturer}
                placeholder={labels.chooseModel}
                autoComplete="off"
              />
              <datalist id="model-options">
                {availableModels.map((model) => (
                  <option key={model} value={model}>
                    {localizeVehicleText ? localizeVehicleText(model) : model}
                  </option>
                ))}
              </datalist>
            </div>

            <div style={styles.compactControl}>
              <label style={styles.compactLabel}>{labels.year}</label>
              <select
                style={styles.compactInput}
                value={vehicleForm.year}
                onChange={(event) => onVehicleFieldChange("year", event.target.value)}
              >
                <option value="">{labels.chooseYear}</option>
                {availableYears.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>

            <div style={styles.compactControl}>
              <label style={styles.compactLabel}>{labels.fuelType}</label>
              <select
                style={styles.compactInput}
                value={vehicleForm.fuelType}
                onChange={(event) =>
                  onVehicleFieldChange("fuelType", event.target.value)
                }
              >
                <option value="">{labels.chooseFuelType}</option>
                <option value="fuel95">{labels.fuel95}</option>
                <option value="fuel98">{labels.fuel98}</option>
                <option value="diesel">{labels.diesel}</option>
                <option value="other">{labels.other}</option>
              </select>
            </div>
          </div>

          <div style={styles.compactGridThree}>
            <div style={styles.compactControl}>
              <label style={styles.compactLabel}>{labels.theme}</label>
              <select
                style={styles.compactInput}
                value={settings.theme}
                onChange={(event) =>
                  onSettingsChange({
                    ...settings,
                    theme: event.target.value as UserSettings["theme"],
                  })
                }
              >
                <option value="light">{labels.lightMode}</option>
                <option value="dark">{labels.darkMode}</option>
              </select>
            </div>

            <div style={styles.compactControl}>
              <label style={styles.compactLabel}>{labels.language}</label>
              <select
                style={styles.compactInput}
                value={settings.language}
                onChange={(event) =>
                  onSettingsChange({
                    ...settings,
                    language: event.target.value as UserSettings["language"],
                  })
                }
              >
                <option value="he">{labels.hebrew}</option>
                <option value="en">{labels.english}</option>
                <option value="ru">{labels.russian}</option>
              </select>
            </div>

            <div style={styles.compactControl}>
              <label style={styles.compactLabel}>{labels.distanceUnit}</label>
              <select
                style={styles.compactInput}
                value={settings.distanceUnit}
                onChange={(event) =>
                  onSettingsChange({
                    ...settings,
                    distanceUnit: event.target.value as UserSettings["distanceUnit"],
                  })
                }
              >
                <option value="km">{labels.kilometer}</option>
                <option value="mi">{labels.mile}</option>
              </select>
            </div>

            <div style={styles.compactControl}>
              <label style={styles.compactLabel}>{labels.volumeUnit}</label>
              <select
                style={styles.compactInput}
                value={settings.volumeUnit}
                onChange={(event) =>
                  onSettingsChange({
                    ...settings,
                    volumeUnit: event.target.value as UserSettings["volumeUnit"],
                  })
                }
              >
                <option value="l">{labels.liter}</option>
                <option value="gal">{labels.gallon}</option>
              </select>
            </div>

            <div style={styles.compactControl}>
              <label style={styles.compactLabel}>{labels.currency}</label>
              <select
                style={styles.compactInput}
                value={settings.currency}
                onChange={(event) =>
                  onSettingsChange({
                    ...settings,
                    currency: event.target.value as UserSettings["currency"],
                  })
                }
              >
                <option value="ILS">{labels.shekel}</option>
                <option value="USD">{labels.dollar}</option>
                <option value="RUB">{labels.ruble}</option>
                <option value="EUR">{labels.euro}</option>
              </select>
            </div>
          </div>

          <div style={styles.compactGridThree}>
            <div style={styles.compactControl}>
              <label style={styles.compactLabel}>{labels.benchmarkConsumption}</label>
              <input
                style={styles.compactInput}
                type="number"
                step="0.1"
                value={vehicleForm.benchmarkLitersPer100Km ?? ""}
                onChange={(event) =>
                  onVehicleFieldChange(
                    "benchmarkLitersPer100Km",
                    event.target.value
                  )
                }
              />
            </div>

            <div style={styles.compactControl}>
              <label style={styles.compactLabel}>{labels.tankCapacity}</label>
              <input
                style={styles.compactInput}
                type="number"
                step="0.1"
                value={vehicleForm.tankCapacity ?? ""}
                onChange={(event) =>
                  onVehicleFieldChange("tankCapacity", event.target.value)
                }
              />
            </div>

            <div style={styles.compactControl}>
              <label style={styles.compactLabel}>{labels.preferredConsumptionView}</label>
              <select
                style={styles.compactInput}
                value={settings.consumptionView}
                onChange={(event) =>
                  onSettingsChange({
                    ...settings,
                    consumptionView:
                      event.target.value as UserSettings["consumptionView"],
                  })
                }
              >
                <option value="distance_per_volume">
                  {labels.distancePerVolumeOption}
                </option>
                <option value="volume_per_100_distance">
                  {labels.volumePerHundredOption}
                </option>
              </select>
            </div>
          </div>

          <div style={styles.buttonRow}>
            <button style={styles.buttonPrimary} onClick={onSave}>
              {labels.saveVehicle}
            </button>
          </div>

          {vehicles.length > 0 ? (
            <div style={styles.vehicleBox}>{labels.savedVehicleText}</div>
          ) : (
            <div style={styles.vehicleBox}>{labels.saveVehicleHint}</div>
          )}
        </>
      )}
    </div>
  );
}
