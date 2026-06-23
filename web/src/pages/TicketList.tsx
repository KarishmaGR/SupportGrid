import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useState } from "react";
import { TicketStatus } from "@supportgrid/shared";
import type { TicketStatus as Status } from "@supportgrid/shared";
import { api } from "../api.ts";

export function TicketList() {
  const [status, setStatus] = useState<Status | "">("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["tickets", status],
    queryFn: () => api.listTickets(status ? { status } : {}),
  });

  if (isLoading) return <p>Loading tickets…</p>;
  if (error) return <p className="error">{(error as Error).message}</p>;

  return (
    <section>
      <div className="toolbar">
        <h1>Tickets</h1>
        <select value={status} onChange={(e) => setStatus(e.target.value as Status | "")}>
          <option value="">All statuses</option>
          {Object.values(TicketStatus).map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <table className="table">
        <thead>
          <tr>
            <th>Subject</th>
            <th>Requester</th>
            <th>Status</th>
            <th>Category</th>
            <th>Created</th>
          </tr>
        </thead>
        <tbody>
          {data!.items.map((t) => (
            <tr key={t.id}>
              <td>
                <Link to={`/tickets/${t.id}`}>{t.subject}</Link>
              </td>
              <td>{t.requesterEmail}</td>
              <td>
                <span className={`badge badge-${t.status.toLowerCase()}`}>{t.status}</span>
              </td>
              <td>{t.category ?? "—"}</td>
              <td>{new Date(t.createdAt).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="muted">
        {data!.total} ticket(s) · page {data!.page}
      </p>
    </section>
  );
}
