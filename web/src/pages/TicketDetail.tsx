import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { useState } from "react";
import { TicketStatus } from "@supportgrid/shared";
import type { TicketStatus as Status } from "@supportgrid/shared";
import { api } from "../api.ts";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

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

  if (isLoading) return <p className="text-muted-foreground">Loading…</p>;
  if (error) return <p className="text-destructive">{(error as Error).message}</p>;
  if (!ticket) return <p>Not found.</p>;

  return (
    <section>
      <Link to="/" className="text-muted-foreground text-sm hover:underline">
        ← Back to tickets
      </Link>
      <h1 className="text-3xl font-semibold mt-2 mb-1">{ticket.subject}</h1>
      <div className="flex gap-4 items-center mb-6">
        <span className="text-muted-foreground text-base">From: {ticket.requesterEmail}</span>
        <Select
          value={ticket.status}
          onValueChange={(v) => updateStatus.mutate(v as Status)}
        >
          <SelectTrigger className="w-40 h-10 text-base">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.values(TicketStatus).map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-3">
        {ticket.messages.map((m) => (
          <div
            key={m.id}
            className={`px-4 py-3 rounded-lg bg-card ring-1 ring-foreground/10 max-w-[80%] border-l-[3px] ${
              m.direction === "inbound"
                ? "self-start border-primary"
                : "self-end border-green-600"
            }`}
          >
            <div className="font-semibold text-base mb-1">{m.from}</div>
            <div className="whitespace-pre-wrap text-sm leading-relaxed">{m.body}</div>
            <div className="text-muted-foreground text-xs mt-2">
              {new Date(m.createdAt).toLocaleString()}
            </div>
          </div>
        ))}
      </div>

      <form
        className="mt-6 flex flex-col gap-3"
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
          className="text-base"
        />
        <Button type="submit" size="lg" disabled={sendReply.isPending} className="self-start">
          {sendReply.isPending ? "Sending…" : "Send reply"}
        </Button>
      </form>
    </section>
  );
}
