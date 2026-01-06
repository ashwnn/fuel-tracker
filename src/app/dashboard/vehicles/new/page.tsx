'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";

export default function NewVehiclePage() {
  return (
    <ProtectedRoute>
      <VehicleForm />
    </ProtectedRoute>
  );
}

function VehicleForm() {
  const router = useRouter();
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    make: '',
    model: '',
    year: new Date().getFullYear(),
    transmissionType: '',
    expectedMpg: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    setLoading(true);
    setError('');

    try {
      const payload: any = {
        name: formData.name,
      };

      if (formData.make) payload.make = formData.make;
      if (formData.model) payload.model = formData.model;
      if (formData.year) payload.year = formData.year;
      if (formData.transmissionType) payload.transmissionType = formData.transmissionType;
      if (formData.expectedMpg) payload.expectedMpg = parseFloat(formData.expectedMpg as any);

      await api.vehicles.create(payload, token);
      router.push('/dashboard/vehicles');
    } catch (err: any) {
      setError(err.message || 'Failed to create vehicle');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle>Add new vehicle</CardTitle>
        <CardDescription>Keep your garage organized and separated.</CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

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
                onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
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
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating…' : 'Create vehicle'}
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
