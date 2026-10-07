"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AuthLayout from "@/components/AuthLayout";
import TextField from "@/components/TextField";
import Button from "@/components/Button";
import Icon from "@/components/Icon";
import BackToSignIn from "@/components/BackToSignIn";

export default function SsoPage() {
  const [domain, setDomain] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  function handleContinue() {
    if (!domain.trim()) {
      setError("Enter your organisation domain.");
      return;
    }
    setError("");
    router.push("/dashboard");
  }

  return (
    <AuthLayout
      compact
      icon="verified_user"
      title="Single Sign-On"
      subtitle="Enter your organisation domain to continue"
      footer={<BackToSignIn />}
    >
      <TextField
        label="ORGANISATION DOMAIN"
        icon="alternate_email"
        placeholder="yourhospital.org"
        value={domain}
        onChange={setDomain}
        required
        error={error}
      />
      <Button onClick={handleContinue} fullWidth>
        Continue with SSO
      </Button>

      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border-soft" />
        <span className="text-[10.5px] font-bold tracking-[.1em] text-muted">OR</span>
        <div className="h-px flex-1 bg-border-soft" />
      </div>

      <Button variant="secondary" fullWidth>
        <Icon name="key" size={18} className="text-brand" /> Use a security key
      </Button>
      <Button variant="secondary" fullWidth>
        <Icon name="smartphone" size={18} className="text-brand" /> Approve on mobile device
      </Button>
    </AuthLayout>
  );
}
