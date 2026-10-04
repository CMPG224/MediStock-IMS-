import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "../../components/AuthLayout";
import TextField from "../../components/TextField";
import Button from "../../components/Button";
import Icon from "../../components/Icon";
import styles from "./LoginPage.module.css";

export default function LoginPage() {
    //--- State--------------------------------------------------------------
    // useState gives a component memory. Each call returns the currentvalue
    // and a function to change it. Changing it re-renders the component.
    //
    // useState\<string>("") says "this holds a string, starting empty".
    const [email, setEmail] = useState<string>("");
    const [password, setPassword] = useState<string>("");
    const [remember, setRemember] = useState<boolean>(false);
    const [showPassword, setShowPassword] = useState<boolean>(false);
    const [error, setError] = useState<string>("");

    // useNavigate gives usa function to move to another route in code, as
    // opposed to \<Link> whichtheuser clicks.
    const navigate = useNavigate();

    //--- Actions--------------------------------------------------------------
    function handleSignIn() {
        // Validate before doing anything. Never let an empty form through.
        if (!email.trim() || !password.trim()) {
            setError("Enter your work email and password.");
            return;
        }

        setError("");

        // A real app would call the server here. For now, go to the dashboard.
        navigate("/dashboard");
    }

    return (
        <AuthLayout
            decorated
            icon="medical_services"
            title="Welcome to MediStock IMS"
            subtitle="Secure Inventory ManagementforHealth Professionals"
            footer={
                <div className={styles.footer}>
                    <span>&copy;2026 MediStock IMS v2.4.1</span>
                    \<div className={styles.footerLinks}>
                        <Link to="/legal/privacy">Privacy Policy</Link>
                        \<span className={styles.dot} aria-hidden="true" />
                        <Link to="/legal/terms">Terms of Service</Link>
                        \<span className={styles.dot} aria-hidden="true" />
                        <Link to="/legal/support">Technical Support</Link>
                    \</div>
                \</div>
            }
        >
            \<TextField
                label="WORK EMAIL"
                icon="mail"
                type="email"
                autoComplete="email"
                placeholder="name@hospital.org"
                value={email}
                onChange={setEmail}
                required
            />
            \<TextField
                label="PASSWORD"
                icon="lock"
                // Swapping the type between "password" and "text" is the whole
                // show/hide feature. The value never changes, only how it renders.
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="********"
                value={password}
                onChange={setPassword}
                required
                labelAction={
                    <Link to="/forgot-password" className={styles.forgotLink}>
                        Forgot Password?
                    </Link>
                }
                trailing={
                    <button
                        type="button"
                        className={styles.pwToggle}
                        onClick={()=>setShowPassword(!showPassword)}
                        // The button has no text, only a hidden icon, so without
                        // aria-label a screenreader announces "button" and nothing else.
                        aria-label={showPassword ? "Hide password": "Show password"}
                        // aria-pressed turns it into a toggle: assistive tech reports
                        // whether it is currently on or off.
                    >
                        <Icon name={showPassword ? "visibility_off" : "visibility"} />
                    </button>
                }
            />

            {/* Wrapping the checkbox in its own <label> means the text is clickable
            and is read as the checkbox's name. No htmlFor needed this way. */}
            <label className={styles.remember}>
                <input
                    type="checkbox"
                    checked={remember}
                    onChange={(event) => setRemember(event.target.checked)}
                />
                Remember this device for 30 days
            </label>

            {error && (
                <span
                    role="alert"
                    style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: "var(--c-danger)",
                    }}
                >
                    {error}
                </span>
            )}

            <Button onClick={handleSignIn} fullWidth>
                Sign In <Icon name="arrow_forward" />
            </Button>

            <div className={styles.divider}>
                <span className={styles.dividerText}>EXTERNAL AUTHENTICATION</span>
            </div>

            <div className={styles.altRow}>
                <Button
                    variant="secondary"
                    onClick={() => navigate("/hospital-portal")}
                >
                    <Icon name="badge" size={18} color="var(--c-brand)" /> Hospital Portal
                </Button>

                <Button
                    variant="secondary"
                    onClick={() => navigate("/sso")}
                >
                    <Icon name="verified_user" size={18} color="var(--c-brand)" /> Single Sign-On
                </Button>
            </div>
        </AuthLayout>
    );
}