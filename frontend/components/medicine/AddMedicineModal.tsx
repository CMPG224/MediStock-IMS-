"use client";

import { useState } from "react";
import Icon from "@/components/Icon";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import { BTN_SMALL_OUTLINE } from "@/components/ui/buttons";
import { useProfile } from "@/components/app-shell/ProfileProvider";
import { TEMPERATURE_OPTIONS, createMedicine, fetchCategories, fetchSupplierOptions } from "@/lib/data/medicine";
import { errorMessage, useAsync } from "@/lib/useAsync";
import FormField, { INPUT_BASE, inputBorder } from "./FormField";

type Values = {
  name: string;
  generic: string;
  category: string;
  supplier: string;
  batch: string;
  barcode: string;
  location: string;
  temp: string;
  expiry: string;
  qty: string;
  min: string;
  cost: string;
};
type Key = keyof Values;
type Errors = Partial<Record<Key, { msg: string; tag: "REQUIRED" | "INVALID" }>>;

const EMPTY: Values = {
  name: "", generic: "", category: "", supplier: "", batch: "", barcode: "",
  location: "", temp: TEMPERATURE_OPTIONS[0].value, expiry: "", qty: "", min: "", cost: "",
};
// DOM order, used to focus the first invalid field.
const ORDER: Key[] = ["name", "generic", "category", "supplier", "batch", "barcode", "location", "temp", "expiry", "qty", "min", "cost"];
const BATCH_RE = /^[A-Z]-\d{5}-[A-Z]{3}$/;

function validate(v: Values): Errors {
  const e: Errors = {};
  const req = (k: Key, msg: string) => {
    if (!v[k].trim()) e[k] = { msg, tag: "REQUIRED" };
  };
  req("name", "Medicine / product name is required.");
  req("generic", "Generic / scientific name is required.");
  req("category", "Category is required.");
  req("supplier", "Approved supplier is required.");
  req("location", "Storage location / zone is required.");
  req("temp", "Temperature condition is required.");

  const batch = v.batch.trim();
  if (!batch) e.batch = { msg: "Batch number is required and must follow format (e.g. B-99201-AMX).", tag: "REQUIRED" };
  else if (!BATCH_RE.test(batch)) e.batch = { msg: "Batch number must follow format (e.g. B-99201-AMX).", tag: "INVALID" };

  const barcode = v.barcode.trim();
  if (barcode && !/^\d{12,14}$/.test(barcode)) e.barcode = { msg: "Barcode must be 12 to 14 digits.", tag: "INVALID" };

  const qty = v.qty.trim();
  if (!qty) e.qty = { msg: "Initial quantity is required.", tag: "REQUIRED" };
  else if (!/^\d+$/.test(qty)) e.qty = { msg: "Initial quantity must be a whole number, 0 or more.", tag: "INVALID" };

  const min = v.min.trim();
  if (!min) e.min = { msg: "Minimum alert stock level must be greater than zero.", tag: "REQUIRED" };
  else if (!/^\d+$/.test(min) || Number(min) <= 0) e.min = { msg: "Threshold must be greater than 0.", tag: "INVALID" };

  const cost = v.cost.trim();
  if (!cost) e.cost = { msg: "Unit cost is required.", tag: "REQUIRED" };
  else if (!(Number(cost) > 0)) e.cost = { msg: "Unit cost must be greater than 0.", tag: "INVALID" };
  return e;
}

function SectionHeading({ icon, children }: { icon: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 border-b border-border-soft pb-2.5 text-brand">
      <Icon name={icon} size={18} />
      <h3 className="text-[13px] font-bold uppercase tracking-[.05em]">{children}</h3>
    </div>
  );
}

export default function AddMedicineModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [v, setV] = useState<Values>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [notice, setNotice] = useState("");
  const [saveError, setSaveError] = useState("");
  const [saving, setSaving] = useState(false);
  const { profile } = useProfile();
  const categories = useAsync(() => (open ? fetchCategories() : Promise.resolve([])), [open]);
  const suppliers = useAsync(() => (open ? fetchSupplierOptions() : Promise.resolve([])), [open]);

  const set = (k: Key, val: string) => {
    setV((p) => ({ ...p, [k]: val }));
    if (errors[k]) setErrors((p) => ({ ...p, [k]: undefined }));
  };
  const close = () => {
    setV(EMPTY);
    setErrors({});
    setNotice("");
    setSaveError("");
    onClose();
  };

  const attempt = async (another: boolean) => {
    if (saving) return;
    const errs = validate(v);
    const keys = ORDER.filter((k) => errs[k]);
    setErrors(errs);
    if (keys.length) {
      setNotice("");
      requestAnimationFrame(() => document.getElementById(`med-${keys[0]}`)?.focus());
      return;
    }
    setSaving(true);
    setSaveError("");
    try {
      await createMedicine({
        name: v.name.trim(),
        genericName: v.generic.trim(),
        category: v.category,
        supplierId: v.supplier,
        batchNo: v.batch.trim(),
        barcode: v.barcode.trim() || undefined,
        storageLocation: v.location.trim(),
        temperature: v.temp,
        expiry: v.expiry || undefined,
        quantity: Number(v.qty),
        reorderAt: Number(v.min),
        unitCost: Number(v.cost),
      });
    } catch (e) {
      setSaveError(errorMessage(e));
      return;
    } finally {
      setSaving(false);
    }
    onCreated();
    if (another) {
      setNotice(`${v.name.trim()} added to inventory. Enter the next record.`);
      setV(EMPTY);
      setErrors({});
      requestAnimationFrame(() => document.getElementById("med-name")?.focus());
    } else close();
  };

  const list = ORDER.filter((k) => errors[k]).map((k) => errors[k]!.msg);
  const a = (k: Key) => ({
    id: `med-${k}`,
    value: v[k],
    "aria-invalid": errors[k] ? (true as const) : undefined,
    "aria-describedby": errors[k] ? `med-${k}-error` : undefined,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => set(k, e.target.value),
  });
  const f = (k: Key, label: string, required = false) => ({
    id: `med-${k}`,
    label,
    required,
    error: errors[k]?.msg,
    tag: errors[k]?.tag,
  });
  const bd = (k: Key) => inputBorder(!!errors[k]);

  return (
    <Modal
      open={open}
      onClose={close}
      title="Add Medicine Record"
      subtitle="Enter pharmaceutical details, batch information, and inventory thresholds"
      headerExtra={<Badge tone="brand" upper>Inventory Intake</Badge>}
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-[12.5px] text-muted">
            <span className="text-brand"><Icon name="shield" size={16} /></span>
            <span>
              MediStock Audit Log: Actions logged under <strong className="font-semibold text-ink">{profile?.fullName ?? "you"}</strong>
            </span>
          </p>
          <div className="flex flex-wrap items-center gap-2.5">
            <button type="button" onClick={close} className={`${BTN_SMALL_OUTLINE} !h-10 !rounded-full px-5`}>
              Cancel
            </button>
            <button
              type="button"
              onClick={() => attempt(true)}
              disabled={saving}
              className="flex h-10 items-center gap-2 rounded-full bg-[#DDE7F7] px-5 text-[13px] font-bold text-brand hover:bg-[#CFDDF3]"
            >
              <Icon name="add" size={16} /> Save &amp; Add Another
            </button>
            <button
              type="submit"
              form="add-medicine-form"
              disabled={saving}
              className="flex h-10 items-center gap-2 rounded-full bg-brand px-5 text-[13px] font-bold text-white shadow-[0_5px_14px_rgba(11,76,140,.22)] hover:bg-brand-dark"
            >
              <Icon name="check" size={16} /> {saving ? "Saving…" : "Create Record"}
            </button>
          </div>
        </div>
      }
    >
      <form
        id="add-medicine-form"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          attempt(false);
        }}
        className="flex flex-col gap-6"
      >
        <div aria-live="polite">
          {list.length > 0 && (
            <div role="alert" className="flex gap-3 rounded-xl border border-[#F7C6C1] bg-[#FDEDEB] px-5 py-4 text-danger">
              <Icon name="error" size={20} />
              <div>
                <p className="text-[14px] font-bold">
                  Please correct {list.length} validation error{list.length === 1 ? "" : "s"} before submitting:
                </p>
                <ul className="mt-1.5 list-disc pl-5 text-[13.5px]">
                  {list.map((m) => (
                    <li key={m}>{m}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
          {saveError && list.length === 0 && (
            <p role="alert" className="rounded-xl border border-[#F7C6C1] bg-[#FDEDEB] px-5 py-3 text-[13.5px] font-medium text-danger">
              Couldn&apos;t save this medicine: {saveError}
            </p>
          )}
          {notice && list.length === 0 && !saveError && (
            <p className="rounded-xl border border-[#BFE8D2] bg-success-bg px-5 py-3 text-[13.5px] font-medium text-success">{notice}</p>
          )}
        </div>

        <section className="flex flex-col gap-4" aria-labelledby="med-s1">
          <SectionHeading icon="clinical_notes"><span id="med-s1">1. Basic Pharmaceutical Identification</span></SectionHeading>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField {...f("name", "Medicine / Product Name", true)}>
              <input {...a("name")} type="text" placeholder="e.g. Amoxicillin 500mg" className={`${INPUT_BASE} ${bd("name")}`} />
            </FormField>
            <FormField {...f("generic", "Generic / Scientific Name", true)}>
              <input {...a("generic")} type="text" placeholder="e.g. Amoxicillin Trihydrate" className={`${INPUT_BASE} ${bd("generic")}`} />
            </FormField>
            <FormField {...f("category", "Category", true)}>
              <select {...a("category")} className={`${INPUT_BASE} ${bd("category")}`}>
                <option value="">Select category</option>
                {(categories.data ?? []).map((c) => <option key={c}>{c}</option>)}
              </select>
            </FormField>
            <FormField {...f("supplier", "Approved Supplier", true)}>
              <select {...a("supplier")} className={`${INPUT_BASE} ${bd("supplier")}`}>
                <option value="">Select supplier</option>
                {(suppliers.data ?? []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </FormField>
          </div>
        </section>

        <section className="flex flex-col gap-4" aria-labelledby="med-s2">
          <SectionHeading icon="assignment_clock"><span id="med-s2">2. Batch &amp; Identification Logistics</span></SectionHeading>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField {...f("batch", "Batch Number", true)}>
              <input {...a("batch")} type="text" placeholder="e.g. B-99201-AMX" autoComplete="off" className={`${INPUT_BASE} ${bd("batch")}`} />
            </FormField>
            <FormField {...f("barcode", "UPC / Barcode (GTIN-12/14)")}>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"><Icon name="barcode" size={18} /></span>
                  <input {...a("barcode")} type="text" inputMode="numeric" placeholder="890123456789" className={`${INPUT_BASE} ${bd("barcode")} pl-10`} />
                </div>
                <button
                  type="button"
                  className="flex h-[42px] items-center gap-2 rounded-lg bg-[#DDE7F7] px-4 text-[13px] font-bold text-brand hover:bg-[#CFDDF3]"
                >
                  <Icon name="scan" size={16} /> Scan
                </button>
              </div>
            </FormField>
            <FormField {...f("location", "Storage Location / Zone", true)}>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"><Icon name="place" size={18} /></span>
                <input {...a("location")} type="text" placeholder="e.g. Aisle 4, Shelf B2" className={`${INPUT_BASE} ${bd("location")} pl-10`} />
              </div>
            </FormField>
            <FormField {...f("temp", "Temperature Condition", true)}>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"><Icon name="thermostat" size={18} /></span>
                <select {...a("temp")} className={`${INPUT_BASE} ${bd("temp")} pl-10`}>
                  {TEMPERATURE_OPTIONS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
            </FormField>
            <FormField {...f("expiry", "Expiry Date")}>
              <input {...a("expiry")} type="date" className={`${INPUT_BASE} ${bd("expiry")}`} />
            </FormField>
          </div>
        </section>

        <section className="flex flex-col gap-4" aria-labelledby="med-s3">
          <SectionHeading icon="payments"><span id="med-s3">3. Inventory Quantities &amp; Pricing</span></SectionHeading>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {(["qty", "min"] as const).map((k) => (
              <FormField key={k} {...f(k, k === "qty" ? "Initial Quantity" : "Min Alert Stock", true)}>
                <div className="relative">
                  <input {...a(k)} type="text" inputMode="numeric" placeholder="0" className={`${INPUT_BASE} ${bd(k)} pr-20 font-mono`} />
                  <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded bg-[#DDE7F7] px-2 py-0.5 text-[10.5px] font-bold text-brand">
                    UNITS
                  </span>
                </div>
              </FormField>
            ))}
            <FormField {...f("cost", "Unit Cost / Price (R)", true)}>
              <div className="relative">
                <span aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-[14px] text-muted">R</span>
                <input {...a("cost")} type="text" inputMode="decimal" placeholder="0.00" className={`${INPUT_BASE} ${bd("cost")} pl-9 font-mono`} />
              </div>
            </FormField>
          </div>
        </section>
      </form>
    </Modal>
  );
}
