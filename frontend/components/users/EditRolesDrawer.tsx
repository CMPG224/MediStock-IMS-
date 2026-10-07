"use client";

import { useState } from "react";
import Icon from "@/components/Icon";
import { BTN_OUTLINE, BTN_PRIMARY } from "@/components/ui/buttons";
import Modal from "@/components/ui/Modal";
import { PERMISSION_OPTIONS, ROLE_OPTIONS, type Permission, type UserRole, type UserRow } from "@/lib/data/users";

/** Mounted only while a user is selected (parent passes key=user.id), so the
 * initial state always reflects that user. */
export default function EditRolesDrawer({
  user,
  onClose,
  onSave,
}: {
  user: UserRow;
  onClose: () => void;
  onSave: (role: UserRole, permissions: Permission[]) => void;
}) {
  const [role, setRole] = useState<UserRole>(user.role);
  const [perms, setPerms] = useState<Permission[]>(user.permissions);

  const togglePerm = (p: Permission) => setPerms((cur) => (cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p]));

  return (
    <Modal
      open
      variant="drawer"
      onClose={onClose}
      title="Edit User Roles"
      subtitle={`Adjust permissions for ${user.name}`}
      footer={
        <div className="grid grid-cols-2 gap-3">
          <button type="button" className={`${BTN_OUTLINE} justify-center !border-border !text-ink`} onClick={onClose}>
            Cancel
          </button>
          <button type="button" className={`${BTN_PRIMARY} justify-center !rounded-[9px]`} onClick={() => onSave(role, perms)}>
            Save Changes
          </button>
        </div>
      }
    >
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-3 text-[15px] font-semibold text-brand">Primary Role</legend>
        {ROLE_OPTIONS.map((o) => {
          const selected = role === o.value;
          return (
            <label
              key={o.value}
              className={`relative flex cursor-pointer items-start justify-between gap-3 rounded-xl border-2 p-4 focus-within:outline focus-within:outline-2 focus-within:outline-brand ${
                selected ? "border-brand bg-brand-tint" : "border-border-soft bg-white hover:bg-page"
              }`}
            >
              <input
                type="radio"
                name="primary-role"
                value={o.value}
                checked={selected}
                onChange={() => setRole(o.value)}
                className="sr-only"
              />
              <span className="flex flex-col gap-1">
                <span className="text-[15px] font-bold text-ink">{o.title}</span>
                <span className="text-[13.5px] leading-snug text-body">{o.description}</span>
              </span>
              <span
                aria-hidden="true"
                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                  selected ? "border-brand bg-brand text-white" : "border-[#C4CCD8] bg-white"
                }`}
              >
                {selected && <Icon name="check" size={12} />}
              </span>
            </label>
          );
        })}
      </fieldset>

      <fieldset className="mt-7 flex flex-col gap-3">
        <legend className="mb-3 text-[15px] font-semibold text-brand">Fine-grained Permissions</legend>
        {PERMISSION_OPTIONS.map((o) => {
          const checked = perms.includes(o.value);
          return (
            <label
              key={o.value}
              className="flex cursor-pointer items-center justify-between gap-3 rounded-xl bg-brand-tint p-4 focus-within:outline focus-within:outline-2 focus-within:outline-brand"
            >
              <span className="flex flex-col gap-0.5">
                <span className="text-[14.5px] font-bold text-ink">{o.title}</span>
                <span className="text-[13.5px] text-body">{o.description}</span>
              </span>
              <input type="checkbox" checked={checked} onChange={() => togglePerm(o.value)} className="sr-only" />
              <span
                aria-hidden="true"
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 ${
                  checked ? "border-brand bg-brand text-white" : "border-[#C4CCD8] bg-white"
                }`}
              >
                {checked && <Icon name="check" size={13} />}
              </span>
            </label>
          );
        })}
      </fieldset>
    </Modal>
  );
}
