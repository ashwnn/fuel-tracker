'use client';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { formatNumber } from "@/lib/number";
import { Vehicle } from "@/types";

export default function PhotoEntryPage() {
  return (
    <ProtectedRoute>
      <PhotoForm />
    </ProtectedRoute>
  );
}

interface PrefilledData {
  entryDate: string;
  fuelVolumeL: string | number;
  totalCost: string | number;
  currency: string;
  fuelType: 'GASOLINE' | 'DIESEL' | 'ELECTRIC';
  pricePerLiter: number | null;
  aiConfidence: number;
}

function PhotoForm() {
  const router = useRouter();
  const { token } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<number>(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [uploadStatus, setUploadStatus] = useState('');
  const [prefilledData, setPrefilledData] = useState<PrefilledData | null>(null);
  const [formData, setFormData] = useState<PrefilledData & { odometerKm: string | number }>({
    odometerKm: '',
    entryDate: new Date().toISOString().split('T')[0],
    fuelVolumeL: '',
    totalCost: '',
    currency: 'USD',
    fuelType: 'GASOLINE',
    pricePerLiter: null,
    aiConfidence: 0,
  });

  useEffect(() => {
    loadVehicles();
  }, [token]);

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
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      // Reset pre-filled data when new file is selected
      setPrefilledData(null);
      setError('');
    }
  };

  const handleUploadPhoto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !selectedFile || !selectedVehicleId) return;

    setLoading(true);
    setError('');
    setUploadStatus('Processing photo with AI...');

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('photo', selectedFile);

      const result = await api.entries.uploadPhoto(selectedVehicleId, formDataToSend, token);
      
      if (result.prefilledData) {
        setPrefilledData(result.prefilledData);
        // Set initial form data from AI extraction
        setFormData({
          ...result.prefilledData,
          odometerKm: '',
        });
        setUploadStatus('');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to process photo');
      setUploadStatus('');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !selectedVehicleId) return;

    setLoading(true);
    setError('');

    try {
      const payload: any = {
        entryDate: new Date(formData.entryDate).toISOString(),
        odometerKm: parseFloat(formData.odometerKm as any),
        fuelVolumeL: parseFloat(formData.fuelVolumeL as any),
        totalCost: parseFloat(formData.totalCost as any),
        currency: formData.currency,
        fuelType: formData.fuelType,
        fillLevel: 'FULL',
        sourceType: prefilledData ? 'PHOTO_AI' : 'MANUAL',
        aiConfidence: prefilledData ? Number(prefilledData.aiConfidence || 0) : undefined,
      };

      await api.entries.create(selectedVehicleId, payload, token);
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
          <CardTitle>Add fill-up (photo)</CardTitle>
          <CardDescription>Please add a vehicle first.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const pricePerLiter = formData.fuelVolumeL && formData.totalCost 
    ? formatNumber(parseFloat(formData.totalCost as any) / parseFloat(formData.fuelVolumeL as any), 3)
    : '0.000';

  // Show pre-filled form if data is available
  if (prefilledData) {
    return (
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Review fill-up (AI extracted)</CardTitle>
          <CardDescription>Confirm or tweak the details before saving.</CardDescription>
          {prefilledData.aiConfidence > 0 && (
            <Badge variant="secondary">AI confidence: {prefilledData.aiConfidence}%</Badge>
          )}
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmitEntry} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="vehicleId">Vehicle</Label>
              <Select
                id="vehicleId"
                value={selectedVehicleId}
                onChange={(e) => setSelectedVehicleId(parseInt(e.target.value))}
                required
                disabled={loading}
              >
                {vehicles.map(vehicle => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehicle.name}
                  </option>
                ))}
              </Select>
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
                  disabled={loading}
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
                  disabled={loading}
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
                  disabled={loading}
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
                  disabled={loading}
                />
                <p className="text-xs text-muted-foreground">Price per liter: ${pricePerLiter}</p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Select
                  id="currency"
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  required
                  disabled={loading}
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
                  disabled={loading}
                >
                  <option value="GASOLINE">Gasoline</option>
                  <option value="DIESEL">Diesel</option>
                  <option value="ELECTRIC">Electric</option>
                </Select>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={loading}>
                {loading ? 'Saving…' : 'Save entry'}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setPrefilledData(null);
                  setSelectedFile(null);
                  setPreviewUrl('');
                  setFormData({
                    odometerKm: '',
                    entryDate: new Date().toISOString().split('T')[0],
                    fuelVolumeL: '',
                    totalCost: '',
                    currency: 'USD',
                    fuelType: 'GASOLINE',
                    pricePerLiter: null,
                    aiConfidence: 0,
                  });
                }}
                disabled={loading}
              >
                Start over
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    );
  }

  // Show photo upload form
  return (
    <div className="grid gap-4 md:grid-cols-[2fr_1fr]">
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Add fill-up from photo</CardTitle>
          <CardDescription>Upload your receipt and let the AI fill in the details.</CardDescription>
          {uploadStatus && <Badge variant="secondary">{uploadStatus}</Badge>}
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          <form onSubmit={handleUploadPhoto} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="vehicleId">Vehicle</Label>
              <Select
                id="vehicleId"
                value={selectedVehicleId}
                onChange={(e) => setSelectedVehicleId(parseInt(e.target.value))}
                required
                disabled={loading}
              >
                {vehicles.map(vehicle => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehicle.name}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="photo">Receipt photo</Label>
              <Input
                id="photo"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                required
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">Clear, well-lit photos work best.</p>
            </div>

            {previewUrl && (
              <div className="overflow-hidden rounded-lg border bg-muted/30">
                <img src={previewUrl} alt="Receipt preview" className="w-full object-contain" />
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={loading || !selectedFile}>
                {loading ? uploadStatus || 'Processing…' : 'Upload & process'}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => router.back()}
                disabled={loading}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Tips for best results</CardTitle>
          <CardDescription>Help the AI read your receipt cleanly.</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <div className="flex items-start gap-2">
            <span className="mt-1 text-base">💡</span>
            <span>Use even lighting and avoid glare on the receipt.</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="mt-1 text-base">🧾</span>
            <span>Capture the full receipt with prices and totals visible.</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="mt-1 text-base">🔍</span>
            <span>Keep text sharp (no blur) and upright if possible.</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="mt-1 text-base">🤖</span>
            <span>The AI extracts date, volume, total, and price per liter. You’ll confirm everything before saving.</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
