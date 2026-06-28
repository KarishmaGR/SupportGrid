import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Pencil, Trash2 } from "lucide-react";
import { UserRole } from "@supportgrid/shared";
import type { User } from "@supportgrid/shared";
import { api } from "../api.ts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const createSchema = z.object({
  name: z.string().trim().min(3, "Name must be at least 3 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const editSchema = z.object({
  name: z.string().trim().min(3, "Name must be at least 3 characters"),
  email: z.string().email("Invalid email address"),
  password: z.union([
    z.string().min(8, "Password must be at least 8 characters"),
    z.literal(""),
  ]),
});

type CreateUserForm = z.infer<typeof createSchema>;
type EditUserForm = z.infer<typeof editSchema>;

type DialogMode = { type: "create" } | { type: "edit"; user: User };

export function UsersPage() {
  const [dialog, setDialog] = useState<DialogMode | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["users"],
    queryFn: () => api.listUsers(),
  });

  const isEdit = dialog?.type === "edit";

  const createForm = useForm<CreateUserForm>({ resolver: zodResolver(createSchema) });
  const editForm = useForm<EditUserForm>({ resolver: zodResolver(editSchema) });

  const activeForm = isEdit ? editForm : createForm;
  const { formState: { errors } } = activeForm;

  const createMutation = useMutation({
    mutationFn: api.createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      closeDialog();
    },
  });

  const editMutation = useMutation({
    mutationFn: ({ id, ...input }: { id: string; name: string; email: string; password: string }) => {
      const patch: { name: string; email: string; password?: string } = { name: input.name, email: input.email };
      if (input.password) patch.password = input.password;
      return api.updateUser(id, patch);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      closeDialog();
    },
  });

  const activeMutation = isEdit ? editMutation : createMutation;

  const deleteMutation = useMutation({
    mutationFn: api.deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setDeleteTarget(null);
    },
  });

  function openCreate() {
    createForm.reset();
    createMutation.reset();
    setDialog({ type: "create" });
  }

  function openEdit(user: User) {
    editForm.reset({ name: user.name, email: user.email, password: "" });
    editMutation.reset();
    setDialog({ type: "edit", user });
  }

  function closeDialog() {
    setDialog(null);
    createForm.reset();
    editForm.reset();
    createMutation.reset();
    editMutation.reset();
  }

  const onSubmitCreate = (data: CreateUserForm) => {
    createMutation.mutate({ ...data, role: UserRole.Agent });
  };

  const onSubmitEdit = (data: EditUserForm) => {
    if (dialog?.type !== "edit") return;
    editMutation.mutate({ id: dialog.user.id, name: data.name, email: data.email, password: data.password });
  };

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
            <Skeleton className="h-8 w-1/4" />
          </div>
        ))}
      </div>
    </section>
  );
  if (error) return <p className="text-destructive">{(error as Error).message}</p>;

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-3xl font-semibold">Users</h1>
        <Button onClick={openCreate}>New User</Button>
      </div>

      <Dialog open={dialog !== null} onOpenChange={(open) => { if (!open) closeDialog(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{isEdit ? "Edit User" : "Create New User"}</DialogTitle>
          </DialogHeader>

          {isEdit ? (
            <form onSubmit={editForm.handleSubmit(onSubmitEdit)} className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="edit-name">Name</Label>
                <Input
                  id="edit-name"
                  {...editForm.register("name")}
                  placeholder="Full name"
                  className={errors.name ? "border-destructive" : ""}
                />
                {errors.name && <p className="text-destructive text-sm">{errors.name.message}</p>}
              </div>

              <div className="space-y-1">
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  {...editForm.register("email")}
                  placeholder="user@example.com"
                  className={errors.email ? "border-destructive" : ""}
                />
                {errors.email && <p className="text-destructive text-sm">{errors.email.message}</p>}
              </div>

              <div className="space-y-1">
                <Label htmlFor="edit-password">Password <span className="text-muted-foreground text-xs">(leave blank to keep unchanged)</span></Label>
                <Input
                  id="edit-password"
                  type="password"
                  {...editForm.register("password")}
                  placeholder="New password (optional)"
                  className={errors.password ? "border-destructive" : ""}
                />
                {errors.password && <p className="text-destructive text-sm">{errors.password.message}</p>}
              </div>

              {editMutation.error && (
                <p className="text-destructive text-sm">{(editMutation.error as Error).message}</p>
              )}

              <div className="flex gap-2 pt-2">
                <Button type="submit" disabled={editMutation.isPending}>
                  {editMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
                <Button type="button" variant="outline" onClick={closeDialog}>Cancel</Button>
              </div>
            </form>
          ) : (
            <form onSubmit={createForm.handleSubmit(onSubmitCreate)} className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="create-name">Name</Label>
                <Input
                  id="create-name"
                  {...createForm.register("name")}
                  placeholder="Full name"
                  className={createForm.formState.errors.name ? "border-destructive" : ""}
                />
                {createForm.formState.errors.name && (
                  <p className="text-destructive text-sm">{createForm.formState.errors.name.message}</p>
                )}
              </div>

              <div className="space-y-1">
                <Label htmlFor="create-email">Email</Label>
                <Input
                  id="create-email"
                  type="email"
                  {...createForm.register("email")}
                  placeholder="user@example.com"
                  className={createForm.formState.errors.email ? "border-destructive" : ""}
                />
                {createForm.formState.errors.email && (
                  <p className="text-destructive text-sm">{createForm.formState.errors.email.message}</p>
                )}
              </div>

              <div className="space-y-1">
                <Label htmlFor="create-password">Password</Label>
                <Input
                  id="create-password"
                  type="password"
                  {...createForm.register("password")}
                  placeholder="Min 8 characters"
                  className={createForm.formState.errors.password ? "border-destructive" : ""}
                />
                {createForm.formState.errors.password && (
                  <p className="text-destructive text-sm">{createForm.formState.errors.password.message}</p>
                )}
              </div>

              {createMutation.error && (
                <p className="text-destructive text-sm">{(createMutation.error as Error).message}</p>
              )}

              <div className="flex gap-2 pt-2">
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Creating..." : "Create User"}
                </Button>
                <Button type="button" variant="outline" onClick={closeDialog}>Cancel</Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => { if (!open) { setDeleteTarget(null); deleteMutation.reset(); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will deactivate the account. The user will no longer be able to log in.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteMutation.error && (
            <p className="text-destructive text-sm px-1">{(deleteMutation.error as Error).message}</p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
              onClick={(e) => {
                e.preventDefault();
                if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
              }}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Created</TableHead>
            <TableHead />
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
              <TableCell>{new Date(u.createdAt).toLocaleString()}</TableCell>
              <TableCell>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Edit ${u.name}`}
                    onClick={() => openEdit(u)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  {u.role !== UserRole.Admin && (
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Delete ${u.name}`}
                      onClick={() => setDeleteTarget(u)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </section>
  );
}
