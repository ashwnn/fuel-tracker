'use client';

import Link from "next/link";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { formatNumber } from "@/lib/number";
import { Vehicle } from "@/types";

export default function VehiclesPage() {
  return (
    <ProtectedRoute>
      <VehiclesContent />
    </ProtectedRoute>
  );
}

function VehiclesContent() {
  const { token } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadVehicles();
  }, [token]);

  const loadVehicles = async () => {
    if (!token) return;
    
    try {
      const { vehicles: vehicleList } = await api.vehicles.list(token);
      setVehicles(vehicleList);
    } catch (error) {
      console.error('Failed to load vehicles:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!token) return;
    if (!confirm('Are you sure you want to delete this vehicle? All associated data will be removed.')) return;

    try {
      await api.vehicles.delete(id, token);
      setVehicles(vehicles.filter(v => v.id !== id));
    } catch (error) {
      console.error('Failed to delete vehicle:', error);
      alert('Failed to delete vehicle');
    }
  };

  if (loading) {
    return <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">Loading vehicles…</div>;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Vehicles</CardTitle>
            <CardDescription>Manage your garage and quick stats.</CardDescription>
          </div>
          <Button asChild>
            <Link href="/dashboard/vehicles/new">Add vehicle</Link>
          </Button>
        </CardHeader>

        <CardContent>
          {vehicles.length === 0 ? (
            <div className="flex flex-col gap-3 rounded-lg border border-dashed bg-muted/40 p-4 text-sm text-muted-foreground">
              <p>No vehicles added yet.</p>
              <Button asChild size="sm">
                <Link href="/dashboard/vehicles/new">Add your first vehicle</Link>
              </Button>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {vehicles.map(vehicle => (
                <Card key={vehicle.id} className="border-border/70 shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">{vehicle.name}</CardTitle>
                    <CardDescription>
                      {[vehicle.make, vehicle.model, vehicle.year].filter(Boolean).join(' ')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    {vehicle.stats ? (
                      <div className="grid grid-cols-2 gap-2">
                        <StatRow label="Entries" value={vehicle.stats.entryCount} />
                        <StatRow label="Total fuel" value={`${formatNumber(vehicle.stats.totalFuelL, 1)} L`} />
                        <StatRow label="Total cost" value={`$${formatNumber(vehicle.stats.totalCost, 2)}`} />
                        {vehicle.stats.avgEconomyLPer100Km && (
                          <StatRow label="Avg economy" value={`${formatNumber(vehicle.stats.avgEconomyLPer100Km, 2)} L/100km`} />
                        )}
                        {vehicle.stats.avgEconomyMpg && (
                          <StatRow label="Avg MPG" value={`${formatNumber(vehicle.stats.avgEconomyMpg, 1)} mpg`} />
                        )}
                      </div>
                    ) : (
                      <p className="text-muted-foreground">No stats yet.</p>
                    )}
                    <div className="flex flex-wrap gap-2 pt-2 text-xs text-muted-foreground">
                      <Badge variant="outline">ID {vehicle.id}</Badge>
                      {vehicle.year && <Badge variant="outline">{vehicle.year}</Badge>}
                      {vehicle.transmissionType && <Badge variant="outline">{vehicle.transmissionType}</Badge>}
                      {vehicle.expectedMpg != null && <Badge variant="outline">Expected {formatNumber(vehicle.expectedMpg, 1)} mpg</Badge>}
                    </div>
                  </CardContent>
                  <CardFooter className="flex items-center gap-2">
                    <Button asChild variant="secondary" size="sm" className="flex-1">
                      <Link href={`/dashboard/vehicles/${vehicle.id}/edit`}>Edit</Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-1 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(vehicle.id)}
                    >
                      Delete
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold text-foreground">{value}</span>
    </div>
  );
}
