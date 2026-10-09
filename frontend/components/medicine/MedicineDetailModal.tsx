"use client";

import { useState } from "react";
import { useProfile } from "@/components/app-shell/ProfileProvider";
import Modal from "@/components/ui/Modal";
import { BTN_SMALL_OUTLINE } from "@/components/ui/buttons";
import { formatDate, formatRand } from "@/lib/format";
import { deleteMedicine, fetchMedicineDetail, updateMedicine, type MedicineDetail } from "@/lib/data/medicine";
import { recordTransaction } from "@/lib/data/transactions";
import { errorMessage, useAsync } from "@/lib/useAsync";

const FIELD =
  "h-10 w-full rounded-[9px] border border-border bg-white px-3 text-[14px] text-ink focus:border-brand focus:outline-none";
const LABEL = "text-[12px] font-semibold text-muted";
const PRIMARY = "h-9 rounded-lg bg-brand px-4 text-[13px] font-bold text-white hover:bg-brand-dark disabled:opacity-60";

type Mode = "view" | "edit" | "in" | "out" | "delete";

export default function MedicineDetailModal({
  medicineId,
  onClose,
  onChanged,
}: {
  medicineId: string | null;
  onClose: () => void;
  /** Called after any write so the lists behind the modal refresh. */
  onChanged: () => void;
}) {
  return (
    <Modal open={medicineId !== null} onClose={onClose} title="Medicine details" subtitle="View, edit, adjust stock or remove this medicine.">
      {medicineId && <Detail key={medicineId} id={medicineId} onClose={onClose} onChanged={onChanged} />}
    </Modal>
  );
}

function Detail({ id, onClose, onChanged }: { id: string; onClose: () => void; onChanged: () => void }) {
  const { profile } = useProfile();
  const isAdmin = profile?.role === "administrator";
  const { data: m, error, reload } = useAsync(() => fetchMedicineDetail(id), [id]);
  const [mode, setMode] = useState<Mode>("view");
  const [failure, setFailure] = useState("");
  const [busy, setBusy] = useState(false);

  async function run(action: () => Promise<void>, after: "stay" | "close" = "stay") {
    if (busy) return;
    setBusy(true);
    setFailure("");
    try {
      await action();
      onChanged();
      if (after === "close") return onClose();
      setMode("view");
      reload();
    } catch (e) {
      setFailure(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  if (error) return <p role="alert" className="text-[13.5px] text-danger">{error}</p>;
  if (!m) return <p className="text-[13.5px] text-muted">Loading…</p>;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h3 className="text-[20px] font-bold text-ink">{m.name}</h3>
        <p className="text-[13.5px] text-muted">{[m.genericName, m.category].filter(Boolean).join(" · ")}</p>
      </div>

      {failure && (
        <p role="alert" className="rounded-[9px] border border-[#F7C6C1] bg-[#FDEDEB] px-3.5 py-2.5 text-[13px] font-medium text-danger">
          {failure}
        </p>
      )}

      {mode === "edit" ? (
        <EditForm m={m} busy={busy} onCancel={() => setMode("view")} onSave={(v) => run(() => updateMedicine(id, v))} />
      ) : (
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-[14px]">
          <Item label="Current stock" value={`${m.stock} units`} />
          <Item label="Reorder at" value={`${m.reorderAt} units`} />
          <Item label="Batch no." value={m.batchNo || "—"} />
          <Item label="Expiry" value={m.expiry ? formatDate(m.expiry) : "—"} />
          <Item label="Storage" value={m.storageLocation || "—"} />
          <Item label="Unit cost" value={formatRand(m.unitCost)} />
        </dl>
      )}

      {(mode === "in" || mode === "out") && (
        <StockForm
          kind={mode}
          onHand={m.stock}
          busy={busy}
          onCancel={() => setMode("view")}
          onSubmit={(qty, note) =>
            run(() => recordTransaction({ medicineId: id, type: mode, quantity: qty, batch: m.batchNo, note }))
          }
        />
      )}

      {mode === "delete" && (
        <div className="flex flex-col gap-3 rounded-[10px] border border-[#F7C6C1] bg-[#FDEDEB] p-4">
          <p className="text-[13.5px] text-danger">
            Delete {m.name}? This also removes its stock history and cannot be undone.
          </p>
          <div className="flex gap-3">
            <button type="button" className={BTN_SMALL_OUTLINE} onClick={() => setMode("view")}>Keep</button>
            <button
              type="button"
              disabled={busy}
              onClick={() => run(() => deleteMedicine(id), "close")}
              className="h-9 rounded-lg bg-danger px-4 text-[13px] font-bold text-white disabled:opacity-60"
            >
              {busy ? "Deleting…" : "Delete medicine"}
            </button>
          </div>
        </div>
      )}

      {mode === "view" && (
        <div className="flex flex-wrap gap-3 border-t border-border-soft pt-4">
          <button type="button" className={PRIMARY} onClick={() => setMode("in")}>Stock in</button>
          <button type="button" className={BTN_SMALL_OUTLINE} onClick={() => setMode("out")}>Stock out</button>
          {isAdmin && (
            <>
              <button type="button" className={BTN_SMALL_OUTLINE} onClick={() => setMode("edit")}>Edit</button>
              <button type="button" className={`${BTN_SMALL_OUTLINE} !text-danger`} onClick={() => setMode("delete")}>Delete</button>
            </>
          )}
        </div>
      )}
      {mode === "view" && !isAdmin && profile && (
        <p className="text-[12px] text-muted">Editing and deleting medicines is limited to administrators.</p>
      )}
    </div>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className={LABEL}>{label}</dt>
      <dd className="font-medium text-ink">{value}</dd>
    </div>
  );
}

function StockForm({
  kind,
  onHand,
  busy,
  onCancel,
  onSubmit,
}: {
  kind: "in" | "out";
  onHand: number;
  busy: boolean;
  onCancel: () => void;
  onSubmit: (qty: number, note: string) => void;
}) {
  const [qty, setQty] = useState("");
  const [note, setNote] = useState("");
  const [err, setErr] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const n = Number(qty);
    if (!/^\d+$/.test(qty.trim()) || n <= 0) return setErr("Enter a whole number greater than 0.");
    if (kind === "out" && n > onHand) return setErr(`Only ${onHand} units in stock.`);
    setErr("");
    onSubmit(n, note.trim());
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-3 rounded-[10px] border border-border-soft p-4">
      <h4 className="text-[14px] font-bold text-ink">{kind === "in" ? "Record stock in" : "Record stock out"}</h4>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="md-qty" className={LABEL}>Quantity *</label>
        <input id="md-qty" inputMode="numeric" value={qty} onChange={(e) => setQty(e.target.value)} aria-invalid={!!err} className={FIELD} />
        {err && <p className="text-[12.5px] text-danger">{err}</p>}
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="md-note" className={LABEL}>Note (optional)</label>
        <input id="md-note" value={note} onChange={(e) => setNote(e.target.value)} className={FIELD} />
      </div>
      <div className="flex gap-3">
        <button type="button" className={BTN_SMALL_OUTLINE} onClick={onCancel}>Cancel</button>
        <button type="submit" disabled={busy} className={PRIMARY}>{busy ? "Saving…" : "Save"}</button>
      </div>
    </form>
  );
}

type EditValues = Omit<MedicineDetail, "id" | "stock">;

function EditForm({
  m,
  busy,
  onCancel,
  onSave,
}: {
  m: MedicineDetail;
  busy: boolean;
  onCancel: () => void;
  onSave: (v: EditValues) => void;
}) {
  const [v, setV] = useState({
    name: m.name,
    genericName: m.genericName,
    category: m.category,
    batchNo: m.batchNo,
    storageLocation: m.storageLocation,
    expiry: m.expiry,
    reorderAt: String(m.reorderAt),
    unitCost: String(m.unitCost),
  });
  const [err, setErr] = useState("");
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement>) => setV((s) => ({ ...s, [k]: e.target.value }));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const reorderAt = Number(v.reorderAt);
    const unitCost = Number(v.unitCost);
    if (!v.name.trim() || !v.category.trim()) return setErr("Name and category are required.");
    if (!/^\d+$/.test(v.reorderAt.trim())) return setErr("Reorder level must be a whole number, 0 or more.");
    if (!v.unitCost.trim() || Number.isNaN(unitCost) || unitCost < 0) return setErr("Unit cost must be a number, 0 or more.");
    setErr("");
    onSave({
      name: v.name.trim(),
      genericName: v.genericName.trim(),
      category: v.category.trim(),
      batchNo: v.batchNo.trim(),
      storageLocation: v.storageLocation.trim(),
      expiry: v.expiry,
      reorderAt,
      unitCost,
    });
  }

  const field = (id: string, label: string, k: keyof typeof v, type = "text") => (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={`me-${id}`} className={LABEL}>{label}</label>
      <input id={`me-${id}`} type={type} value={v[k]} onChange={set(k)} className={FIELD} />
    </div>
  );

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      {err && <p role="alert" className="text-[12.5px] text-danger">{err}</p>}
      <div className="grid grid-cols-2 gap-4">
        {field("name", "Name *", "name")}
        {field("generic", "Generic name", "genericName")}
        {field("category", "Category *", "category")}
        {field("batch", "Batch no.", "batchNo")}
        {field("loc", "Storage location", "storageLocation")}
        {field("exp", "Expiry date", "expiry", "date")}
        {field("reorder", "Reorder at (units)", "reorderAt")}
        {field("cost", "Unit cost (R)", "unitCost")}
      </div>
      <p className="text-[12px] text-muted">Stock quantity changes through Stock in / Stock out so the history stays accurate.</p>
      <div className="flex gap-3">
        <button type="button" className={BTN_SMALL_OUTLINE} onClick={onCancel}>Cancel</button>
        <button type="submit" disabled={busy} className={PRIMARY}>{busy ? "Saving…" : "Save changes"}</button>
      </div>
    </form>
  );
}
