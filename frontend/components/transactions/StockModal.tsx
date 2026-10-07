"use client";

import { useState } from "react";
import Modal from "@/components/ui/Modal";
import { BTN_SMALL_OUTLINE } from "@/components/ui/buttons";
import type { MedicineOption } from "@/lib/data/transactions";
import { errorMessage } from "@/lib/useAsync";

export type StockValues = { medicineId: string; quantity: number; batch: string; notes: string };

const FIELD =
  "h-[44px] w-full rounded-[9px] border border-border bg-white px-3.5 text-[14px] text-ink outline-none focus:border-brand aria-[invalid=true]:border-danger";
const LABEL = "text-[13px] font-semibold text-ink";
const ERR = "text-[12.5px] text-danger";

function StockForm({
  kind,
  medicines,
  onSubmit,
}: {
  kind: "in" | "out";
  medicines: MedicineOption[];
  onSubmit: (v: StockValues) => Promise<void>;
}) {
  const [medicine, setMedicine] = useState("");
  const [qty, setQty] = useState("");
  const [batch, setBatch] = useState("");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<{ medicine?: string; qty?: string; save?: string }>({});
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    const next: typeof errors = {};
    if (!medicine) next.medicine = "Select a medicine.";
    const n = Number(qty);
    if (!/^\d+$/.test(qty.trim()) || n <= 0) next.qty = "Enter a whole number greater than 0.";
    // The stock trigger floors at zero rather than rejecting, so guard here.
    const onHand = medicines.find((m) => m.id === medicine)?.onHand;
    if (!next.qty && kind === "out" && onHand !== undefined && n > onHand) next.qty = `Only ${onHand} units in stock.`;
    setErrors(next);
    if (Object.keys(next).length) return;
    setSaving(true);
    try {
      await onSubmit({ medicineId: medicine, quantity: n, batch: batch.trim(), notes: notes.trim() });
    } catch (err) {
      setErrors({ save: errorMessage(err) });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form id="stock-form" onSubmit={submit} noValidate aria-busy={saving} className="flex flex-col gap-4">
      {errors.save && (
        <p role="alert" className="rounded-[9px] border border-[#F7C6C1] bg-[#FDEDEB] px-3.5 py-2.5 text-[13px] font-medium text-danger">
          {errors.save}
        </p>
      )}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="sf-medicine" className={LABEL}>Medicine *</label>
        <select
          id="sf-medicine"
          value={medicine}
          onChange={(e) => setMedicine(e.target.value)}
          aria-invalid={!!errors.medicine}
          aria-describedby={errors.medicine ? "sf-medicine-err" : undefined}
          className={FIELD}
        >
          <option value="">Select medicine...</option>
          {medicines.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name} ({m.onHand} in stock)
            </option>
          ))}
        </select>
        {errors.medicine && <p id="sf-medicine-err" className={ERR}>{errors.medicine}</p>}
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="sf-qty" className={LABEL}>Quantity *</label>
        <input
          id="sf-qty"
          inputMode="numeric"
          value={qty}
          onChange={(e) => setQty(e.target.value)}
          aria-invalid={!!errors.qty}
          aria-describedby={errors.qty ? "sf-qty-err" : undefined}
          placeholder={kind === "in" ? "Units received" : "Units dispensed"}
          className={FIELD}
        />
        {errors.qty && <p id="sf-qty-err" className={ERR}>{errors.qty}</p>}
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="sf-batch" className={LABEL}>Batch / Reference (optional)</label>
        <input id="sf-batch" value={batch} onChange={(e) => setBatch(e.target.value)} className={FIELD} />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="sf-notes" className={LABEL}>Notes (optional)</label>
        <textarea
          id="sf-notes"
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className={`${FIELD} h-auto py-2.5`}
        />
      </div>
    </form>
  );
}

export default function StockModal({
  kind,
  onClose,
  onSubmit,
  medicines,
}: {
  kind: "in" | "out" | null;
  onClose: () => void;
  onSubmit: (kind: "in" | "out", v: StockValues) => Promise<void>;
  medicines: MedicineOption[];
}) {
  return (
    <Modal
      open={kind !== null}
      onClose={onClose}
      title={kind === "out" ? "Record Stock Out" : "Record Stock In"}
      subtitle={kind === "out" ? "Log stock leaving the pharmacy." : "Log stock received into the pharmacy."}
      footer={
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} className={BTN_SMALL_OUTLINE}>Cancel</button>
          <button
            type="submit"
            form="stock-form"
            className="h-9 rounded-lg bg-brand px-4 text-[13px] font-bold text-white hover:bg-brand-dark"
          >
            {kind === "out" ? "Record Stock Out" : "Record Stock In"}
          </button>
        </div>
      }
    >
      {kind && <StockForm kind={kind} medicines={medicines} onSubmit={(v) => onSubmit(kind, v)} />}
    </Modal>
  );
}
