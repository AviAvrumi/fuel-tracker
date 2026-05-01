import type { CSSProperties } from "react";
import type { AuthMode } from "../types/fuel";
import { styles } from "../styles/appStyles";

type AuthLabels = {
  loginTitle: string;
  loginSubtitle: string;
  login: string;
  signup: string;
  createUser: string;
  email: string;
  password: string;
  googleLogin: string;
  backToDemo?: string;
};

type AuthScreenProps = {
  authMode: AuthMode;
  dir: "rtl" | "ltr";
  email: string;
  password: string;
  labels: AuthLabels;
  onAuthModeChange: (mode: AuthMode) => void;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: () => void;
  onGoogleLogin: () => void;
  onBackToDemo?: () => void;
  themeStyle?: CSSProperties;
};

export function AuthScreen({
  authMode,
  dir,
  email,
  password,
  labels,
  onAuthModeChange,
  onEmailChange,
  onPasswordChange,
  onSubmit,
  onGoogleLogin,
  onBackToDemo,
  themeStyle,
}: AuthScreenProps) {
  return (
    <div style={{ ...styles.page, ...(themeStyle ?? {}) }} dir={dir}>
      <div style={styles.authCard}>
        {onBackToDemo ? (
          <div style={{ marginBottom: "12px" }}>
            <button style={styles.button} onClick={onBackToDemo}>
              {labels.backToDemo ?? "Back to demo"}
            </button>
          </div>
        ) : null}
        <h1 style={styles.title}>{labels.loginTitle}</h1>
        <p style={styles.subtitle}>{labels.loginSubtitle}</p>

        <div style={styles.authTabs}>
          <button
            style={authMode === "login" ? styles.buttonPrimary : styles.button}
            onClick={() => onAuthModeChange("login")}
          >
            {labels.login}
          </button>
          <button
            style={authMode === "signup" ? styles.buttonPrimary : styles.button}
            onClick={() => onAuthModeChange("signup")}
          >
            {labels.signup}
          </button>
        </div>

        <div style={styles.formGrid}>
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={styles.label}>{labels.email}</label>
            <input
              style={styles.input}
              type="email"
              value={email}
              onChange={(event) => onEmailChange(event.target.value)}
            />
          </div>

          <div style={{ gridColumn: "1 / -1" }}>
            <label style={styles.label}>{labels.password}</label>
            <input
              style={styles.input}
              type="password"
              value={password}
              onChange={(event) => onPasswordChange(event.target.value)}
            />
          </div>
        </div>

        <button style={styles.buttonPrimary} onClick={onSubmit}>
          {authMode === "signup" ? labels.createUser : labels.login}
        </button>

        <div style={{ marginTop: "12px" }}>
          <button style={styles.button} onClick={onGoogleLogin}>
            {labels.googleLogin}
          </button>
        </div>
      </div>
    </div>
  );
}
