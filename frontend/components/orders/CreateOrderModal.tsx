"use client";

import { useState } from "react";
import Icon from "@/components/Icon";
import Modal from "@/components/ui/Modal";
import { BTN_SMALL_OUTLINE } from "@/components/ui/buttons";
import { fetchSupplierOptions, type SupplierOption } from "@/lib/data/medicine";
import type { NewOrder, PoPriority } from "@/lib/data/orders";
import { fetchMedicineOptions, type MedicineOption } from "@/lib/data/transactions";
import { errorMessage, useAsync } from "@/lib/useAsync";
import { formatRand, poTotal } from "./utils";

type Line = { medicine: string; qty: string; cost: string };
const FIELD =
  "h-[44px] w-full rounded-[9px] border border-border bg-white px-3.5 text-[14px] text-ink outline-none focus:border-brand aria-[invalid=true]:border-danger";
const LABEL = "text-[13px] font-semibold text-ink";
const ERR = "text-[12.5px] text-danger";
const emptyLine = (): Line => ({ medicine: "", qty: "", cost: "" });

function OrderForm({
  suppliers,
  medicines,
  onSubmit,
}: {
  suppliers: SupplierOption[];
  medicines: MedicineOption[];
  onSubmit: (o: NewOrder) => Promise<void>;
}) {
  const [supplier, setSupplier] = useState("");
  const [priority, setPriority] = useState<PoPriority>("Normal");
  const [expected, setExpected] = useState("");
  const [lines, setLines] = useState<Line[]>([emptyLine()]);
  const [errors, setErrors] = useState<{ supplier?: string; lines?: string; save?: string }>({});
  const [saving, setSaving] = useState(false);

  const parsed = lines.map((l) => ({ medicineId: l.medicine, quantity: Number(l.qty), unitCost: Number(l.cost) }));
  const total = poTotal(parsed.map((p) => ({ ...p, quantity: p.quantity > 0 ? p.quantity : 0, unitCost: p.unitCost > 0 ? p.unitCost : 0 })));

  const update = (i: number, patch: Partial<Line>) => setLines((ls) => ls.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));

  // Picking a medicine pre-fills its catalogue price.
  const pickMedicine = (i: number, id: string) => {
    const price = medicines.find((m) => m.id === id)?.unitPrice;
    update(i, { medicine: id, ...(price && !lines[i].cost ? { cost: price.toFixed(2) } : {}) });
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    const next: typeof errors = {};
    if (!supplier) next.supplier = "Select a supplier.";
    if (lines.length === 0) next.lines = "Add at least one line item.";
    else if (parsed.some((p) => !p.medicineId || !(p.quantity > 0) || !Number.isInteger(p.quantity) || !(p.unitCost > 0)))
      next.lines = "Every line needs a medicine, a whole quantity above 0 and a unit cost above R0.";
    setErrors(next);
    if (Object.keys(next).length) return;
    setSaving(true);
    try {
      await onSubmit({ supplierId: supplier, priority, expectedDate: expected || undefined, items: parsed });
    } catch (err) {
      setErrors({ save: errorMessage(err) });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form id="po-form" onSubmit={submit} noValidate aria-busy={saving} className="flex flex-col gap-4">
      {errors.save && (
        <p role="alert" className="rounded-[9px] border border-[#F7C6C1] bg-[#FDEDEB] px-3.5 py-2.5 text-[13px] font-medium text-danger">
          Couldn&apos;t create the order: {errors.save}
        </p>
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="po-supplier" className={LABEL}>Supplier *</label>
          <select
            id="po-supplier"
            value={supplier}
            onChange={(e) => setSupplier(e.target.value)}
            aria-invalid={!!errors.supplier}
            aria-describedby={errors.supplier ? "po-supplier-err" : undefined}
            className={FIELD}
          >
            <option value="">Select supplier...</option>
            {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          {errors.supplier && <p id="po-supplier-err" className={ERR}>{errors.supplier}</p>}
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="po-priority" className={LABEL}>Priority</label>
          <select id="po-priority" value={priority} onChange={(e) => setPriority(e.target.value as PoPriority)} className={FIELD}>
            <option>Normal</option>
            <option>High</option>
            <option>Critical</option>
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="po-expected" className={LABEL}>Expected delivery</label>
          <input id="po-expected" type="date" value={expected} onChange={(e) => setExpected(e.target.value)} className={FIELD} />
        </div>
      </div>

      <fieldset className="flex flex-col gap-3" aria-describedby={errors.lines ? "po-lines-err" : undefined}>
        <legend className={`${LABEL} mb-1`}>Line items *</legend>
        {lines.map((l, i) => (
          <div key={i} className="grid grid-cols-[1fr_auto] items-end gap-2 sm:grid-cols-[2fr_1fr_1fr_auto]">
            <div className="col-span-2 flex flex-col gap-1 sm:col-span-1">
              <label htmlFor={`po-med-${i}`} className="text-[12px] text-muted">Medicine</label>
              <select id={`po-med-${i}`} value={l.medicine} onChange={(e) => pickMedicine(i, e.target.value)} aria-invalid={!!errors.lines && !l.medicine} className={FIELD}>
                <option value="">Select medicine...</option>
                {medicines.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor={`po-qty-${i}`} className="text-[12px] text-muted">Quantity</label>
              <input id={`po-qty-${i}`} inputMode="numeric" value={l.qty} onChange={(e) => update(i, { qty: e.target.value })} aria-invalid={!!errors.lines && !(Number(l.qty) > 0)} className={FIELD} />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor={`po-cost-${i}`} className="text-[12px] text-muted">Unit cost (R)</label>
              <input id={`po-cost-${i}`} inputMode="decimal" value={l.cost} onChange={(e) => update(i, { cost: e.target.value })} aria-invalid={!!errors.lines && !(Number(l.cost) > 0)} className={FIELD} />
            </div>
            <button
              type="button"
              aria-label={`Remove line ${i + 1}`}
              onClick={() => setLines((ls) => ls.filter((_, idx) => idx !== i))}
              className="flex h-[44px] w-[44px] items-center justify-center rounded-[9px] text-muted hover:bg-page hover:text-danger"
            >
              <Icon name="delete" size={18} />
            </button>
          </div>
        ))}
        {errors.lines && <p id="po-lines-err" className={ERR}>{errors.lines}</p>}
        <button type="button" onClick={() => setLines((ls) => [...ls, emptyLine()])} className={`${BTN_SMALL_OUTLINE} self-start`}>
          <Icon name="add" size={15} /> Add line
        </button>
      </fieldset>

      <div className="flex items-center justify-between rounded-[10px] bg-[#F1F5FB] px-4 py-3">
        <span className="text-[13px] font-semibold uppercase tracking-[.05em] text-muted">Total</span>
        <span className="text-[20px] font-bold text-ink" aria-live="polite">{formatRand(total)}</span>
      </div>
    </form>
  );
}

export default function CreateOrderModal({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (o: NewOrder) => Promise<void>;
}) {
  const suppliers = useAsync(() => (open ? fetchSupplierOptions() : Promise.resolve([])), [open]);
  const medicines = useAsync(() => (open ? fetchMedicineOptions() : Promise.resolve([])), [open]);
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Create Purchase Order"
      subtitle="Request stock from a supplier. New orders start as Pending."
      footer={
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} className={BTN_SMALL_OUTLINE}>Cancel</button>
          <button type="submit" form="po-form" className="h-9 rounded-lg bg-brand px-4 text-[13px] font-bold text-white hover:bg-brand-dark">
            Create order
          </button>
        </div>
      }
    >
      {open && <OrderForm suppliers={suppliers.data ?? []} medicines={medicines.data ?? []} onSubmit={onSubmit} />}
    </Modal>
  );
}
