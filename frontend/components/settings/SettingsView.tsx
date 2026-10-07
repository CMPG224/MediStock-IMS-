"use client";

import { useState } from "react";
import { useProfile } from "@/components/app-shell/ProfileProvider";
import LoadError from "@/components/ui/LoadError";
import Icon from "@/components/Icon";
import Badge from "@/components/ui/Badge";
import { BTN_PRIMARY, BTN_SMALL_OUTLINE, CARD } from "@/components/ui/buttons";
import Toggle from "@/components/ui/Toggle";
import { initials } from "@/lib/format";
import { ACCENTS, DEFAULT_SETTINGS, NOTIFICATION_ITEMS, fetchSettings, saveSetting, type SettingsState, type Theme } from "@/lib/data/settings";
import { ROLE_TITLE, updateOwnName, type Profile } from "@/lib/data/users";
import { supabase } from "@/lib/supabase";
import { errorMessage, useAsync } from "@/lib/useAsync";
const THEMES: { key: Theme; label: string }[] = [
  { key: "light", label: "Light" },
  { key: "dark", label: "Dark" },
  { key: "system", label: "System" },
];
const LABEL = "text-[11px] font-semibold uppercase tracking-[.06em] text-muted";
const FIELD =
  "h-11 w-full rounded-[9px] border border-border bg-white px-3.5 text-[14px] text-ink focus:border-brand focus:outline-none";

export default function SettingsView() {
  const { profile, reload } = useProfile();
  // Remounts the form once the profile arrives so the inputs start filled.
  return profile ? <SettingsForm key={profile.id} profile={profile} reloadProfile={reload} /> : null;
}

function SettingsForm({ profile, reloadProfile }: { profile: Profile; reloadProfile: () => void }) {
  const stored = useAsync(() => fetchSettings(profile.id), [profile.id]);
  const [overrides, setOverrides] = useState<Partial<SettingsState>>({});
  const settings: SettingsState = { ...DEFAULT_SETTINGS, ...stored.data, ...overrides };
  const [prefError, setPrefError] = useState("");
  const [name, setName] = useState(profile.fullName);
  const [email, setEmail] = useState(profile.email);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const update = async <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => {
    setOverrides((o) => ({ ...o, [key]: value }));
    setPrefError("");
    try {
      await saveSetting(profile.id, key, value);
    } catch (e) {
      setOverrides((o) => ({ ...o, [key]: settings[key] }));
      setPrefError(errorMessage(e));
    }
  };

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setStatus(null);
    try {
      if (name.trim() && name.trim() !== profile.fullName) await updateOwnName(profile.id, name.trim());
      // Email lives in Supabase Auth; the change takes effect once confirmed from the inbox.
      const emailChanged = email.trim() && email.trim() !== profile.email;
      if (emailChanged) {
        const { error } = await supabase.auth.updateUser({ email: email.trim() });
        if (error) throw error;
      }
      setStatus({ ok: true, text: emailChanged ? "Saved. Check both inboxes to confirm the new email." : "Profile saved" });
      reloadProfile();
    } catch (err) {
      setStatus({ ok: false, text: errorMessage(err) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-1 items-start gap-[22px] lg:grid-cols-3">
      <form onSubmit={saveProfile} className={`${CARD} flex flex-col items-center p-7`}>
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-tint text-[28px] font-bold text-brand" aria-hidden="true">
          {initials(profile.fullName)}
        </div>
        <h2 className="mt-4 text-[19px] font-semibold text-ink">{profile.fullName}</h2>
        <p className="mt-1 text-[11.5px] uppercase tracking-[.1em] text-muted">{ROLE_TITLE[profile.role]}</p>
        <hr className="my-6 w-full border-border-soft" />
        <div className="flex w-full flex-col gap-5">
          <div className="flex flex-col gap-2">
            <label htmlFor="st-name" className={LABEL}>Full name</label>
            <input id="st-name" value={name} onChange={(e) => { setName(e.target.value); setStatus(null); }} className={FIELD} />
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="st-email" className={LABEL}>Email address</label>
            <input id="st-email" type="email" value={email} onChange={(e) => { setEmail(e.target.value); setStatus(null); }} className={FIELD} />
          </div>
          <div className="flex flex-col items-start gap-2">
            <span className={LABEL}>Role</span>
            <Badge tone="brand">{ROLE_TITLE[profile.role]}</Badge>
          </div>
          <button type="submit" disabled={saving} className={`${BTN_PRIMARY} w-full justify-center`}>
            {saving ? "Saving…" : "Save Changes"}
          </button>
          <div role="status" className="min-h-5">
            {status && (
              <p className={`flex items-center justify-center gap-1.5 text-center text-[13px] font-semibold ${status.ok ? "text-success" : "text-danger"}`}>
                {status.ok && <Icon name="check" size={15} />} {status.text}
              </p>
            )}
          </div>
        </div>
      </form>

      <div className="flex flex-col gap-[22px] lg:col-span-2">
        {(stored.error || prefError) && <LoadError message={prefError || stored.error!} onRetry={stored.error ? stored.reload : undefined} />}
        <section className={`${CARD} p-7`}>
          <h2 className="text-[20px] font-semibold text-ink">Notification Preferences</h2>
          <ul className="mt-4">
            {NOTIFICATION_ITEMS.map((n) => (
              <li key={n.key} className="flex items-center justify-between gap-4 border-b border-border-soft py-4 last:border-b-0 last:pb-0">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[14.5px] font-bold text-ink">{n.title}</span>
                  <span className="text-[13px] text-muted">{n.description}</span>
                </div>
                <Toggle label={n.title} checked={settings[n.key] as boolean} onChange={(v) => update(n.key, v)} />
              </li>
            ))}
          </ul>
        </section>

        <section className={`${CARD} p-7`}>
          <h2 className="text-[20px] font-semibold text-ink">Security</h2>
          <ul className="mt-4">
            <li className="flex items-center justify-between gap-4 border-b border-border-soft py-4">
              <div className="flex flex-col gap-0.5">
                <span className="text-[14.5px] font-bold text-ink">Password</span>
                <span className="text-[13px] text-muted">Last changed 3 months ago</span>
              </div>
              <button type="button" className={BTN_SMALL_OUTLINE}>Change Password</button>
            </li>
            <li className="flex items-center justify-between gap-4 border-b border-border-soft py-4">
              <div className="flex flex-col gap-0.5">
                <span className="text-[14.5px] font-bold text-ink">Two-Factor Authentication</span>
                <span className="text-[13px] text-muted">Add an extra layer of security to your account</span>
              </div>
              <Toggle label="Two-Factor Authentication" checked={settings.twoFactor} onChange={(v) => update("twoFactor", v)} />
            </li>
            <li className="flex items-center justify-between gap-4 pt-4">
              <div className="flex flex-col gap-0.5">
                <span className="text-[14.5px] font-bold text-ink">Active Sessions</span>
                <span className="text-[13px] text-muted">2 devices currently signed in</span>
              </div>
              <button type="button" className="text-[13px] font-bold text-brand hover:underline">Manage</button>
            </li>
          </ul>
        </section>

        <section className={`${CARD} p-7`}>
          <h2 className="text-[20px] font-semibold text-ink">Appearance</h2>
          <div className="mt-5 flex flex-col gap-3">
            <span id="theme-label" className={LABEL}>Theme</span>
            <div role="group" aria-labelledby="theme-label" className="inline-flex w-fit gap-1 rounded-xl bg-brand-tint p-1">
              {THEMES.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  aria-pressed={settings.theme === t.key}
                  onClick={() => update("theme", t.key)}
                  className={`h-9 rounded-lg px-5 text-[13.5px] ${
                    settings.theme === t.key ? "bg-white font-bold text-ink shadow-sm" : "font-medium text-body hover:text-ink"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-6 flex flex-col gap-3">
            <span id="accent-label" className={LABEL}>Accent color</span>
            <div role="radiogroup" aria-labelledby="accent-label" className="flex gap-3">
              {ACCENTS.map((a) => {
                const selected = settings.accent === a.value;
                return (
                  <button
                    key={a.value}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    aria-label={a.name}
                    onClick={() => update("accent", a.value)}
                    className={`flex h-8 w-8 items-center justify-center rounded-full p-[3px] ${selected ? "ring-2" : ""}`}
                    style={selected ? { boxShadow: `0 0 0 2px ${a.value}` } : undefined}
                  >
                    <span className="h-full w-full rounded-full border-2 border-white" style={{ background: a.value }} />
                  </button>
                );
              })}
            </div>
          </div>
          <p className="mt-5 text-[12px] text-muted">Theme and accent are saved but not applied yet.</p>
        </section>
      </div>
    </div>
  );
}
