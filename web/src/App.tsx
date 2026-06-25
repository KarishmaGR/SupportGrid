import { Link, Outlet } from "react-router-dom";
import { UserRole } from "@supportgrid/shared";
import { useAuth } from "./auth.tsx";
import { Button } from "@/components/ui/button";

export function App() {
  const { user, signOut } = useAuth();

  return (
    <div>
      <header className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-6">
          <Link to="/dashboard" className="text-gray-900 text-xl font-semibold no-underline">
            SupportGrid
          </Link>
          {user?.role === UserRole.Admin && (
            <Link to="/users" className="text-sm font-medium text-gray-600 hover:text-gray-900 no-underline">
              Users
            </Link>
          )}
        </div>
        {user && (
          <div className="flex items-center gap-4">
            <span className="text-gray-500 text-base">{user.name}</span>
            <Button variant="outline" size="sm" onClick={signOut}>
              Sign out
            </Button>
          </div>
        )}
      </header>
      <main className="max-w-[960px] mx-auto my-6 px-4">
        <Outlet />
      </main>
    </div>
  );
}
