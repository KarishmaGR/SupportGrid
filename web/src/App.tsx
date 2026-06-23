import { Link, Outlet } from "react-router-dom";

export function App() {
  return (
    <div className="app">
      <header className="header">
        <Link to="/" className="brand">
        SupportGrid
        </Link>
      </header>
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
