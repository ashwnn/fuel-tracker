'use client';

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ArrowRight, Camera, Fuel, Gauge, Plus, Settings2, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Select } from "@/components/ui/select";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { formatNumber } from "@/lib/number";
import { BudgetUsage, FillUpEntry, Vehicle } from "@/types";

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}

function DashboardContent() {
  const { token } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [budgetUsage, setBudgetUsage] = useState<BudgetUsage | null>(null);
  const [lastEntries, setLastEntries] = useState<Record<number, FillUpEntry>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, [token]);

  const loadDashboardData = async () => {
    if (!token) return;
    
    try {
      // Use consolidated dashboard endpoint for better performance
      const data = await api.dashboard.getInitialData(token);
      
      setVehicles(data.vehicles);
      setBudgetUsage(data.budgetUsage);
      setLastEntries(data.lastEntries);
      
      // Set first vehicle as selected
      if (data.vehicles.length > 0) {
        setSelectedVehicle(data.vehicles[0]);
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };
``
  // Handle vehicle selection change
  const handleVehicleChange = (vehicleId: number) => {
    const vehicle = vehicles.find(v => v.id === vehicleId);
    setSelectedVehicle(vehicle || null);
  };

  const budgetPercent = useMemo(() => {
    if (!budgetUsage?.percentUsed) return 0;
    return Math.min(120, budgetUsage.percentUsed);
  }, [budgetUsage]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex items-center gap-3 rounded-full border border-border px-4 py-2 text-sm text-muted-foreground shadow-sm">
          <Fuel className="h-4 w-4 animate-pulse text-primary" />
          Loading your garage…
        </div>
      </div>
    );
  }

  if (vehicles.length === 0) {
    return (
      <Card className="max-w-xl border-dashed">
        <CardHeader>
          <CardTitle>Welcome to FuelTracker</CardTitle>
          <CardDescription>Add your first vehicle to start tracking.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="w-full">
            <Link href="/dashboard/vehicles/new">Add your first vehicle</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-lg">Quick actions</CardTitle>
              <CardDescription>Capture a fill-up or jump into analytics.</CardDescription>
            </div>
            <Badge variant="secondary" className="w-fit">{vehicles.length} vehicle{vehicles.length > 1 ? 's' : ''}</Badge>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <ActionTile href="/dashboard/entries/new" title="Manual entry" icon={<Plus className="h-4 w-4" />}>
                Add a fill-up by hand.
              </ActionTile>
              <ActionTile href="/dashboard/entries/photo" title="Photo entry" icon={<Camera className="h-4 w-4" />}>
                Snap the receipt, auto-fill details.
              </ActionTile>
              <ActionTile href="/dashboard/analytics" title="Analytics" icon={<TrendingUp className="h-4 w-4" />}>
                Trends and monthly breakdowns.
              </ActionTile>
              <ActionTile href="/dashboard/settings" title="Settings" icon={<Settings2 className="h-4 w-4" />}>
                Budget and API preferences.
              </ActionTile>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <Gauge className="h-4 w-4 text-primary" /> Monthly budget
            </CardTitle>
            <CardDescription>Stay ahead of this month’s spending.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {budgetUsage?.budget ? (
              <>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Budget</span>
                  <span className="font-semibold">{budgetUsage.budget.currency} ${formatNumber(budgetUsage.budget.amount, 2)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Spent</span>
                  <span className="font-semibold">${formatNumber(budgetUsage.totalSpent, 2)}</span>
                </div>
                <Progress value={budgetPercent} />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{formatNumber(budgetUsage.percentUsed ?? 0, 1)}% used</span>
                  {budgetUsage.percentUsed !== undefined && budgetUsage.percentUsed > 100 && (
                    <Badge variant="destructive">Over budget</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">Budget applies every month.</p>
              </>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">No monthly budget set yet.</p>
                <Button asChild size="sm" variant="secondary">
                  <Link href="/dashboard/settings">Set a budget</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-lg">Selected vehicle</CardTitle>
              <CardDescription>Switch vehicles to update the stats below.</CardDescription>
            </div>
            <div className="w-full max-w-xs">
              <Select value={selectedVehicle?.id || ''} onChange={(e) => handleVehicleChange(parseInt(e.target.value))}>
                {vehicles.map(vehicle => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehicle.name} {vehicle.make && `· ${vehicle.make} ${vehicle.model}`}
                  </option>
                ))}
              </Select>
            </div>
          </CardHeader>
          {selectedVehicle?.stats ? (
            <CardContent>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <StatBlock label="Entries" value={selectedVehicle.stats.entryCount} />
                <StatBlock label="Total fuel" value={`${formatNumber(selectedVehicle.stats.totalFuelL, 1)} L`} />
                <StatBlock label="Total cost" value={`$${formatNumber(selectedVehicle.stats.totalCost, 2)}`} />
                {selectedVehicle.stats.avgEconomyLPer100Km && (
                  <StatBlock label="Avg economy" value={`${formatNumber(selectedVehicle.stats.avgEconomyLPer100Km, 2)} L/100km`} />
                )}
              </div>
              <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
                <Badge variant="outline">{selectedVehicle.make || 'Vehicle'}</Badge>
                {selectedVehicle.model && <Badge variant="outline">{selectedVehicle.model}</Badge>}
                {selectedVehicle.year && <Badge variant="outline">{selectedVehicle.year}</Badge>}
              </div>
            </CardContent>
          ) : (
            <CardContent className="text-sm text-muted-foreground">No stats yet for this vehicle.</CardContent>
          )}
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Last fill-up</CardTitle>
            <CardDescription>Most recent entry for this vehicle.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {selectedVehicle && lastEntries[selectedVehicle.id] ? (
              (() => {
                const entry = lastEntries[selectedVehicle.id];
                return (
                  <div className="space-y-2 rounded-lg border bg-muted/40 p-3">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{new Date(entry.entryDate).toLocaleDateString()}</span>
                      <Badge variant="outline">{entry.fuelType}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground">Volume</p>
                        <p className="text-base font-semibold">{formatNumber(entry.fuelVolumeL, 2)} L</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Cost</p>
                        <p className="text-base font-semibold">{entry.currency} ${formatNumber(entry.totalCost, 2)}</p>
                      </div>
                    </div>
                    {entry.economyLPer100Km && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Economy</span>
                        <span className="font-medium">{formatNumber(entry.economyLPer100Km, 2)} L/100km</span>
                      </div>
                    )}
                    {entry.fillLevel === 'PARTIAL' && <Badge variant="warning">Partial fill</Badge>}
                  </div>
                );
              })()
            ) : (
              <p className="text-muted-foreground">No entries yet for this vehicle.</p>
            )}
            <Button asChild variant="ghost" size="sm" className="mt-2 w-full justify-between">
              <Link href="/dashboard/entries/new">
                Add another fill-up <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatBlock({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border bg-card/60 p-3 shadow-sm">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold leading-tight">{value}</p>
    </div>
  );
}

function ActionTile({
  href,
  title,
  icon,
  children,
}: {
  href: string;
  title: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group block rounded-xl border bg-card/60 p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="flex items-center gap-2 text-sm font-semibold">
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">{icon}</span>
        {title}
      </div>
      <p className="mt-2 text-sm text-muted-foreground group-hover:text-foreground">{children}</p>
    </Link>
  );
}
