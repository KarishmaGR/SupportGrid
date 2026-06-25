import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "../api.ts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TicketStatus, type Paginated, type Ticket } from "@supportgrid/shared";

export function Dashboard() {
  const { data } = useQuery<Paginated<Ticket>>({
    queryKey: ["tickets"],
    queryFn: () => api.listTickets(),
  });

  const tickets = data?.items ?? [];
  const open = tickets.filter((t) => t.status === TicketStatus.Open).length;
  const inProgress = tickets.filter((t) => t.status === TicketStatus.Closed).length;
  const resolved = tickets.filter((t) => t.status === TicketStatus.Resolved).length;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Overview of your support tickets</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Open</CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-4xl font-bold text-gray-900">{open}</span>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">In Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-4xl font-bold text-blue-600">{inProgress}</span>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Resolved</CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-4xl font-bold text-green-600">{resolved}</span>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-4">
        <Button render={<Link to="/tickets" />}>View all tickets</Button>
      </div>
    </div>
  );
}
