"use client";

import { useState } from "react";
import Icon from "@/components/Icon";
import Modal from "@/components/ui/Modal";
import { BTN_PRIMARY, BTN_SMALL_OUTLINE } from "@/components/ui/buttons";
import FormField, { INPUT_BASE, inputBorder } from "@/components/medicine/FormField";
import { createSupplier, updateSupplier, type Supplier, type SupplierStatus } from "@/lib/data/suppliers";
import { errorMessage } from "@/lib/useAsync";

type Values = { name: string; type: string; contact: string; email: string; phone: string; status: SupplierStatus };
type Key = keyof Values;
type Errors = Partial<Record<Key, { msg: string; tag: "REQUIRED" | "INVALID" }>>;
const EMPTY: Values = { name: "", type: "", contact: "", email: "", phone: "", status: "Active" };
const ORDER: Key[] = ["name", "type", "contact", "email", "phone", "status"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function validate(v: Values): Errors {
  const e: Errors = {};
  if (!v.name.trim()) e.name = { msg: "Supplier name is required.", tag: "REQUIRED" };
  if (!v.contact.trim()) e.contact = { msg: "Contact person is required.", tag: "REQUIRED" };
  if (!v.email.trim()) e.email = { msg: "Email is required.", tag: "REQUIRED" };
  else if (!EMAIL_RE.test(v.email.trim())) e.email = { msg: "Enter a valid email address (e.g. orders@supplier.co.za).", tag: "INVALID" };
  const phone = v.phone.trim();
  if (!phone) e.phone = { msg: "Phone number is required.", tag: "REQUIRED" };
  else if (!/^\+?[\d\s()-]{7,}$/.test(phone)) e.phone = { msg: "Enter a valid phone number (e.g. +27 61 876-5432).", tag: "INVALID" };
  return e;
}

/** The directory shows "—" for blanks; the form should start empty instead. */
const blank = (s: string) => (s === "—" ? "" : s);

/** Adds a supplier, or edits one when `supplier` is given (render with a key so the form restarts). */
export default function AddSupplierModal({
  open,
  onClose,
  onCreated,
  supplier,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  supplier?: Supplier | null;
}) {
  const initial: Values = supplier
    ? { name: supplier.name, type: blank(supplier.type), contact: blank(supplier.contact), email: supplier.email ?? "", phone: blank(supplier.phone), status: supplier.status }
    : EMPTY;
  const [v, setV] = useState<Values>(initial);
  const [errors, setErrors] = useState<Errors>({});
  const [saveError, setSaveError] = useState("");
  const [saving, setSaving] = useState(false);

  const close = () => {
    setV(initial);
    setErrors({});
    setSaveError("");
    onClose();
  };
  const set = (k: Key, val: string) => {
    setV((p) => ({ ...p, [k]: val }));
    if (errors[k]) setErrors((p) => ({ ...p, [k]: undefined }));
  };

  const submit = async () => {
    if (saving) return;
    const errs = validate(v);
    const first = ORDER.find((k) => errs[k]);
    setErrors(errs);
    if (first) {
      requestAnimationFrame(() => document.getElementById(`sup-${first}`)?.focus());
      return;
    }
    setSaving(true);
    setSaveError("");
    try {
      const input = {
        name: v.name.trim(),
        type: v.type.trim(),
        contact: v.contact.trim(),
        email: v.email.trim(),
        phone: v.phone.trim(),
        status: v.status,
      };
      if (supplier) await updateSupplier(supplier.id, input);
      else await createSupplier(input);
    } catch (e) {
      setSaveError(errorMessage(e));
      return;
    } finally {
      setSaving(false);
    }
    onCreated();
    close();
  };

  const count = ORDER.filter((k) => errors[k]).length;
  const a = (k: Key) => ({
    id: `sup-${k}`,
    value: v[k],
    "aria-invalid": errors[k] ? (true as const) : undefined,
    "aria-describedby": errors[k] ? `sup-${k}-error` : undefined,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => set(k, e.target.value),
  });
  const f = (k: Key, label: string, required = false) => ({
    id: `sup-${k}`, label, required, error: errors[k]?.msg, tag: errors[k]?.tag,
  });
  const bd = (k: Key) => inputBorder(!!errors[k]);

  return (
    <Modal
      open={open}
      onClose={close}
      title={supplier ? "Edit Supplier" : "Add New Supplier"}
      subtitle={supplier ? "Update this supplier's details" : "Register a distributor in your supplier network"}
      footer={
        <div className="flex flex-wrap justify-end gap-2.5">
          <button type="button" onClick={close} className={`${BTN_SMALL_OUTLINE} !h-10 !rounded-full px-5`}>Cancel</button>
          <button type="submit" form="add-supplier-form" disabled={saving} className={`${BTN_PRIMARY} !h-10 !px-5 !text-[13px]`}>
            <Icon name="check" size={16} /> {saving ? "Saving…" : supplier ? "Save Changes" : "Add Supplier"}
          </button>
        </div>
      }
    >
      <form
        id="add-supplier-form"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="flex flex-col gap-4"
      >
        {count > 0 && (
          <div role="alert" className="flex gap-3 rounded-xl border border-[#F7C6C1] bg-[#FDEDEB] px-5 py-3.5 text-danger">
            <Icon name="error" size={20} />
            <p className="text-[14px] font-bold">
              Please correct {count} validation error{count === 1 ? "" : "s"} before submitting.
            </p>
          </div>
        )}
        {saveError && count === 0 && (
          <p role="alert" className="rounded-xl border border-[#F7C6C1] bg-[#FDEDEB] px-5 py-3 text-[13.5px] font-medium text-danger">
            Couldn&apos;t {supplier ? "save" : "add"} this supplier: {saveError}
          </p>
        )}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField {...f("name", "Supplier Name", true)}>
            <input {...a("name")} type="text" placeholder="e.g. NovaMed Dist." className={`${INPUT_BASE} ${bd("name")}`} />
          </FormField>
          <FormField {...f("type", "Type")}>
            <input {...a("type")} type="text" placeholder="e.g. Regional Supplier" className={`${INPUT_BASE} ${bd("type")}`} />
          </FormField>
          <FormField {...f("contact", "Contact Person", true)}>
            <input {...a("contact")} type="text" placeholder="e.g. James Wilson" className={`${INPUT_BASE} ${bd("contact")}`} />
          </FormField>
          <FormField {...f("email", "Email", true)}>
            <input {...a("email")} type="email" placeholder="orders@supplier.co.za" className={`${INPUT_BASE} ${bd("email")}`} />
          </FormField>
          <FormField {...f("phone", "Phone", true)}>
            <input {...a("phone")} type="tel" placeholder="+27 61 876-5432" className={`${INPUT_BASE} ${bd("phone")}`} />
          </FormField>
          <FormField {...f("status", "Status")}>
            <select {...a("status")} className={`${INPUT_BASE} ${bd("status")}`}>
              <option>Active</option>
              <option>Inactive</option>
            </select>
          </FormField>
        </div>
      </form>
    </Modal>
  );
}
