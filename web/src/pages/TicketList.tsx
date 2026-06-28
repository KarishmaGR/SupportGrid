import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useState } from "react";
import { TicketStatus } from "@supportgrid/shared";
import type { TicketStatus as Status } from "@supportgrid/shared";
import { api } from "../api.ts";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const badgeVariant: Record<string, "default" | "secondary" | "outline"> = {
  open: "default",
  resolved: "secondary",
  closed: "outline",
};

export function TicketList() {
  const [status, setStatus] = useState<Status | "">("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["tickets", status],
    queryFn: () => api.listTickets(status ? { status } : {}),
  });

  if (isLoading) return <p className="text-muted-foreground">Loading tickets…</p>;
  if (error) return <p className="text-destructive">{(error as Error).message}</p>;

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-3xl font-semibold">Tickets</h1>
        <Select value={status} onValueChange={(v) => setStatus(v as Status | "")}>
          <SelectTrigger className="w-44 h-10 text-base">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All statuses</SelectItem>
            {Object.values(TicketStatus).map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Subject</TableHead>
            <TableHead>Requester</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Created</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data!.items.map((t) => (
            <TableRow key={t.id}>
              <TableCell>
                <Link to={`/tickets/${t.id}`} className="text-primary hover:underline">
                  {t.subject}
                </Link>
              </TableCell>
              <TableCell>{t.senderEmail}</TableCell>
              <TableCell>
                <Badge variant={badgeVariant[t.status.toLowerCase()] ?? "outline"}>
                  {t.status}
                </Badge>
              </TableCell>
              <TableCell>{t.category ?? "—"}</TableCell>
              <TableCell>{new Date(t.createdAt).toLocaleString()}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <p className="text-muted-foreground text-sm mt-2">
        {data!.total} ticket(s) · page {data!.page}
      </p>
    </section>
  );
}
