'use client';

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { toNumber } from "@/lib/number";

interface FormState {
  name: string;
  make: string;
  model: string;
  year: string;
  transmissionType: string;
  expectedMpg: string;
}

export default function EditVehiclePage() {
  return (
    <ProtectedRoute>
      <VehicleEditForm />
    </ProtectedRoute>
  );
}

function VehicleEditForm() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const vehicleId = useMemo(() => Number(params?.id), [params]);
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState<FormState>({
    name: '',
    make: '',
    model: '',
    year: '',
    transmissionType: '',
    expectedMpg: '',
  });

  useEffect(() => {
    if (!token || !vehicleId) return;
    loadVehicle();
  }, [token, vehicleId]);

  const loadVehicle = async () => {
    setLoading(true);
    setError('');

    try {
      const { vehicle } = await api.vehicles.get(vehicleId, token as string);
      if (!vehicle) throw new Error('Vehicle not found');

      setFormData({
        name: vehicle.name || '',
        make: vehicle.make || '',
        model: vehicle.model || '',
        year: vehicle.year != null ? String(vehicle.year) : '',
        transmissionType: vehicle.transmissionType || '',
        expectedMpg: vehicle.expectedMpg != null ? String(vehicle.expectedMpg) : '',
      });
    } catch (err: any) {
      console.error('Failed to load vehicle', err);
      setError(err?.message || 'Failed to load vehicle');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !vehicleId) return;

    setSaving(true);
    setError('');

    const payload: any = {
      name: formData.name.trim(),
    };

    if (!payload.name) {
      setError('Name is required');
      setSaving(false);
      return;
    }

    if (formData.make) payload.make = formData.make;
    if (formData.model) payload.model = formData.model;
    if (formData.transmissionType) payload.transmissionType = formData.transmissionType;

    if (formData.year !== '') {
      const yearNumber = toNumber(formData.year);
      if (yearNumber == null) {
        setError('Year must be a valid number');
        setSaving(false);
        return;
      }
      payload.year = Math.round(yearNumber);
    }

    if (formData.expectedMpg !== '') {
      const mpgNumber = toNumber(formData.expectedMpg);
      if (mpgNumber == null) {
        setError('Expected MPG must be a valid number');
        setSaving(false);
        return;
      }
      payload.expectedMpg = mpgNumber;
    }

    try {
      await api.vehicles.update(vehicleId, payload, token);
      router.push('/dashboard/vehicles');
    } catch (err: any) {
      console.error('Failed to update vehicle', err);
      setError(err?.message || 'Failed to update vehicle');
    } finally {
      setSaving(false);
    }
  };

  if (!vehicleId) {
    return (
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Vehicle not found</CardTitle>
          <CardDescription>Return to the vehicles list and try again.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => router.push('/dashboard/vehicles')}>Back to vehicles</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle>Edit vehicle</CardTitle>
        <CardDescription>Update the details for this vehicle.</CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-sm text-muted-foreground">Loading vehicle…</div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Vehicle name</Label>
              <Input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="My Car"
                required
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="make">Make</Label>
                <Input
                  id="make"
                  type="text"
                  value={formData.make}
                  onChange={(e) => setFormData({ ...formData, make: e.target.value })}
                  placeholder="Toyota"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="model">Model</Label>
                <Input
                  id="model"
                  type="text"
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  placeholder="Camry"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="year">Year</Label>
                <Input
                  id="year"
                  type="number"
                  value={formData.year}
                  onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                  min="1900"
                  max={new Date().getFullYear() + 1}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="transmission">Transmission</Label>
                <Select
                  id="transmission"
                  value={formData.transmissionType}
                  onChange={(e) => setFormData({ ...formData, transmissionType: e.target.value })}
                >
                  <option value="">Select</option>
                  <option value="AUTOMATIC">Automatic</option>
                  <option value="MANUAL">Manual</option>
                  <option value="CVT">CVT</option>
                  <option value="DCT">DCT</option>
                  <option value="OTHER">Other</option>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="expectedMpg">Expected MPG (manufacturer)</Label>
              <Input
                id="expectedMpg"
                type="number"
                step="0.1"
                value={formData.expectedMpg}
                onChange={(e) => setFormData({ ...formData, expectedMpg: e.target.value })}
                placeholder="32"
              />
              <p className="text-xs text-muted-foreground">Used to gauge health vs rated efficiency.</p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving…' : 'Save changes'}
              </Button>
              <Button type="button" variant="secondary" onClick={() => router.back()} disabled={saving}>
                Cancel
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
