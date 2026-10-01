import { useState } from "react";
import AuthLayout from "../../components/AuthLayout";
import TextField from "../../components/TextField";
import Button from "../../components/Button";
import BackToSignIn from "./BackToSignIn";

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const [error, setError] = useState("");

    // One page, two views. ‘sent‘decides which one renders.
    const [sent, setSent] =useState(false);

    function handleSend() {
        // A very light email check: something, then @, then something, a dot,
        // then something.Enough to catch typos; the server does the real check.
        const looksLikeEmail = /^[^\s@]+@[^\s@]+\\.[^\s@]+$/.test(email.trim());

        if (!looksLikeEmail) {
            setError("Enter a valid work email address.");
            return;
        }

        setError("");
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
            />
        );
    }

    return (
        <AuthLayout
            title="Forgot your password?"
            subtitle="Enter your work email and we'll send a reset link."
            footer={<BackToSignIn />}
        >
            <TextField
                label="Work email"
                type="email"
                value={email}
                onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError("");
                }}
                error={error}
                placeholder="name@company.com"
            />

            <Button onClick={handleSend}>Send reset link</Button>
        </AuthLayout>
    );
}