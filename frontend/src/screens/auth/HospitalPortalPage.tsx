"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AuthLayout from "../../components/AuthLayout";
import TextField from "../../components/TextField";
import Button from "../../components/Button";
import BackToSignIn from "./BackToSignIn";

export default function HospitalPortalPage() {
    const [facilityCode, setFacilityCode] = useState("");
    const [staffId,setStaffId] = useState("");
    const [error, setError] = useState("");
    const router = useRouter();

    function handleContinue() {
        if (!facilityCode.trim() || !staffId.trim()) {
            setError("Facility code and staff ID are both required.");
            return;
        }

        setError("");
        router.push("/dashboard");
    }

    return (
        <AuthLayout
            compact
            icon="badge"
            title="Hospital Portal Sign-In"
            subtitle="Authenticate using your facility’s identity system"
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
                label="STAFFID"
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