'use client';

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { BarChart3, Car, Gauge, ListChecks, Menu, Settings, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

const navLinks = [
  { href: "/dashboard", label: "Overview", icon: Gauge },
  { href: "/dashboard/vehicles", label: "Vehicles", icon: Car },
  { href: "/dashboard/entries", label: "Entries", icon: ListChecks },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const activeSegment = useMemo(() => pathname?.split("?")[0], [pathname]);

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  if (!user) {
    return null;
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-background via-background to-background/90">
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
        <div className="container flex items-center justify-between gap-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              ⛽
            </div>
            <div>
              <Link href="/dashboard" className="block text-lg font-semibold leading-tight">
                FuelTracker
              </Link>
              <p className="text-xs text-muted-foreground">Track every drop</p>
            </div>
          </div>

          <div className="hidden items-center gap-1 md:flex">
            {navLinks.map(({ href, label, icon: Icon }) => {
              const isActive = activeSegment === href || activeSegment?.startsWith(href);
              return (
                <Link key={href} href={href}>
                  <Button
                    variant={isActive ? "secondary" : "ghost"}
                    size="sm"
                    className="gap-2"
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </Button>
                </Link>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden flex-col items-end leading-tight sm:flex">
              <span className="text-xs text-muted-foreground">Signed in</span>
              <span className="text-sm font-medium">{user.email}</span>
            </div>
            <Button variant="outline" size="sm" onClick={handleLogout} className="hidden sm:inline-flex">
              Logout
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileMenuOpen((open) => !open)}
              aria-label="Toggle navigation"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="border-t bg-background/95 px-4 pb-4 pt-2 md:hidden">
            <div className="grid grid-cols-1 gap-2">
              {navLinks.map(({ href, label, icon: Icon }) => {
                const isActive = activeSegment === href || activeSegment?.startsWith(href);
                return (
                  <Link key={href} href={href} onClick={() => setMobileMenuOpen(false)}>
                    <Button
                      variant={isActive ? "secondary" : "ghost"}
                      className="w-full justify-start gap-2"
                    >
                      <Icon className="h-4 w-4" />
                      {label}
                    </Button>
                  </Link>
                );
              })}
              <Button variant="outline" onClick={handleLogout} className="justify-center">
                Logout
              </Button>
            </div>
          </div>
        )}
      </header>

      <main className="container pb-28 pt-6">
        {children}
      </main>

      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 backdrop-blur md:hidden">
        <div className="mx-auto flex max-w-xl items-center justify-between px-4 py-2 text-xs font-medium">
          {navLinks.map(({ href, label, icon: Icon }) => {
            const isActive = activeSegment === href || activeSegment?.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className="flex flex-1 flex-col items-center gap-1 rounded-md px-2 py-1 text-muted-foreground"
              >
                <Icon className={`h-5 w-5 ${isActive ? "text-primary" : ""}`} />
                <span className={isActive ? "text-primary" : ""}>{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
