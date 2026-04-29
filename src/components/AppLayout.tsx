import { NavLink, Outlet } from "react-router-dom";
import { Factory, Truck, Wrench, BarChart3, Moon, Sun, Scale, Brain } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/fabrication", label: "Fabrication", icon: Factory },
  { to: "/sortie", label: "Sortie", icon: Truck },
  { to: "/montage", label: "Montage", icon: Wrench },
  { to: "/statistics", label: "Statistics", icon: BarChart3 },
  { to: "/ai-analysis", label: "AI Analysis", icon: Brain },
];

export const AppLayout = () => {
  const { theme, toggle } = useTheme();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-40 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="container flex h-16 items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl gradient-primary grid place-items-center shadow-glow">
              <Scale className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-base font-bold tracking-tight">Poids Tracker</h1>
              <p className="text-xs text-muted-foreground -mt-0.5">Project weight analytics</p>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-base",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  )
                }
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            ))}
          </nav>

          <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle theme">
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        </div>

        <nav className="md:hidden flex items-center gap-1 overflow-x-auto px-4 pb-3">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-base",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                )
              }
            >
              <item.icon className="h-3.5 w-3.5" />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="flex-1 container py-6 md:py-8">
        <Outlet />
      </main>

      <footer className="border-t border-border/50 py-4">
        <div className="container text-center text-xs text-muted-foreground">
          Poids Tracker · Data from ercmsalhi.com
        </div>
      </footer>
    </div>
  );
};
