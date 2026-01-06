'use client';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { formatNumber } from "@/lib/number";
import { TankProfile, Vehicle } from "@/types";

export default function NewEntryPage() {
  return (
    <ProtectedRoute>
      <EntryForm />
    </ProtectedRoute>
  );
}

function EntryForm() {
  const router = useRouter();
  const { token } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [tanks, setTanks] = useState<TankProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    vehicleId: 0,
    tankProfileId: undefined as number | undefined,
    entryDate: new Date().toISOString().split('T')[0],
    odometerKm: '',
    fuelVolumeL: '',
    totalCost: '',
    currency: 'USD',
    fuelType: 'GASOLINE' as 'GASOLINE' | 'DIESEL' | 'ELECTRIC',
    fillLevel: 'FULL' as 'FULL' | 'PARTIAL',
    location: '',
    notes: '',
  });

  useEffect(() => {
    loadVehicles();
  }, [token]);

  useEffect(() => {
    if (formData.vehicleId && token) {
      loadTanks(formData.vehicleId);
    }
  }, [formData.vehicleId, token]);

  const loadVehicles = async () => {
    if (!token) return;
    
    try {
      const { vehicles: vehicleList } = await api.vehicles.list(token);
      setVehicles(vehicleList);
      if (vehicleList.length > 0) {
        setFormData(prev => ({ ...prev, vehicleId: vehicleList[0].id }));
      }
    } catch (error) {
      console.error('Failed to load vehicles:', error);
    }
  };

  const loadTanks = async (vehicleId: number) => {
    if (!token) return;
    
    try {
      const vehicleData = await api.vehicles.get(vehicleId, token);
      setTanks(vehicleData.vehicle?.tanks || []);
    } catch (error) {
      console.error('Failed to load tanks:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    setLoading(true);
    setError('');

    try {
      const payload: any = {
        entryDate: new Date(formData.entryDate).toISOString(),
        odometerKm: parseFloat(formData.odometerKm),
        fuelVolumeL: parseFloat(formData.fuelVolumeL),
        totalCost: parseFloat(formData.totalCost),
        currency: formData.currency,
        fuelType: formData.fuelType,
        fillLevel: formData.fillLevel,
      };

      if (formData.tankProfileId) payload.tankProfileId = formData.tankProfileId;
      if (formData.location) payload.location = formData.location;
      if (formData.notes) payload.notes = formData.notes;

      await api.entries.create(formData.vehicleId, payload, token);
      router.push('/dashboard/entries');
    } catch (err: any) {
      setError(err.message || 'Failed to create entry');
    } finally {
      setLoading(false);
    }
  };

  if (vehicles.length === 0) {
    return (
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle>Add fill-up</CardTitle>
          <CardDescription>Please add a vehicle first.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const pricePerLiter = formData.fuelVolumeL && formData.totalCost 
    ? formatNumber(parseFloat(formData.totalCost) / parseFloat(formData.fuelVolumeL), 3)
    : '0.000';

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle>Add fill-up</CardTitle>
        <CardDescription>Manual entry with quick calculations.</CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="vehicleId">Vehicle</Label>
              <Select
                id="vehicleId"
                value={formData.vehicleId}
                onChange={(e) => setFormData({ ...formData, vehicleId: parseInt(e.target.value) })}
                required
              >
                {vehicles.map(vehicle => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehicle.name}
                  </option>
                ))}
              </Select>
            </div>

            {tanks.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="tankProfileId">Tank (optional)</Label>
                <Select
                  id="tankProfileId"
                  value={formData.tankProfileId || ''}
                  onChange={(e) => setFormData({ ...formData, tankProfileId: e.target.value ? parseInt(e.target.value) : undefined })}
                >
                  <option value="">No specific tank</option>
                  {tanks.map(tank => (
                    <option key={tank.id} value={tank.id}>
                      {tank.name} ({tank.capacityL}L)
                    </option>
                  ))}
                </Select>
              </div>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="entryDate">Date</Label>
              <Input
                id="entryDate"
                type="date"
                value={formData.entryDate}
                onChange={(e) => setFormData({ ...formData, entryDate: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="odometerKm">Odometer (km)</Label>
              <Input
                id="odometerKm"
                type="number"
                step="0.1"
                value={formData.odometerKm}
                onChange={(e) => setFormData({ ...formData, odometerKm: e.target.value })}
                placeholder="12345.6"
                required
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="fuelVolumeL">Volume (L)</Label>
              <Input
                id="fuelVolumeL"
                type="number"
                step="0.01"
                value={formData.fuelVolumeL}
                onChange={(e) => setFormData({ ...formData, fuelVolumeL: e.target.value })}
                placeholder="45.5"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="totalCost">Total cost</Label>
              <Input
                id="totalCost"
                type="number"
                step="0.01"
                value={formData.totalCost}
                onChange={(e) => setFormData({ ...formData, totalCost: e.target.value })}
                placeholder="65.75"
                required
              />
              <p className="text-xs text-muted-foreground">Price per liter: ${pricePerLiter}</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Select
                id="currency"
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                required
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
                <option value="CAD">CAD</option>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fuelType">Fuel type</Label>
              <Select
                id="fuelType"
                value={formData.fuelType}
                onChange={(e) => setFormData({ ...formData, fuelType: e.target.value as any })}
                required
              >
                <option value="GASOLINE">Gasoline</option>
                <option value="DIESEL">Diesel</option>
                <option value="ELECTRIC">Electric</option>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fillLevel">Fill level</Label>
              <Select
                id="fillLevel"
                value={formData.fillLevel}
                onChange={(e) => setFormData({ ...formData, fillLevel: e.target.value as any })}
                required
              >
                <option value="FULL">Full</option>
                <option value="PARTIAL">Partial</option>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="Shell Station, Main St"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Any additional notes..."
              rows={3}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving…' : 'Save entry'}
            </Button>
            <Button type="button" variant="secondary" onClick={() => router.back()} disabled={loading}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
