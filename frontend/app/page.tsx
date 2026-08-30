"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AuthLayout from "@/components/AuthLayout";
import TextField from "@/components/TextField";
import Button from "@/components/Button";
import Icon from "@/components/Icon";


export default function LoginPage() {
  // --- State -------------------------------------------------------------
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [remember, setRemember] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  const router = useRouter();

  // --- Actions -------------------------------------------------------------
  function handleSignIn() {
    // Validate before doing anything. Never let an empty form through.
    if (!email.trim() || !password.trim()) {
      setError("Enter your work email and password.");
      return;
    }
    setError("");
    // A real app would call the server here. For now, go to the dashboard.
    router.push("/dashboard");
  }

  return (
    <AuthLayout
      decorated
      icon="medical_services"
      title="Welcome to MediStock IMS"
      subtitle="Secure Inventory Management for Health Professionals"
      footer={
        <div className="mt-6 flex flex-col items-center gap-[7px] text-2xs text-muted">
          <span>&copy; 2026 MediStock IMS v2.4.1</span>
          <div className="flex items-center gap-3">
            <Link href="/legal/privacy" className="text-muted hover:underline">
              Privacy Policy
            </Link>
            <span className="h-1 w-1 rounded-full bg-[#98A4B4]" aria-hidden="true" />
            <Link href="/legal/terms" className="text-muted hover:underline">
              Terms of Service
            </Link>
            <span className="h-1 w-1 rounded-full bg-[#98A4B4]" aria-hidden="true" />
            <Link href="/legal/support" className="text-muted hover:underline">
              Technical Support
            </Link>
          </div>
        </div>
      }
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
      />

      <TextField
        label="PASSWORD"
        icon="lock"
        // Swapping the type between "password" and "text" is the whole
        // show/hide feature. The value never changes, only how it renders.
        type={showPassword ? "text" : "password"}
        autoComplete="current-password"
        placeholder="••••••••"
        value={password}
        onChange={setPassword}
        required
        labelAction={
          <Link href="/forgot-password" className="text-2xs font-bold text-brand hover:underline">
            Forgot Password?
          </Link>
        }
        trailing={
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="flex cursor-pointer border-none bg-transparent p-1 text-muted hover:text-brand"
            aria-label={showPassword ? "Hide password" : "Show password"}
            aria-pressed={showPassword}
          >
            <Icon name={showPassword ? "visibility_off" : "visibility"} />
          </button>
        }
      />

      <label className="flex cursor-pointer items-center gap-3 text-[12.5px] font-semibold text-[#344054]">
        <input
          type="checkbox"
          checked={remember}
          onChange={(event) => setRemember(event.target.checked)}
          className="h-4 w-4 accent-brand"
        />
        Remember this device for 30 days
      </label>

      {error && (
        <span role="alert" className="text-sm font-semibold text-danger">
          {error}
        </span>
      )}

      <Button onClick={handleSignIn} fullWidth>
        Sign In <Icon name="arrow_forward" />
      </Button>

      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border-soft" />
        <span className="text-[10.5px] font-bold tracking-[.1em] text-muted">
          EXTERNAL AUTHENTICATION
        </span>
        <div className="h-px flex-1 bg-border-soft" />
      </div>

      <div className="flex gap-3">
        <Button variant="secondary" className="flex-1" onClick={() => router.push("/hospital-portal")}>
          <Icon name="badge" size={18} className="text-brand" /> Hospital Portal
        </Button>
        <Button variant="secondary" className="flex-1" onClick={() => router.push("/sso")}>
          <Icon name="verified_user" size={18} className="text-brand" /> Single Sign-On
        </Button>
      </div>
    </AuthLayout>
  );
}
