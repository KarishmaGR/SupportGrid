import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { useState } from "react";
import { TicketStatus, UserRole } from "@supportgrid/shared";
import type { TicketStatus as Status } from "@supportgrid/shared";
import { api } from "../api.ts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Mail, Tag, Calendar, UserCircle } from "lucide-react";

const statusVariant: Record<string, "default" | "secondary" | "outline"> = {
  open: "default",
  resolved: "secondary",
  closed: "outline",
};

export function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [reply, setReply] = useState("");

  const { data: ticket, isLoading, error } = useQuery({
    queryKey: ["ticket", id],
    queryFn: () => api.getTicket(id!),
    enabled: !!id,
  });

  const { data: users } = useQuery({
    queryKey: ["users"],
    queryFn: () => api.listUsers(),
  });

  const updateStatus = useMutation({
    mutationFn: (status: Status) => api.updateTicket(id!, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ticket", id] }),
  });

  const assignTicket = useMutation({
    mutationFn: (assignedToId: string | null) => api.updateTicket(id!, { assignedToId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket", id] });
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
    },
  });

  const sendReply = useMutation({
    mutationFn: (body: string) => api.addReply(id!, "agent@support.edu", body),
    onSuccess: () => {
      setReply("");
      queryClient.invalidateQueries({ queryKey: ["ticket", id] });
    },
  });

  if (isLoading) return <p className="text-muted-foreground">Loading…</p>;
  if (error)     return <p className="text-destructive">{(error as Error).message}</p>;
  if (!ticket)   return <p>Not found.</p>;

  return (
    <section className="space-y-6 max-w-3xl">
      {/* Back link */}
      <Link
        to="/tickets"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground no-underline"
      >
        <ArrowLeft className="size-3.5" /> Back to tickets
      </Link>

      {/* Header card */}
      <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <h1 className="text-2xl font-semibold leading-snug">{ticket.subject}</h1>
          <Select
            value={ticket.status}
            onValueChange={(v) => updateStatus.mutate(v as Status)}
          >
            <SelectTrigger className="w-36 h-9 text-sm shrink-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.values(TicketStatus).map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Metadata row */}
        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Mail className="size-3.5" />
            {ticket.senderName} &lt;{ticket.senderEmail}&gt;
          </span>
          {ticket.category && (
            <span className="inline-flex items-center gap-1.5">
              <Tag className="size-3.5" />
              {ticket.category}
            </span>
          )}
          <span className="inline-flex items-center gap-1.5">
            <Calendar className="size-3.5" />
            {new Date(ticket.createdAt).toLocaleDateString()}
          </span>
          <Badge variant={statusVariant[ticket.status.toLowerCase()] ?? "outline"}>
            {ticket.status}
          </Badge>
        </div>

        {/* Assignee row */}
        <div className="flex items-center gap-3 pt-1 border-t">
          <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground shrink-0">
            <UserCircle className="size-4" /> Assigned to
          </span>
          <Select
            value={ticket.assignedToId ?? "unassigned"}
            onValueChange={(v) => assignTicket.mutate(v === "unassigned" ? null : v)}
          >
            <SelectTrigger className="h-8 text-sm w-52">
              <SelectValue placeholder="Unassigned">
                {ticket.assignedToId
                  ? (ticket.assignedToName ?? "Loading…")
                  : <span className="text-muted-foreground">Unassigned</span>}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unassigned">
                <span className="text-muted-foreground">Unassigned</span>
              </SelectItem>
              {users?.filter((u) => u.role === UserRole.Agent).map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {assignTicket.isPending && (
            <span className="text-xs text-muted-foreground">Saving…</span>
          )}
        </div>
      </div>

      {/* Thread */}
      <div className="space-y-3">
        {ticket.replies.map((m) => {
          const isInbound = m.direction === "inbound";
          return (
            <div
              key={m.id}
              className={`flex flex-col gap-1 ${isInbound ? "items-start" : "items-end"}`}
            >
              <div
                className={`rounded-xl px-4 py-3 max-w-[80%] shadow-sm border-l-4 ${
                  isInbound
                    ? "bg-card border-primary"
                    : "bg-muted border-green-500"
                }`}
              >
                <div className="flex items-center justify-between gap-6 mb-1.5">
                  <span className="text-sm font-semibold">
                    {m.senderName ?? m.senderEmail}
                  </span>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(m.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.body}</p>
              </div>
              <span className="text-xs text-muted-foreground px-1">
                {isInbound ? "Customer" : "Agent"}
              </span>
            </div>
          );
        })}
      </div>

      <hr className="border-border" />

      {/* Reply form */}
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (reply.trim()) sendReply.mutate(reply.trim());
        }}
      >
        <p className="text-sm font-medium">Reply</p>
        <Textarea
          value={reply}
          placeholder="Write a reply…"
          onChange={(e) => setReply(e.target.value)}
          rows={4}
          className="text-sm resize-none"
        />
        <div className="flex gap-2">
          <Button type="submit" disabled={sendReply.isPending || !reply.trim()}>
            {sendReply.isPending ? "Sending…" : "Send reply"}
          </Button>
          {reply && (
            <Button type="button" variant="ghost" onClick={() => setReply("")}>
              Discard
            </Button>
          )}
        </div>
      </form>
    </section>
  );
}
