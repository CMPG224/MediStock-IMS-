"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AuthLayout from "../../components/AuthLayout";
import TextField from "../../components/TextField";
import Button from "../../components/Button";
import Icon from "../../components/Icon";
import styles from "./LoginPage.module.css";
import { supabase } from "../../lib/supabase";

export default function LoginPage() {
    const [email, setEmail] = useState<string>("");
    const [password, setPassword] = useState<string>("");
    const [remember, setRemember] = useState<boolean>(false);
    const [showPassword, setShowPassword] = useState<boolean>(false);
    const [error, setError] = useState<string>("");

    const router = useRouter();

        async function handleSignIn() {
        if (!email.trim() || !password.trim()) {
            setError("Enter your work email and password.");
            return;
        }

        setError("");

        const { error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (signInError) {
            setError("Incorrect email or password.");
            return;
        }

        router.push("/dashboard");
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
                    <div className={styles.footerLinks}>
                        <Link href="/legal/privacy">Privacy Policy</Link>
                        <span className={styles.dot} aria-hidden="true" />
                        <Link href="/legal/terms">Terms of Service</Link>
                        <span className={styles.dot} aria-hidden="true" />
                        <Link href="/legal/support">Technical Support</Link>
                    </div>
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
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="********"
                value={password}
                onChange={setPassword}
                required
                labelAction={
                    <Link href="/forgot-password" className={styles.forgotLink}>
                        Forgot Password?
                    </Link>
                }
                trailing={
                    <button
                        type="button"
                        className={styles.pwToggle}
                        onClick={()=>setShowPassword(!showPassword)}
                        aria-label={showPassword ? "Hide password": "Show password"}
                    >
                        <Icon name={showPassword ? "visibility_off" : "visibility"} />
                    </button>
                }
            />

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
                    onClick={() => router.push("/hospital-portal")}
                >
                    <Icon name="badge" size={18} color="var(--c-brand)" /> Hospital Portal
                </Button>

                <Button
                    variant="secondary"
                    onClick={() => router.push("/sso")}
                >
                    <Icon name="verified_user" size={18} color="var(--c-brand)" /> Single Sign-On
                </Button>
            </div>
        </AuthLayout>
    );
}