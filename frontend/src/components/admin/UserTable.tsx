import type { User } from '../../lib/types';

export function UserTable({ users, onDelete }: { users: User[]; onDelete: (userId: number) => void }) {
  return (
    <section className="rounded-[10px] border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
      <h2 className="text-[16px] text-[var(--color-ink)]">Users</h2>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-[13px]">
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-t border-[var(--color-border)] first:border-t-0">
                <td className="py-3 pr-4">
                  <p className="font-[500] text-[var(--color-ink)]">{user.name || user.email}</p>
                  <p className="text-[11px] text-[var(--color-muted)]">{user.email}</p>
                </td>
                <td className="py-3 pr-4">{user.role}</td>
                <td className="py-3 text-right">
                  <button className="text-red-600" type="button" onClick={() => onDelete(user.id)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
