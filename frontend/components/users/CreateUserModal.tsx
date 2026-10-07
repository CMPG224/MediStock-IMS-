"use client";

import { useState } from "react";
import { BTN_OUTLINE, BTN_PRIMARY } from "@/components/ui/buttons";
import Modal from "@/components/ui/Modal";
import { ROLE_OPTIONS, inviteUser, type UserRole } from "@/lib/data/users";
import { errorMessage } from "@/lib/useAsync";

const FIELD =
  "h-11 w-full rounded-[9px] border border-border bg-white px-3.5 text-[14px] text-ink focus:border-brand focus:outline-none aria-[invalid=true]:border-danger";

export default function CreateUserModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UserRole>("pharmacist");
  const [errors, setErrors] = useState<{ name?: string; email?: string; save?: string }>({});
  const [saving, setSaving] = useState(false);

  const close = () => {
    setName("");
    setEmail("");
    setRole("pharmacist");
    setErrors({});
    onClose();
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    const next: typeof errors = {};
    if (!name.trim()) next.name = "Full name is required.";
    if (!email.trim()) next.email = "Email is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) next.email = "Enter a valid email address.";
    setErrors(next);
    if (next.name || next.email) return;
    setSaving(true);
    try {
      await inviteUser({ fullName: name.trim(), email: email.trim(), role });
    } catch (err) {
      setErrors({ save: errorMessage(err) });
      return;
    } finally {
      setSaving(false);
    }
    onCreated();
    close();
  };

  return (
    <Modal open={open} onClose={close} title="Create New User" subtitle="Invite a teammate to MediStock IMS.">
      <form onSubmit={submit} noValidate aria-busy={saving} className="flex flex-col gap-5" id="create-user-form">
        {errors.save && (
          <p role="alert" className="rounded-[9px] border border-[#F7C6C1] bg-[#FDEDEB] px-3.5 py-2.5 text-[13px] font-medium text-danger">
            {errors.save}
          </p>
        )}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="cu-name" className="text-[13px] font-semibold text-ink">Full name *</label>
          <input
            id="cu-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? "cu-name-err" : undefined}
            className={FIELD}
          />
          {errors.name && <p id="cu-name-err" className="text-[12.5px] text-danger">{errors.name}</p>}
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="cu-email" className="text-[13px] font-semibold text-ink">Email *</label>
          <input
            id="cu-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? "cu-email-err" : undefined}
            className={FIELD}
          />
          {errors.email && <p id="cu-email-err" className="text-[12.5px] text-danger">{errors.email}</p>}
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="cu-role" className="text-[13px] font-semibold text-ink">Role</label>
          <select id="cu-role" value={role} onChange={(e) => setRole(e.target.value as UserRole)} className={FIELD}>
            {ROLE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.title}</option>
            ))}
          </select>
        </div>
        <div className="mt-2 flex justify-end gap-3">
          <button type="button" className={`${BTN_OUTLINE} !border-border !text-ink`} onClick={close}>Cancel</button>
          <button type="submit" disabled={saving} className={BTN_PRIMARY}>{saving ? "Sending invite…" : "Create User"}</button>
        </div>
      </form>
    </Modal>
  );
}
