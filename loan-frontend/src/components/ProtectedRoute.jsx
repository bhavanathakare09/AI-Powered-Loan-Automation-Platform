// src/components/ProtectedRoute.jsx
import { Navigate, Outlet } from "react-router-dom";
import { isAuthed } from "../services/auth";

export default function ProtectedRoute() {
  if (!isAuthed()) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
}