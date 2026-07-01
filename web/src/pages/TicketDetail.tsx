import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { useState } from "react";
import { TicketStatus, TicketCategory, UserRole, SenderType } from "@supportgrid/shared";
import type { TicketStatus as Status, TicketCategory as Category } from "@supportgrid/shared";
import { api } from "../api.ts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Mail, Calendar, Sparkles, RefreshCw } from "lucide-react";

function plainToHtml(text: string): string {
  const escape = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return text
    .split(/\n\n+/)
    .map((para) => `<p>${para.split("\n").map(escape).join("<br>")}</p>`)
    .join("\n");
}

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

  const updateTicket = useMutation({
    mutationFn: (patch: Parameters<typeof api.updateTicket>[1]) =>
      api.updateTicket(id!, patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket", id] });
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      queryClient.invalidateQueries({ queryKey: ["ticket-stats"] });
    },
  });

  const sendReply = useMutation({
    mutationFn: (body: string) => api.addReply(id!, body, plainToHtml(body)),
    onSuccess: () => {
      setReply("");
      queryClient.invalidateQueries({ queryKey: ["ticket", id] });
    },
  });

  const polishReply = useMutation({
    mutationFn: (draft: string) => api.polishReply(id!, draft, ticket?.body ?? "", ticket?.senderName),
    onSuccess: (data) => setReply(data.polished),
  });

  const summarize = useMutation({
    mutationFn: () => api.summarizeTicket(id!),
  });

  if (isLoading) return <p className="text-muted-foreground">Loading…</p>;
  if (error)     return <p className="text-destructive">{(error as Error).message}</p>;
  if (!ticket)   return <p>Not found.</p>;

  const agents = users?.filter((u) => u.role === UserRole.Agent) ?? [];

  return (
    <div className="space-y-4">
      {/* Back link */}
      <Link
        to="/tickets"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground no-underline"
      >
        <ArrowLeft className="size-3.5" /> Back to tickets
      </Link>

      {/* Subject + meta */}
      <div>
        <h1 className="text-2xl font-semibold leading-snug">{ticket.subject}</h1>
        <div className="flex flex-wrap gap-4 mt-1 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Mail className="size-3.5" />
            {ticket.senderName} &lt;{ticket.senderEmail}&gt;
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Calendar className="size-3.5" />
            {new Date(ticket.createdAt).toLocaleDateString()}
          </span>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="flex gap-6 items-start">

        {/* Left — thread + reply */}
        <div className="flex-1 min-w-0 space-y-3">
          {/* Original message */}
          <div className="flex flex-col gap-1 items-start">
            <div className="rounded-xl px-4 py-3 max-w-[85%] shadow-sm border-l-4 bg-card border-primary">
              <div className="flex items-center justify-between gap-6 mb-1.5">
                <span className="text-sm font-semibold">{ticket.senderName || ticket.senderEmail}</span>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {new Date(ticket.createdAt).toLocaleString()}
                </span>
              </div>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{ticket.body}</p>
            </div>
            <span className="text-xs text-muted-foreground px-1">Customer</span>
          </div>

          {/* Replies */}
          {ticket.replies.map((m) => {
            const isCustomer = m.senderType === SenderType.Customer;
            return (
              <div
                key={m.id}
                className={`flex flex-col gap-1 ${isCustomer ? "items-start" : "items-end"}`}
              >
                <div
                  className={`rounded-xl px-4 py-3 max-w-[85%] shadow-sm border-l-4 ${
                    isCustomer ? "bg-card border-primary" : "bg-muted border-green-500"
                  }`}
                >
                  <div className="flex items-center justify-between gap-6 mb-1.5">
                    <span className="text-sm font-semibold">{m.senderName ?? m.senderEmail}</span>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(m.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.body}</p>
                </div>
                <span className="text-xs text-muted-foreground px-1">
                  {isCustomer ? "Customer" : "Agent"}
                </span>
              </div>
            );
          })}

          {/* Summarize */}
          <div className="pt-1 space-y-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={summarize.isPending}
              onClick={() => summarize.mutate()}
            >
              <Sparkles className="size-3.5 mr-1.5" />
              {summarize.isPending
                ? "Summarizing…"
                : summarize.data
                ? "Re-generate summary"
                : "Summarize conversation"}
              {summarize.data && !summarize.isPending && (
                <RefreshCw className="size-3 ml-1.5" />
              )}
            </Button>
            {summarize.isError && (
              <p className="text-xs text-destructive">{(summarize.error as Error).message}</p>
            )}
            {summarize.data && (
              <div className="rounded-lg border border-border/60 bg-card px-4 py-3 text-sm leading-relaxed shadow-sm">
                <p className="mb-2">
                  <span
                    className="inline-flex items-center gap-1 text-xs font-semibold px-1.5 py-0.5 rounded-md text-white"
                    style={{ background: "linear-gradient(135deg, #2563eb, #7c3aed)" }}
                  >
                    AI Summary
                  </span>
                </p>
                <p className="text-muted-foreground">{summarize.data.summary}</p>
              </div>
            )}
          </div>

          {/* Reply form */}
          <form
            className="pt-2 space-y-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (reply.trim()) sendReply.mutate(reply.trim());
            }}
          >
            <Textarea
              value={reply}
              placeholder="Write a reply…"
              onChange={(e) => setReply(e.target.value)}
              rows={4}
              className="text-sm resize-none"
            />
            <div className="flex gap-2">
              {reply.trim() && (
                <Button
                  type="button"
                  variant="outline"
                  disabled={polishReply.isPending}
                  onClick={() => polishReply.mutate(reply.trim())}
                >
                  <Sparkles className="size-3.5 mr-1.5" />
                  {polishReply.isPending ? "Polishing…" : "Polish"}
                </Button>
              )}
              <Button type="submit" disabled={sendReply.isPending || !reply.trim()}>
                {sendReply.isPending ? "Sending…" : "Send reply"}
              </Button>
              {reply && (
                <Button type="button" variant="ghost" onClick={() => setReply("")}>
                  Discard
                </Button>
              )}
            </div>
            {polishReply.isError && (
              <p className="text-xs text-destructive">{(polishReply.error as Error).message}</p>
            )}
          </form>
        </div>

        {/* Right — properties sidebar */}
        <aside className="w-56 shrink-0 rounded-xl border border-border/60 bg-card p-4 shadow-sm space-y-5">
          {/* Status */}
          <div className="space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</p>
            <Select
              value={ticket.status}
              onValueChange={(v) => updateTicket.mutate({ status: v as Status })}
            >
              <SelectTrigger className="h-8 text-sm w-full">
                <Badge variant={statusVariant[ticket.status.toLowerCase()] ?? "outline"}>
                  {ticket.status}
                </Badge>
              </SelectTrigger>
              <SelectContent>
                {Object.values(TicketStatus).map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Category</p>
            <Select
              value={ticket.category ?? "none"}
              onValueChange={(v) =>
                updateTicket.mutate({ category: v === "none" ? null : (v as Category) })
              }
            >
              <SelectTrigger className="h-8 text-sm w-full">
                <SelectValue>
                  {ticket.category ?? <span className="text-muted-foreground">None</span>}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">
                  <span className="text-muted-foreground">None</span>
                </SelectItem>
                {Object.values(TicketCategory).map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Assignee */}
          <div className="space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Assigned to</p>
            <Select
              value={ticket.assignedToId ?? "unassigned"}
              onValueChange={(v) =>
                updateTicket.mutate({ assignedToId: v === "unassigned" ? null : v })
              }
            >
              <SelectTrigger className="h-8 text-sm w-full">
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
                {agents.map((u) => (
                  <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {updateTicket.isPending && (
            <p className="text-xs text-muted-foreground">Saving…</p>
          )}
        </aside>
      </div>
    </div>
  );
}
