"use client";

import { useState } from "react";
import Icon from "@/components/Icon";
import AppFooter from "@/components/ui/AppFooter";
import Avatar from "@/components/ui/Avatar";
import Badge from "@/components/ui/Badge";
import { BTN_PRIMARY, CARD, TD, TH } from "@/components/ui/buttons";
import Pagination from "@/components/ui/Pagination";
import LoadError from "@/components/ui/LoadError";
import Toggle from "@/components/ui/Toggle";
import { initial } from "@/lib/format";
import { PAGE_SIZE, pageCount } from "@/lib/data/query";
import { ROLE_LABEL, fetchUserStats, fetchUsers, setUserActive, setUserRole, type Permission, type UserRole } from "@/lib/data/users";
import { useSearchQuery } from "@/lib/useSearchQuery";
import { errorMessage, useAsync } from "@/lib/useAsync";
import CreateUserModal from "./CreateUserModal";
import EditRolesDrawer from "./EditRolesDrawer";
import StatCards from "./StatCards";

export default function UsersView() {
  const [page, setPage] = useState(1);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [actionError, setActionError] = useState("");
  const q = useSearchQuery();
  const list = useAsync(() => fetchUsers(page, q), [page, q]);
  const stats = useAsync(fetchUserStats, []);
  const users = list.data?.rows ?? [];
  const total = list.data?.total ?? 0;
  const editing = users.find((u) => u.id === editingId) ?? null;

  const refresh = () => {
    list.reload();
    stats.reload();
  };

  async function run(action: () => Promise<void>) {
    setActionError("");
    try {
      await action();
    } catch (e) {
      setActionError(errorMessage(e));
    }
    refresh();
  }

  const setActive = (id: string, active: boolean) => run(() => setUserActive(id, active));
  const first = (page - 1) * PAGE_SIZE + 1;
  const error = actionError || list.error || stats.error;

  const iconBtn = "flex h-8 w-8 items-center justify-center rounded-lg text-brand hover:bg-brand-tint";

  return (
    <>
      <div className="flex flex-1 flex-col gap-[22px] p-7">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="flex flex-col gap-1.5">
            <h1 className="text-[26px] font-bold tracking-[-.02em] text-ink">User Management</h1>
            <p className="text-[14.5px] text-muted">
              <b className="font-bold text-brand">{stats.data?.totalActive ?? "—"}</b> Active Users currently on the platform
            </p>
          </div>
          <button type="button" className={BTN_PRIMARY} onClick={() => setCreating(true)}>
            <Icon name="person_add" size={19} />
            Create New User
          </button>
        </div>

        {error && <LoadError message={error} onRetry={actionError ? () => setActionError("") : refresh} />}

        <StatCards stats={stats.data} />

        <section className={`${CARD} overflow-hidden`}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-left">
              <thead>
                <tr className="border-b border-border-soft bg-brand-tint/60">
                  <th scope="col" className={TH}>Profile</th>
                  <th scope="col" className={TH}>Role</th>
                  <th scope="col" className={TH}>Status</th>
                  <th scope="col" className={TH}>Last Login</th>
                  <th scope="col" className={`${TH} text-right`}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {list.data && users.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-[14px] text-muted">No users to show.</td>
                  </tr>
                )}
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-border-soft last:border-b-0">
                    <td className={TD}>
                      <div className="flex items-center gap-3">
                        <Avatar letter={initial(u.name)} size={40} />
                        <div className="flex flex-col">
                          <span className="text-[14.5px] font-bold text-ink">{u.name}</span>
                          <span className="text-[13px] text-muted">{u.email}</span>
                        </div>
                      </div>
                    </td>
                    <td className={TD}>
                      <Badge upper tone={u.role === "pharmacist" ? "success" : u.role === "administrator" ? "brand" : "neutral"}>
                        {ROLE_LABEL[u.role]}
                      </Badge>
                    </td>
                    <td className={TD}>
                      <Toggle label={`Toggle ${u.name} active`} checked={u.active} onChange={(v) => setActive(u.id, v)} />
                    </td>
                    <td className={`${TD} text-[14px] text-body`}>{u.lastLogin}</td>
                    <td className={TD}>
                      <div className="flex justify-end gap-1">
                        <button type="button" aria-label={`Edit ${u.name}`} className={iconBtn} onClick={() => setEditingId(u.id)}>
                          <Icon name="edit" size={17} />
                        </button>
                        <button type="button" aria-label={`Manage permissions for ${u.name}`} className={`${iconBtn} !text-muted`} onClick={() => setEditingId(u.id)}>
                          <Icon name="shield" size={17} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-border-soft bg-brand-tint/60">
            <Pagination
              compact
              summary={total ? `Showing ${first}-${first + users.length - 1} of ${total} users` : list.data ? "No users" : "Loading…"}
              page={page}
              pages={pageCount(total)}
              onPageChange={setPage}
            />
          </div>
        </section>
      </div>
      <AppFooter />

      {editing && (
        <EditRolesDrawer
          key={editing.id}
          user={editing}
          onClose={() => setEditingId(null)}
          onSave={(role: UserRole, permissions: Permission[]) => {
            setEditingId(null);
            run(() => setUserRole(editing.id, role, permissions));
          }}
        />
      )}
      <CreateUserModal open={creating} onClose={() => setCreating(false)} onCreated={refresh} />
    </>
  );
}
