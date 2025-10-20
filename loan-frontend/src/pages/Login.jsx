// import { useState } from "react";
// import { useNavigate, Navigate } from "react-router-dom";
// import { loginUser } from "../services/api";
// import { saveTokens, getAccessToken } from "../services/auth";

// export default function Login() {
//   const nav = useNavigate();
//   const [username, setUsername] = useState("");
//   const [password, setPassword] = useState("");
//   const [error, setError] = useState("");
//   const [loading, setLoading] = useState(false);

//   // If already logged in, don't show login page
//   if (getAccessToken()) {
//     return <Navigate to="/dashboard" replace />;
//   }

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     setError("");
//     if (!username || !password) {
//       setError("Enter username and password.");
//       return;
//     }

//     try {
//       setLoading(true);
//       const data = await loginUser(username.trim(), password);
//       if (!data?.access || !data?.refresh) {
//         throw new Error("Malformed token response");
//       }
//       saveTokens({ access: data.access, refresh: data.refresh });
//       nav("/dashboard", { replace: true });
//     } catch (err) {
//       console.error("Login failed:", err);
//       const msg =
//         err?.response?.status === 401
//           ? "Invalid username or password."
//           : err?.response?.data?.detail ||
//             err?.message ||
//             "Login failed. Is the API running?";
//       setError(msg);
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div className="min-h-screen grid place-items-center bg-neutral-950 text-neutral-100">
//       <form
//         onSubmit={handleSubmit}
//         className="w-full max-w-sm space-y-4 rounded-xl border border-neutral-800 bg-neutral-900/60 p-6 backdrop-blur"
//       >
//         <div className="space-y-1">
//           <h1 className="text-xl font-semibold">LoanX Capital</h1>
//           <p className="text-xs text-neutral-400">Sign in to continue</p>
//         </div>

//         {error && (
//           <div className="rounded-md bg-red-500/15 border border-red-500/40 px-3 py-2 text-sm text-red-300">
//             {error}
//           </div>
//         )}

//         <div>
//           <label className="text-sm text-neutral-300">Username</label>
//           <input
//             autoComplete="username"
//             className="mt-1 w-full rounded-md bg-neutral-800 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500/40"
//             value={username}
//             onChange={(e) => setUsername(e.target.value)}
//             placeholder="your_username"
//           />
//         </div>

//         <div>
//           <label className="text-sm text-neutral-300">Password</label>
//           <input
//             type="password"
//             autoComplete="current-password"
//             className="mt-1 w-full rounded-md bg-neutral-800 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500/40"
//             value={password}
//             onChange={(e) => setPassword(e.target.value)}
//             placeholder="••••••••"
//           />
//         </div>

//         <button
//           disabled={loading}
//           className="w-full rounded-md bg-blue-600 py-2 font-medium hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed"
//         >
//           {loading ? "Signing in..." : "Sign in"}
//         </button>
//       </form>
//     </div>
//   );
// }


// src/pages/Login.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Auth } from "../services/api";
import { saveTokens, clearTokens } from "../services/auth";

export default function Login() {
  const nav = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      const tokens = await Auth.login({ username, password });
      saveTokens(tokens);
      nav("/dashboard", { replace: true });
    } catch (error) {
      console.error("Login failed:", error);
      clearTokens();
      setErr("Invalid credentials. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen grid place-items-center bg-neutral-950 text-neutral-100">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-xl border border-neutral-800 bg-neutral-900 p-6 shadow-xl"
      >
        <h1 className="mb-6 text-xl font-semibold">Sign in to LoanX Capital</h1>

        <label className="mb-2 block text-sm">Username</label>
        <input
          className="mb-4 w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm outline-none focus:border-blue-500"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="your username"
          autoComplete="username"
        />

        <label className="mb-2 block text-sm">Password</label>
        <input
          className="mb-4 w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm outline-none focus:border-blue-500"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          autoComplete="current-password"
        />

        {err && (
          <div className="mb-3 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {err}
          </div>
        )}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium hover:bg-blue-500 disabled:opacity-60"
        >
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}