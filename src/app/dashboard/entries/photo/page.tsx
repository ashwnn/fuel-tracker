'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { Vehicle } from '@/types';
import { formatNumber } from '@/lib/number';
import { ProtectedRoute } from '@/components/ProtectedRoute';

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
      <div className="empty-state">
        <p>Please add a vehicle first.</p>
      </div>
    );
  }

  const pricePerLiter = formData.fuelVolumeL && formData.totalCost 
    ? formatNumber(parseFloat(formData.totalCost as any) / parseFloat(formData.fuelVolumeL as any), 3)
    : '0.000';

  // Show pre-filled form if data is available
  if (prefilledData) {
    return (
      <div className="form-page">
        <div className="form-container">
          <h1>Review Fill-Up Entry (AI Extracted)</h1>
          <p className="form-description">
            The AI has extracted information from your receipt. Please review and make any necessary corrections.
          </p>

          {prefilledData.aiConfidence > 0 && (
            <div className="info-message">
              AI Confidence: {prefilledData.aiConfidence}%
            </div>
          )}

          {error && <div className="error-message">{error}</div>}

          <form onSubmit={handleSubmitEntry}>
            <div className="form-group">
              <label htmlFor="vehicleId">Vehicle *</label>
              <select
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
              </select>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="entryDate">Date *</label>
                <input
                  id="entryDate"
                  type="date"
                  value={formData.entryDate}
                  onChange={(e) => setFormData({ ...formData, entryDate: e.target.value })}
                  required
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label htmlFor="odometerKm">Odometer (km) *</label>
                <input
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

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="fuelVolumeL">Volume (L) *</label>
                <input
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

              <div className="form-group">
                <label htmlFor="totalCost">Total Cost *</label>
                <input
                  id="totalCost"
                  type="number"
                  step="0.01"
                  value={formData.totalCost}
                  onChange={(e) => setFormData({ ...formData, totalCost: e.target.value })}
                  placeholder="65.75"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div className="calculation-display">
              <strong>Price per Liter:</strong> ${pricePerLiter}
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="currency">Currency *</label>
                <select
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
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="fuelType">Fuel Type *</label>
                <select
                  id="fuelType"
                  value={formData.fuelType}
                  onChange={(e) => setFormData({ ...formData, fuelType: e.target.value as any })}
                  required
                  disabled={loading}
                >
                  <option value="GASOLINE">Gasoline</option>
                  <option value="DIESEL">Diesel</option>
                  <option value="ELECTRIC">Electric</option>
                </select>
              </div>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Saving...' : 'Save Entry'}
              </button>
              <button 
                type="button" 
                className="btn-secondary" 
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
                Start Over
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // Show photo upload form
  return (
    <div className="form-page">
      <div className="form-container">
        <h1>Add Fill-Up Entry (Photo)</h1>
        <p className="form-description">
          Upload a photo of your fuel receipt. Our AI will extract the information for you to review and confirm.
        </p>

        {error && <div className="error-message">{error}</div>}
        {uploadStatus && <div className="info-message">{uploadStatus}</div>}

        <form onSubmit={handleUploadPhoto}>
          <div className="form-group">
            <label htmlFor="vehicleId">Vehicle *</label>
            <select
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
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="photo">Receipt Photo *</label>
            <input
              id="photo"
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              required
              disabled={loading}
            />
          </div>

          {previewUrl && (
            <div className="photo-preview">
              <img src={previewUrl} alt="Receipt preview" />
            </div>
          )}

          <div className="form-actions">
            <button type="submit" className="btn-primary" disabled={loading || !selectedFile}>
              {loading ? uploadStatus : '📸 Upload & Process'}
            </button>
            <button 
              type="button" 
              className="btn-secondary" 
              onClick={() => router.back()}
              disabled={loading}
            >
              Cancel
            </button>
          </div>
        </form>

        <div className="info-box">
          <h3>Tips for best results:</h3>
          <ul>
            <li>Ensure the receipt is well-lit and clearly visible</li>
            <li>Include the entire receipt in the photo</li>
            <li>Make sure text is readable and not blurry</li>
            <li>The AI will extract: date, volume, cost, and price per liter</li>
            <li>You will review and confirm all extracted data before saving</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
