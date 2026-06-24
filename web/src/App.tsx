import { Link, Outlet } from "react-router-dom";
import { useAuth } from "./auth.tsx";

export function App() {
  const { user, signOut } = useAuth();

  return (
    <div className="app">
      <header className="header">
        <Link to="/" className="brand">SupportGrid</Link>
        {user && (
          <div className="header-right">
            <span className="header-user">{user.name}</span>
            <button className="btn-ghost" onClick={signOut}>Sign out</button>
          </div>
        )}
      </header>
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
