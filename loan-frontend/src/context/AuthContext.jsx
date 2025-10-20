// src/context/AuthContext.jsx
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import axios from "axios";

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

const TOKEN_URL = "http://127.0.0.1:8000/api/auth/token/";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // {username, is_staff}
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // restore session
    const raw = localStorage.getItem("auth");
    if (!raw) {
      setLoading(false);
      return;
    }
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    const r = await axios.post(TOKEN_URL, { username, password });
    const { access, refresh } = r.data;
    localStorage.setItem("auth", JSON.stringify({ access, refresh }));

    // fetch profile
    const me = await axios.get("http://127.0.0.1:8000/api/me/", {
      headers: { Authorization: `Bearer ${access}` },
    });
    setUser(me.data);
  };

  const logout = () => {
    localStorage.removeItem("auth");
    setUser(null);
    window.location.href = "/login";
  };

  const value = useMemo(() => ({ user, setUser, login, logout }), [user]);
  return (
    <AuthCtx.Provider value={value}>
      {!loading && children}
    </AuthCtx.Provider>
  );
}