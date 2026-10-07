"use client";

import { useState } from "react";
import AuthLayout from "../../components/AuthLayout";
import TextField from "../../components/TextField";
import Button from "../../components/Button";
import BackToSignIn from "./BackToSignIn";
import { supabase } from "../../lib/supabase";

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const [error, setError] = useState("");

    const [sent, setSent] =useState(false);

        async function handleSend() {
        // Typo check only; the server does the real validation.
        const looksLikeEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

        if (!looksLikeEmail) {
            setError("Enter a valid work email address.");
            return;
        }

        setError("");

        // Supabase reports success whether or not the email exists, so this
        // can't be used to probe for accounts.
        await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: "http://localhost:3000/reset-password",
        });

        setSent(true);
    }

    if (sent) {
        return (
            <AuthLayout
                compact
                success
                icon="mark_email_read"
                title="Check your email"
                subtitle={
                    <>
                        We've sent a password reset link to <strong>{email}</strong>
                    </>
                }
                footer={
                    <>
                        Didn't get it? Check your spam folder or{" "}
                        <button type="button" onClick={() => setSent(false)}>
                            Resend the link
                        </button>
                    </>
                }
            >
                <></>
            </AuthLayout>
        );
    }

    return (
        <AuthLayout
            icon="lock_reset"
            title="Forgot your password?"
            subtitle="Enter your work email and we'll send a reset link."
            footer={<BackToSignIn />}
        >
            <TextField
                label="Work email"
                type="email"
                value={email}
                onChange={(nextValue) => {
                    setEmail(nextValue);
                    if (error) setError("");
                }}
                error={error}
                placeholder="name@company.com"
            />

            <Button onClick={handleSend}>Send reset link</Button>
        </AuthLayout>
    );
}