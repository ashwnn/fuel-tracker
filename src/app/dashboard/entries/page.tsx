'use client';

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { formatNumber } from "@/lib/number";
import { FillUpEntry, Vehicle } from "@/types";

export default function EntriesPage() {
  return (
    <ProtectedRoute>
      <EntriesContent />
    </ProtectedRoute>
  );
}

function EntriesContent() {
  const { token } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(null);
  const [entries, setEntries] = useState<FillUpEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadVehicles();
  }, [token]);

  useEffect(() => {
    if (selectedVehicleId && token) {
      loadEntries(selectedVehicleId);
    }
  }, [selectedVehicleId, token]);

  const loadVehicles = async () => {
    if (!token) return;
    
    try {
      const { vehicles: vehicleList } = await api.vehicles.list(token);
      setVehicles(vehicleList);
      if (vehicleList.length > 0) {
        setSelectedVehicleId(vehicleList[0].id);
      }
    } catch (error) {
      console.error('Failed to load vehicles:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadEntries = async (vehicleId: number) => {
    if (!token) return;
    
    try {
      const { entries: entryList } = await api.entries.list(vehicleId, token);
      setEntries(entryList);
    } catch (error) {
      console.error('Failed to load entries:', error);
    }
  };

  const handleDelete = async (id: number) => {
    if (!token || !selectedVehicleId) return;
    if (!confirm('Are you sure you want to delete this entry?')) return;

    try {
      await api.entries.delete(selectedVehicleId, id, token);
      setEntries(entries.filter(e => e.id !== id));
    } catch (error) {
      console.error('Failed to delete entry:', error);
      alert('Failed to delete entry');
    }
  };

  const emptyVehicles = vehicles.length === 0;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Fill-up entries</CardTitle>
            <CardDescription>Review, edit, or add the latest fuel logs.</CardDescription>
          </div>
          <div className="flex w-full flex-col items-stretch gap-2 sm:w-auto sm:flex-row sm:items-center">
            <Select
              value={selectedVehicleId || ''}
              onChange={(e) => setSelectedVehicleId(parseInt(e.target.value))}
              disabled={emptyVehicles}
              className="sm:min-w-[200px]"
            >
              {vehicles.map(vehicle => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicle.name}
                </option>
              ))}
            </Select>
            <div className="flex flex-wrap gap-2 sm:flex-nowrap">
              <Button asChild size="sm">
                <Link href="/dashboard/entries/new">Manual entry</Link>
              </Button>
              <Button asChild size="sm" variant="secondary">
                <Link href="/dashboard/entries/photo">Photo entry</Link>
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">Loading entries…</div>
          ) : emptyVehicles ? (
            <div className="flex flex-col items-start gap-3 rounded-lg border border-dashed bg-muted/40 p-4 text-sm text-muted-foreground">
              <p>Please add a vehicle first.</p>
              <Button asChild size="sm">
                <Link href="/dashboard/vehicles/new">Add vehicle</Link>
              </Button>
            </div>
          ) : entries.length === 0 ? (
            <div className="rounded-lg border border-dashed bg-muted/40 p-4 text-sm text-muted-foreground">
              No entries yet for this vehicle.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Fuel</TableHead>
                  <TableHead>Volume</TableHead>
                  <TableHead>Cost</TableHead>
                  <TableHead>Odometer</TableHead>
                  <TableHead>Economy</TableHead>
                  <TableHead>Fill</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map(entry => (
                  <TableRow key={entry.id}>
                    <TableCell>{new Date(entry.entryDate).toLocaleDateString()}</TableCell>
                    <TableCell>{entry.fuelType}</TableCell>
                    <TableCell>{formatNumber(entry.fuelVolumeL, 2)} L</TableCell>
                    <TableCell>{entry.currency} ${formatNumber(entry.totalCost, 2)}</TableCell>
                    <TableCell>{formatNumber(entry.odometerKm, 0)} km</TableCell>
                    <TableCell>
                      {entry.economyLPer100Km
                        ? `${formatNumber(entry.economyLPer100Km, 2)} L/100km`
                        : '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={entry.fillLevel === 'FULL' ? 'success' : 'warning'}>
                        {entry.fillLevel}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDelete(entry.id)}
                      >
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
