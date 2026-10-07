"use client";

import { useState } from "react";
import AuthLayout from "@/components/AuthLayout";
import TextField from "@/components/TextField";
import Button from "@/components/Button";
import BackToSignIn from "@/components/BackToSignIn";
import { supabase } from "@/lib/supabase";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

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
      redirectTo: `${window.location.origin}/reset-password`,
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
            We&apos;ve sent a password reset link to
            <br />
            <strong className="text-[#243B55]">{email}</strong>
          </>
        }
        footer={<BackToSignIn />}
      >
        <span className="text-center text-sm text-muted">
          Didn&apos;t get it? Check your spam folder or
        </span>
        <Button variant="secondary" fullWidth onClick={() => setSent(false)}>
          Resend the link
        </Button>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      compact
      icon="lock_reset"
      title="Reset your password"
      subtitle="Enter your work email and we'll send you a reset link"
      footer={<BackToSignIn />}
    >
      <TextField
        label="WORK EMAIL"
        icon="mail"
        type="email"
        autoComplete="email"
        placeholder="name@hospital.org"
        value={email}
        onChange={setEmail}
        required
        error={error}
      />
      <Button onClick={handleSend} fullWidth>
        Send reset link
      </Button>
    </AuthLayout>
  );
}
