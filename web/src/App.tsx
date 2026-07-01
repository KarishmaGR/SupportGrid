import { Link, Outlet, useLocation } from "react-router-dom";
import { LayoutDashboard, Ticket, Users, LogOut } from "lucide-react";
import { UserRole } from "@supportgrid/shared";
import { useAuth } from "./auth.tsx";
import { cn } from "@/lib/utils";

function NavLink({
  to,
  icon: Icon,
  children,
}: {
  to: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  const { pathname } = useLocation();
  const active = pathname === to || (to !== "/dashboard" && pathname.startsWith(to));

  return (
    <Link
      to={to}
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium no-underline transition-colors",
        active
          ? "bg-white/10 text-white"
          : "text-white/60 hover:bg-white/8 hover:text-white",
      )}
    >
      <Icon className="size-4 shrink-0" />
      {children}
    </Link>
  );
}

export function App() {
  const { user, signOut } = useAuth();

  const initials = user?.name
    ? user.name.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 flex flex-col" style={{ backgroundColor: "#1c1c1e" }}>
        {/* Logo */}
        <div className="px-5 py-5 border-b border-white/10">
          <Link
            to="/dashboard"
            className="text-white text-lg font-semibold no-underline tracking-tight"
          >
            SupportGrid
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          <NavLink to="/dashboard" icon={LayoutDashboard}>Dashboard</NavLink>
          <NavLink to="/tickets" icon={Ticket}>Tickets</NavLink>
          {user?.role === UserRole.Admin && (
            <NavLink to="/users" icon={Users}>Users</NavLink>
          )}
        </nav>

        {/* User footer */}
        {user && (
          <div className="px-4 py-4 border-t border-white/10 flex items-center gap-3">
            <div
              className="size-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
              style={{ background: "linear-gradient(135deg, #2563eb, #7c3aed)" }}
            >
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user.name}</p>
              <p className="text-xs text-white/40 truncate">{user.role}</p>
            </div>
            <button
              onClick={signOut}
              title="Sign out"
              className="text-white/40 hover:text-white transition-colors cursor-pointer"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        )}
      </aside>

      {/* Main */}
      <div className="flex-1 overflow-y-auto bg-background">
        <main className="max-w-5xl mx-auto px-8 py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
