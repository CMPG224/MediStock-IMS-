import { useState } from "react";
import { useNavigate} from"react-router-dom";
import AuthLayout from "../../components/AuthLayout";
import TextField from "../../components/TextField";
import Button from "../../components/Button";
import Icon from "../../components/Icon";
import BackToSignIn from "./BackToSignIn";
import styles from "./LoginPage.module.css";

export default function SsoPage() {
    const [domain, setDomain] = useState("");
    const [error, setError] = useState("");
    const navigate = useNavigate();

    function handleContinue() {
        if (!domain.trim()) {
            setError("Enter your organisation domain.");
            return;
        }

        setError("");
        navigate("/dashboard");
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

            <div className={styles.divider}>
                <span className={styles.dividerText}>OR</span>
            </div>

            <Button variant="secondary" fullWidth>
                <Icon name="key"size={18} color="var(--c-brand)" /> Use a security key
            </Button>

            <Button variant="secondary" fullWidth>
                <Icon name="smartphone" size={18} color="var(--c-brand)" /> Approve on mobile
                device
            </Button>
        </AuthLayout>
    );
}