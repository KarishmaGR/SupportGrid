import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import type { SortingState } from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown, Search, X, Inbox, CheckCircle, XCircle, CircleDot } from "lucide-react";
import { TicketStatus, TicketCategory } from "@supportgrid/shared";
import type { Ticket, TicketStatus as Status, TicketCategory as Category } from "@supportgrid/shared";
import { api } from "../api.ts";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type SortCol = "subject" | "senderEmail" | "status" | "category" | "createdAt" | "updatedAt";

const badgeVariant: Record<string, "default" | "secondary" | "outline"> = {
  open: "default",
  resolved: "secondary",
  closed: "outline",
};

const col = createColumnHelper<Ticket>();

interface StatCardProps {
  label: string;
  value: number | undefined;
  icon: React.ReactNode;
  color: string;
  ring: string;
  active: boolean;
  onClick: () => void;
}

function StatCard({ label, value, icon, color, ring, active, onClick }: StatCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 rounded-xl border bg-card px-5 py-4 text-left shadow-sm transition-all hover:shadow-md focus:outline-none flex-1 min-w-[130px]",
        active && `ring-2 ${ring} shadow-md`,
      )}
    >
      <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full", color)}>
        {icon}
      </span>
      <div>
        <p className="text-2xl font-bold leading-none">{value ?? "—"}</p>
        <p className="text-xs text-muted-foreground mt-1 font-medium uppercase tracking-wide">{label}</p>
      </div>
    </button>
  );
}


export function TicketList() {
  const [status, setStatus]         = useState<Status | "">("");
  const [category, setCategory]     = useState<Category | "">("");
  const [inputValue, setInputValue] = useState("");
  const [search, setSearch]         = useState("");
  const [page, setPage]             = useState(1);
  const [sorting, setSorting]       = useState<SortingState>([]);

  const PAGE_SIZE = 10;

  useEffect(() => {
    const t = setTimeout(() => { setSearch(inputValue.trim()); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [inputValue]);

  useEffect(() => { setPage(1); }, [status, category, sorting]);

  const sortCol   = sorting[0]?.id as SortCol | undefined;
  const sortOrder = sorting[0] ? (sorting[0].desc ? "desc" : "asc") : undefined;

  const { data: stats } = useQuery({
    queryKey: ["ticket-stats"],
    queryFn: () => api.getTicketStats(),
  });

  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: ["tickets", status, category, search, sortCol, sortOrder, page],
    placeholderData: keepPreviousData,
    queryFn: () =>
      api.listTickets({
        ...(status   ? { status }   : {}),
        ...(category ? { category } : {}),
        ...(search   ? { search }   : {}),
        ...(sortCol  ? { sort: sortCol, order: sortOrder } : {}),
        page: String(page),
        pageSize: String(PAGE_SIZE),
      }),
  });

  const columns = [
    col.accessor("subject", {
      header: "Subject",
      enableSorting: true,
      cell: (info) => (
        <Link to={`/tickets/${info.row.original.id}`} className="text-primary hover:underline font-medium">
          {info.getValue()}
        </Link>
      ),
    }),
    col.accessor("senderEmail", {
      header: "Requester",
      enableSorting: true,
    }),
    col.accessor("status", {
      header: "Status",
      enableSorting: true,
      cell: (info) => (
        <Badge variant={badgeVariant[info.getValue().toLowerCase()] ?? "outline"}>
          {info.getValue()}
        </Badge>
      ),
    }),
    col.accessor("category", {
      header: "Category",
      enableSorting: true,
      cell: (info) => info.getValue() ?? <span className="text-muted-foreground">—</span>,
    }),
    col.accessor("assignedToName", {
      header: "Assigned to",
      enableSorting: false,
      cell: (info) => info.getValue() ?? <span className="text-muted-foreground text-xs">Unassigned</span>,
    }),
    col.accessor("createdAt", {
      header: "Created",
      enableSorting: true,
      cell: (info) => new Date(info.getValue()).toLocaleDateString(),
    }),
  ];

  const table = useReactTable({
    data: data?.items ?? [],
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    manualSorting: true,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const clearAll = () => {
    setStatus("");
    setCategory("");
    setInputValue("");
    setSearch("");
    setPage(1);
  };

  const hasFilters = !!status || !!category || !!search;
  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 1;
  const rangeStart = (page - 1) * PAGE_SIZE + 1;
  const rangeEnd   = data ? Math.min(page * PAGE_SIZE, data.total) : 0;

  const pageButtons: (number | "…")[] = (() => {
    const pages = Array.from({ length: totalPages }, (_, i) => i + 1)
      .filter((n) => n === 1 || n === totalPages || Math.abs(n - page) <= 1);
    return pages.reduce<(number | "…")[]>((acc, n, idx, arr) => {
      if (idx > 0 && n - (arr[idx - 1] as number) > 1) acc.push("…");
      acc.push(n);
      return acc;
    }, []);
  })();

  const toggleStatus = (s: Status) => setStatus((prev) => (prev === s ? "" : s));

  if (isLoading) return <p className="text-muted-foreground">Loading tickets…</p>;
  if (error)     return <p className="text-destructive">{(error as Error).message}</p>;

  return (
    <section className="space-y-5">
      <h1 className="text-3xl font-semibold">Tickets</h1>

      {/* Stat cards */}
      <div className="flex gap-3 flex-wrap">
        <StatCard
          label="Total"
          value={stats?.total}
          icon={<Inbox className="size-5 text-violet-600" />}
          color="bg-violet-100"
          ring="ring-violet-400"
          active={false}
          onClick={clearAll}
        />
        <StatCard
          label="Open"
          value={stats?.open}
          icon={<CircleDot className="size-5 text-blue-600" />}
          color="bg-blue-100"
          ring="ring-blue-400"
          active={status === "Open"}
          onClick={() => toggleStatus("Open")}
        />
        <StatCard
          label="Resolved"
          value={stats?.resolved}
          icon={<CheckCircle className="size-5 text-green-600" />}
          color="bg-green-100"
          ring="ring-green-400"
          active={status === "Resolved"}
          onClick={() => toggleStatus("Resolved")}
        />
        <StatCard
          label="Closed"
          value={stats?.closed}
          icon={<XCircle className="size-5 text-gray-500" />}
          color="bg-gray-100"
          ring="ring-gray-400"
          active={status === "Closed"}
          onClick={() => toggleStatus("Closed")}
        />
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Search subject, sender, body…"
            className="pl-8 h-10"
          />
        </div>

        <Select value={status} onValueChange={(v) => setStatus(v as Status | "")}>
          <SelectTrigger className="w-36 h-10">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All statuses</SelectItem>
            {Object.values(TicketStatus).map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={category} onValueChange={(v) => setCategory(v as Category | "")}>
          <SelectTrigger className="w-36 h-10">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All categories</SelectItem>
            {Object.values(TicketCategory).map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasFilters && (
          <Button variant="ghost" size="sm" className="h-10 gap-1 text-muted-foreground" onClick={clearAll}>
            <X className="size-3.5" /> Clear
          </Button>
        )}
      </div>

      {/* Table */}
      <div className={cn("rounded-md border overflow-auto max-h-[calc(100vh-380px)] transition-opacity duration-150", isFetching && "opacity-60")}>
        <Table>
          <TableHeader className="sticky top-0 bg-background z-10">
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    onClick={header.column.getToggleSortingHandler()}
                    className={header.column.getCanSort() ? "cursor-pointer select-none" : ""}
                  >
                    <span className="inline-flex items-center gap-1">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getCanSort() && (
                        header.column.getIsSorted() === "asc" ? (
                          <ArrowUp className="size-3.5" />
                        ) : header.column.getIsSorted() === "desc" ? (
                          <ArrowDown className="size-3.5" />
                        ) : (
                          <ArrowUpDown className="size-3.5 text-muted-foreground/50" />
                        )
                      )}
                    </span>
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center text-muted-foreground py-10">
                  No tickets match your filters.
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {data && data.total > 0 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{rangeStart}–{rangeEnd} of {data.total} tickets</span>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(1)}>«</Button>
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>‹ Prev</Button>
            {pageButtons.map((n, i) =>
              n === "…" ? (
                <span key={`ellipsis-${i}`} className="px-2">…</span>
              ) : (
                <Button
                  key={n}
                  variant={page === n ? "default" : "outline"}
                  size="sm"
                  className="w-8"
                  onClick={() => setPage(n)}
                >
                  {n}
                </Button>
              )
            )}
            <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(page + 1)}>Next ›</Button>
            <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(totalPages)}>»</Button>
          </div>
        </div>
      )}
    </section>
  );
}
