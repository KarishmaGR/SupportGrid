import { useQuery } from "@tanstack/react-query";
import { UserRole } from "@supportgrid/shared";
import { api } from "../api.ts";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

export function UsersPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["users"],
    queryFn: () => api.listUsers(),
  });

  if (isLoading) return (
    <section>
      <div className="mb-4">
        <h1 className="text-3xl font-semibold">Users</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage system users</p>
      </div>
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-4">
            <Skeleton className="h-8 w-1/4" />
            <Skeleton className="h-8 w-1/3" />
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-8 w-1/4" />
          </div>
        ))}
      </div>
    </section>
  );
  if (error) return <p className="text-destructive">{(error as Error).message}</p>;

  return (
    <section>
      <div className="mb-4">
        <h1 className="text-3xl font-semibold">Users</h1>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data!.map((u) => (
            <TableRow key={u.id}>
              <TableCell className="font-medium">{u.name}</TableCell>
              <TableCell>{u.email}</TableCell>
              <TableCell>
                <Badge variant={u.role === UserRole.Admin ? "default" : "secondary"}>
                  {u.role}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant={u.active ? "outline" : "secondary"}>
                  {u.active ? "Active" : "Inactive"}
                </Badge>
              </TableCell>
              <TableCell>{new Date(u.createdAt).toLocaleString()}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      
    </section>
  );
}
