"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AuthLayout from "@/components/AuthLayout";
import TextField from "@/components/TextField";
import Button from "@/components/Button";
import BackToSignIn from "@/components/BackToSignIn";
import { DEACTIVATED_MESSAGE, enforceActiveAccount, recordSignIn } from "@/lib/data/users";
import { supabase } from "@/lib/supabase";

export default function HospitalPortalPage() {
  const [facilityCode, setFacilityCode] = useState("");
  const [staffId, setStaffId] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleContinue() {
    if (!facilityCode.trim() || !staffId.trim()) {
      setError("Facility code and staff ID are both required.");
      return;
    }
    setError("");

    // See supabase/functions/hospital-login.
    const { data, error: fnError } = await supabase.functions.invoke("hospital-login", {
      body: { facility_code: facilityCode, staff_id: staffId },
    });
    if (fnError || !data?.access_token) {
      setError("No account matches that facility code and staff ID.");
      return;
    }

    // Hand the returned tokens to the browser client to actually sign in.
    await supabase.auth.setSession({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
    });
    if (!(await enforceActiveAccount())) {
      setError(DEACTIVATED_MESSAGE);
      return;
    }
    await recordSignIn();
    router.push("/dashboard");
  }

  return (
    <AuthLayout
      compact
      icon="badge"
      title="Hospital Portal Sign-In"
      subtitle="Authenticate using your facility's identity system"
      footer={<BackToSignIn />}
    >
      <TextField
        label="FACILITY CODE"
        icon="domain"
        placeholder="e.g. WC-GEN-014"
        value={facilityCode}
        onChange={setFacilityCode}
        required
      />
      <TextField
        label="STAFF ID"
        icon="badge"
        placeholder="Staff / employee number"
        value={staffId}
        onChange={setStaffId}
        required
        // One error message serves both fields, so only attach it once.
        error={error}
      />
      <Button onClick={handleContinue} fullWidth>
        Continue
      </Button>
    </AuthLayout>
  );
}
