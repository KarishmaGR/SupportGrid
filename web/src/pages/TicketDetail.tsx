import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { useState } from "react";
import { TicketStatus } from "@supportgrid/shared";
import type { TicketStatus as Status } from "@supportgrid/shared";
import { api } from "../api.ts";

export function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [reply, setReply] = useState("");

  const { data: ticket, isLoading, error } = useQuery({
    queryKey: ["ticket", id],
    queryFn: () => api.getTicket(id!),
    enabled: !!id,
  });

  const updateStatus = useMutation({
    mutationFn: (status: Status) => api.updateTicket(id!, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ticket", id] }),
  });

  const sendReply = useMutation({
    mutationFn: (body: string) => api.addReply(id!, "agent@support.edu", body),
    onSuccess: () => {
      setReply("");
      queryClient.invalidateQueries({ queryKey: ["ticket", id] });
    },
  });

  if (isLoading) return <p>Loading…</p>;
  if (error) return <p className="error">{(error as Error).message}</p>;
  if (!ticket) return <p>Not found.</p>;

  return (
    <section>
      <Link to="/" className="muted">
        ← Back to tickets
      </Link>
      <h1>{ticket.subject}</h1>
      <div className="meta">
        <span>From: {ticket.requesterEmail}</span>
        <select
          value={ticket.status}
          onChange={(e) => updateStatus.mutate(e.target.value as Status)}
        >
          {Object.values(TicketStatus).map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div className="thread">
        {ticket.messages.map((m) => (
          <div key={m.id} className={`message message-${m.direction}`}>
            <div className="message-from">{m.from}</div>
            <div className="message-body">{m.body}</div>
            <div className="muted">{new Date(m.createdAt).toLocaleString()}</div>
          </div>
        ))}
      </div>

      <form
        className="reply-form"
        onSubmit={(e) => {
          e.preventDefault();
          if (reply.trim()) sendReply.mutate(reply.trim());
        }}
      >
        <textarea
          value={reply}
          placeholder="Write a reply…"
          onChange={(e) => setReply(e.target.value)}
          rows={3}
        />
        <button type="submit" disabled={sendReply.isPending}>
          {sendReply.isPending ? "Sending…" : "Send reply"}
        </button>
      </form>
    </section>
  );
}
