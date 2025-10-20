import { NavLink } from "react-router-dom";
import { LayoutDashboard, Users, Landmark, Receipt, Settings } from "lucide-react";

const NavItem = ({ to, icon: Icon, label }) => (
  <NavLink
    to={to}
    className={({ isActive }) =>
      `group flex items-center gap-3 px-4 py-2 rounded-lg transition ${
        isActive
          ? "text-white border-l-4 border-blue-500 bg-neutral-900"
          : "text-neutral-300 hover:bg-neutral-900 hover:text-white border-l-4 border-transparent"
      }`
    }
  >
    <Icon size={18} className="opacity-80 group-hover:opacity-100" />
    <span className="text-sm">{label}</span>
  </NavLink>
);

export default function Sidebar() {
  return (
    <aside className="w-64 border-r border-neutral-800 bg-neutral-950 p-4">
      <NavLink to="/dashboard" className="mb-6 flex items-center gap-3 group">
        <img src="/src/assets/loanx_logo.png" alt="LoanX Capital" className="h-9 w-9 rounded-md" />
        <div>
          <div className="font-semibold text-white tracking-tight">LoanX Capital</div>
          <div className="text-[11px] text-neutral-400 -mt-0.5">AI-Powered Finance</div>
        </div>
      </NavLink>

      <nav className="space-y-2">
        <NavItem to="/dashboard" icon={LayoutDashboard} label="Dashboard" />
        <NavItem to="/customers" icon={Users} label="Customers" />
        <NavItem to="/loans" icon={Landmark} label="Loans" />
        <NavItem to="/payments" icon={Receipt} label="Payments" />
        <NavItem to="/settings" icon={Settings} label="Settings" />
      </nav>
    </aside>
  );
}