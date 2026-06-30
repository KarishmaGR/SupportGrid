import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { api } from "../api.ts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { TicketStats } from "@supportgrid/shared";

function formatMinutes(minutes: number): string {
  if (minutes < 1) return "< 1 min";
  if (minutes < 60) return `${Math.round(minutes)}m`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function StatCard({
  label,
  value,
  sub,
  valueClass = "text-gray-900",
}: {
  label: string;
  value: string | number;
  sub?: string;
  valueClass?: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-gray-500">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <span className={`text-4xl font-bold ${valueClass}`}>{value}</span>
        {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function SkeletonCard() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <Skeleton className="h-4 w-24" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-10 w-16" />
      </CardContent>
    </Card>
  );
}

const STATUS_COLORS: Record<string, string> = {
  Open:       "#f59e0b",
  Resolved:   "#22c55e",
  Closed:     "#6b7280",
  New:        "#93c5fd",
  Processing: "#818cf8",
};

const DONUT_COLORS = ["#3b82f6", "#d1d5db"];

export function Dashboard() {
  const { data, isLoading, isError } = useQuery<TicketStats>({
    queryKey: ["ticket-stats"],
    queryFn: api.getTicketStats,
    refetchInterval: 30_000,
  });

  const aiRate =
    data && data.resolved > 0
      ? ((data.aiResolved / data.resolved) * 100).toFixed(1)
      : "0.0";

  const barData = data
    ? [
        { name: "New",        count: data.new },
        { name: "Processing", count: data.processing },
        { name: "Open",       count: data.open },
        { name: "Resolved",   count: data.resolved },
        { name: "Closed",     count: data.closed },
      ].filter((d) => d.count > 0)
    : [];

  const humanResolved = data ? data.resolved - data.aiResolved : 0;
  const donutData = data
    ? [
        { name: "AI Resolved",    value: data.aiResolved },
        { name: "Human Resolved", value: humanResolved },
      ].filter((d) => d.value > 0)
    : [];

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Overview of your support tickets</p>
      </div>

      {isError && (
        <p className="text-red-500 text-sm">Failed to load stats. Please refresh.</p>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        {isLoading || !data ? (
          Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)
        ) : (
          <>
            <StatCard label="Total Tickets" value={data.total} />
            <StatCard label="Open" value={data.open} valueClass="text-amber-500" />
            <StatCard label="Resolved by AI" value={data.aiResolved} valueClass="text-blue-600" />
            <StatCard
              label="AI Resolution Rate"
              value={`${aiRate}%`}
              sub={`${data.aiResolved} of ${data.resolved} resolved`}
              valueClass="text-purple-600"
            />
            <StatCard
              label="Avg Resolution Time"
              value={formatMinutes(data.avgResolutionMinutes)}
              sub="across resolved tickets"
              valueClass="text-green-600"
            />
          </>
        )}
      </div>

      {/* Charts */}
      {!isLoading && data && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Bar chart — ticket status breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold text-gray-700">
                Tickets by Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              {barData.length === 0 ? (
                <p className="text-sm text-gray-400 py-8 text-center">No data</p>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={barData} barSize={36}>
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                    <Tooltip
                      formatter={(v) => [v, "Tickets"]}
                      cursor={{ fill: "#f3f4f6" }}
                    />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {barData.map((entry) => (
                        <Cell
                          key={entry.name}
                          fill={STATUS_COLORS[entry.name] ?? "#94a3b8"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Donut chart — AI vs human resolution */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold text-gray-700">
                AI vs Human Resolution
              </CardTitle>
            </CardHeader>
            <CardContent>
              {donutData.length === 0 ? (
                <p className="text-sm text-gray-400 py-8 text-center">No resolved tickets yet</p>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie
                      data={donutData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={3}
                      dataKey="value"
                      label={({ name, percent }) =>
                        `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                      }
                      labelLine={false}
                    >
                      {donutData.map((_, i) => (
                        <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => [v, "Tickets"]} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <div>
        <Button render={<Link to="/tickets" />}>View all tickets</Button>
      </div>
    </div>
  );
}
