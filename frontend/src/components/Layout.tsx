import { NavLink, Outlet, useLocation } from "react-router-dom";
import { Icon, IconName } from "./Icon";

const tabs: { to: string; label: string; icon: IconName }[] = [
  { to: "/", label: "Сводка", icon: "dashboard" },
  { to: "/cars", label: "Гараж", icon: "car" },
  { to: "/sold", label: "Продано", icon: "sold" },
  { to: "/plans", label: "План", icon: "calendar" },
];

function Logo() {
  return (
    <div
      className="w-10 h-10 rounded-[13px] overflow-hidden shrink-0"
      style={{
        boxShadow:
          "inset 0 0 0 1px rgba(255,255,255,0.14), 0 4px 12px -2px rgba(0,0,0,0.55)",
      }}
    >
      <img
        src="/icon-192.png"
        alt="Матвей"
        width={40}
        height={40}
        style={{ display: "block", width: "100%", height: "100%", objectFit: "cover" }}
      />
    </div>
  );
}

export default function Layout() {
  const loc = useLocation();
  const pageTitle =
    tabs.find((t) => (t.to === "/" ? loc.pathname === "/" : loc.pathname.startsWith(t.to)))?.label ?? "";

  return (
    <div className="flex flex-col" style={{ minHeight: "var(--tg-height)" }}>
      <div
        aria-hidden
        className="fixed inset-x-0 top-0 z-40 pointer-events-none"
        style={{ height: "env(safe-area-inset-top)", background: "#1e2942" }}
      />

      <header
        className="px-5 pb-3"
        style={{ paddingTop: "calc(env(safe-area-inset-top) + 0.875rem)" }}
      >
        <div className="flex items-center gap-3">
          <Logo />
          <div className="leading-tight">
            <div className="text-[10px] uppercase tracking-widest2 text-ink-mute font-semibold">
              <span className="brand-text">Матвей</span>
              <span className="mx-1 text-ink-mute">·</span>
              <span>бухгалтерия</span>
            </div>
            <div className="text-[21px] font-bold text-ink tracking-tight2 mt-0.5">
              {pageTitle}
            </div>
          </div>
        </div>
      </header>

      <main
        className="flex-1 px-4"
        style={{ paddingBottom: "calc(6.75rem + env(safe-area-inset-bottom))" }}
      >
        <Outlet />
      </main>

      <nav className="fixed bottom-0 inset-x-0 z-30">
        <div
          className="mx-auto max-w-xl px-3 pt-2"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 0.5rem)" }}
        >
          <div
            className="flex items-center justify-around p-1.5 rounded-[20px] border border-bg-line2"
            style={{
              background: "rgba(22,29,44,0.78)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              boxShadow: "0 12px 40px -8px rgba(0,0,0,0.7), 0 1px 0 rgba(255,255,255,0.05) inset",
            }}
          >
            {tabs.map((t) => (
              <NavLink
                key={t.to}
                to={t.to}
                end={t.to === "/"}
                className={({ isActive }) =>
                  `flex-1 flex flex-col items-center gap-1 py-2 rounded-[14px] transition-all ${
                    isActive ? "text-neon-gold" : "text-ink-mute"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      className="flex items-center justify-center transition-all"
                      style={
                        isActive
                          ? { filter: "drop-shadow(0 0 8px rgba(229,192,123,0.45))" }
                          : undefined
                      }
                    >
                      <Icon name={t.icon} size={22} strokeWidth={isActive ? 2 : 1.75} />
                    </span>
                    <span className="text-[10.5px] font-semibold tracking-tight">{t.label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </div>
      </nav>
    </div>
  );
}
