import { useNavigate } from "react-router-dom";
import { clearTokens } from "../services/auth";

export default function Header() {
  const nav = useNavigate();
  return (
    <header className="sticky top-0 z-10 border-b border-neutral-800 bg-neutral-950/70 backdrop-blur px-6 py-3">
      <div className="flex items-center justify-between">
        <div />
        <button
          onClick={() => {
            clearTokens();
            nav("/login");
          }}
          className="rounded-lg border border-neutral-700 px-3 py-1.5 text-sm text-neutral-200 hover:bg-neutral-800"
        >
          Logout
        </button>
      </div>
    </header>
  );
}