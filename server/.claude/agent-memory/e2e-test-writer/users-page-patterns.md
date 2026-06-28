---
name: users-page-patterns
description: Patterns and selector knowledge for the /users page E2E tests (CRUD via dialog/alertdialog)
metadata:
  type: project
---

The Users page at `/users` uses shadcn Dialog for create/edit and AlertDialog for delete confirmation.

**Key selectors:**
- "New User" button: `getByRole("button", { name: /new user/i })`
- Create dialog heading: `getByRole("heading", { name: /create new user/i })`
- Edit dialog heading: `getByRole("heading", { name: /edit user/i })`
- Form fields use `htmlFor` labels with IDs `create-name`, `create-email`, `create-password`, `edit-name`, `edit-email`, `edit-password` — but `getByLabel(/^name$/i)` works inside the open dialog since only one dialog is mounted at a time
- Submit create: `getByRole("button", { name: /create user/i })`
- Submit edit: `getByRole("button", { name: /save changes/i })`
- Delete button per row: `aria-label="Delete {user.name}"` — select via `getByRole("button", { name: /delete <name>/i })` scoped to the row
- Edit button per row: `aria-label="Edit {user.name}"`
- AlertDialog confirm button label is "Delete" (exact), cancel is "Cancel"

**Isolation pattern:** Each CRUD test creates its own fresh agent user via `createAgentViaUI()` helper (fills the form through the UI) so tests don't share mutable state. Unique timestamps in names/emails (`Date.now()`) prevent collisions.

**Admin user:** Has no delete button (UsersPage conditionally renders Trash2 only for non-Admin rows). Edit button is still present for the admin row.

**Why:** [[project-e2e-setup]]
