import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { App } from "./App.tsx";
import { AuthProvider } from "./auth.tsx";
import { ProtectedRoute } from "./ProtectedRoute.tsx";
import { LoginPage } from "./pages/Login.tsx";
import { TicketList } from "./pages/TicketList.tsx";
import { TicketDetailPage } from "./pages/TicketDetail.tsx";
import "./styles.css";

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<ProtectedRoute />}>
              <Route path="/" element={<App />}>
                <Route index element={<TicketList />} />
                <Route path="tickets/:id" element={<TicketDetailPage />} />
              </Route>
            </Route>
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);
