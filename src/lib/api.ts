import { toNumber } from './number';

// API client helper functions

const API_BASE =
  typeof window === 'undefined'
    ? process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    : '';

interface FetchOptions extends RequestInit {
  token?: string;
}

/**
 * Normalize a single entry by converting numeric string fields to numbers.
 * This consolidates the duplicate normalization logic that was scattered throughout the code.
 */
function coerceNumber(value: any, field: string) {
  const parsed = toNumber(value);
  if (parsed == null) {
    if (value != null) {
      console.warn(`[api] Skipping invalid numeric value for ${field}`, value);
    }
    return null;
  }
  return parsed;
}

function normalizeEntry(entry: any) {
  return {
    ...entry,
    odometerKm: coerceNumber(entry.odometerKm, 'entry.odometerKm'),
    fuelVolumeL: coerceNumber(entry.fuelVolumeL, 'entry.fuelVolumeL'),
    totalCost: coerceNumber(entry.totalCost, 'entry.totalCost'),
    pricePerLiter: coerceNumber(entry.pricePerLiter, 'entry.pricePerLiter'),
    distanceSinceLastKm: coerceNumber(entry.distanceSinceLastKm, 'entry.distanceSinceLastKm'),
    economyLPer100Km: coerceNumber(entry.economyLPer100Km, 'entry.economyLPer100Km'),
    economyMpg: coerceNumber(entry.economyMpg, 'entry.economyMpg'),
    costPerKm: coerceNumber(entry.costPerKm, 'entry.costPerKm'),
  };
}

/**
 * Normalize a vehicle by converting numeric fields to numbers.
 */
function normalizeVehicle(vehicle: any) {
  if (vehicle && Array.isArray(vehicle.entries)) {
    vehicle.entries = vehicle.entries.map(normalizeEntry);
  }
  if (vehicle?.expectedMpg != null) {
    vehicle.expectedMpg = coerceNumber(vehicle.expectedMpg, 'vehicle.expectedMpg');
  }
  if (vehicle?.stats) {
    if (vehicle.stats.avgEconomyLPer100Km != null) vehicle.stats.avgEconomyLPer100Km = coerceNumber(vehicle.stats.avgEconomyLPer100Km, 'vehicle.stats.avgEconomyLPer100Km');
    if (vehicle.stats.avgEconomyMpg != null) vehicle.stats.avgEconomyMpg = coerceNumber(vehicle.stats.avgEconomyMpg, 'vehicle.stats.avgEconomyMpg');
    if (vehicle.stats.totalFuelL != null) vehicle.stats.totalFuelL = coerceNumber(vehicle.stats.totalFuelL, 'vehicle.stats.totalFuelL');
    if (vehicle.stats.totalCost != null) vehicle.stats.totalCost = coerceNumber(vehicle.stats.totalCost, 'vehicle.stats.totalCost');
    if (vehicle.stats.totalDistanceKm != null) vehicle.stats.totalDistanceKm = coerceNumber(vehicle.stats.totalDistanceKm, 'vehicle.stats.totalDistanceKm');
  }
  return vehicle;
}

async function apiFetch<T>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<T> {
  const { token, ...fetchOptions } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...fetchOptions,
    headers,
    credentials: 'include', // Include cookies
  });

  let result: any = null;
  try {
    result = await response.json();
  } catch (parseError) {
    console.error('Failed to parse response body', parseError);
  }

  if (!response.ok) {
    const message = result?.error || `Request failed (${response.status})`;
    throw new Error(message);
  }

  if (result == null) {
    throw new Error('Invalid server response');
  }

  return result;
}

export const api = {
  // Auth
  auth: {
    register: (email: string, password: string) =>
      apiFetch('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),
    
    login: (email: string, password: string) =>
      apiFetch<{ user: any; token: string }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),
    
    logout: () =>
      apiFetch('/api/auth/logout', {
        method: 'POST',
      }),
    
    me: (token: string) =>
      apiFetch<{ user: any }>('/api/auth/me', { token }),
  },

  // Vehicles
  vehicles: {
    list: (token: string) =>
      apiFetch<{ vehicles: any[] }>('/api/vehicles', { token }),
    
    get: async (id: number, token: string) => {
      const result = await apiFetch<any>(`/api/vehicles/${id}`, { token });
      return { vehicle: normalizeVehicle(result.vehicle) };
    },
    
    create: (data: any, token: string) =>
      apiFetch<{ vehicle: any }>('/api/vehicles', {
        method: 'POST',
        body: JSON.stringify(data),
        token,
      }),
    
    update: (id: number, data: any, token: string) =>
      apiFetch<{ vehicle: any }>(`/api/vehicles/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
        token,
      }),
    
    delete: (id: number, token: string) =>
      apiFetch(`/api/vehicles/${id}`, {
        method: 'DELETE',
        token,
      }),
  },

  // Entries
  entries: {
    list: async (vehicleId: number, token: string, params?: URLSearchParams) => {
      const query = params ? `?${params.toString()}` : '';
      const result = await apiFetch<{ entries: any[]; total: number }>(`/api/vehicles/${vehicleId}/entries${query}`, { token });
      return { ...result, entries: result.entries.map(normalizeEntry) };
    },
    
    create: (vehicleId: number, data: any, token: string) =>
      apiFetch<{ entry: any }>(`/api/vehicles/${vehicleId}/entries`, {
        method: 'POST',
        body: JSON.stringify(data),
        token,
      }),
    
    delete: (vehicleId: number, entryId: number, token: string) =>
      apiFetch(`/api/vehicles/${vehicleId}/entries/${entryId}`, {
        method: 'DELETE',
        token,
      }),
    
    uploadPhoto: (vehicleId: number, formData: FormData, token: string) =>
      fetch(`${API_BASE}/api/vehicles/${vehicleId}/entries/photo`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
        credentials: 'include',
      }).then(async (res) => {
        if (!res.ok) {
          const error = await res.json().catch(() => ({ error: 'Upload failed' }));
          throw new Error(error.error || 'Upload failed');
        }
        return res.json();
      }),
  },

  // Budgets
  budgets: {
    get: (token: string) =>
      apiFetch<{ budget: any | null }>('/api/me/budgets', { token }),
    
    create: (data: { amount: number; currency: string }, token: string) =>
      apiFetch<{ budget: any }>('/api/me/budgets', {
        method: 'POST',
        body: JSON.stringify(data),
        token,
      }),
    
    delete: (token: string) =>
      apiFetch('/api/me/budgets', {
        method: 'DELETE',
        token,
      }),
    
    getUsage: (year: number, month: number, token: string) =>
      apiFetch<any>(`/api/me/budgets/${year}/${month}/usage`, { token }),
  },

  // Dashboard - Consolidated endpoint for faster loading
  dashboard: {
    getInitialData: (token: string) =>
      apiFetch<{
        vehicles: any[];
        budgetUsage: any;
        lastEntries: Record<number, any>;
        fleetHealth?: {
          fleetAvgMpg: number | null;
          expectedAvgMpg: number | null;
          healthScore: number | null;
        };
      }>('/api/dashboard', { token }).then((data) => {
        return {
          ...data,
          vehicles: data.vehicles.map(normalizeVehicle),
          fleetHealth: data.fleetHealth
            ? {
                fleetAvgMpg: data.fleetHealth.fleetAvgMpg != null ? Number(data.fleetHealth.fleetAvgMpg) : null,
                expectedAvgMpg: data.fleetHealth.expectedAvgMpg != null ? Number(data.fleetHealth.expectedAvgMpg) : null,
                healthScore: data.fleetHealth.healthScore != null ? Number(data.fleetHealth.healthScore) : null,
              }
            : undefined,
        };
      }),
  },

  // API Keys
  apiKeys: {
    list: (token: string) =>
      apiFetch<{ apiKeys: any[] }>('/api/me/api-keys', { token }),
    
    create: (name: string, token: string) =>
      apiFetch<{ apiKey: any; warning: string }>('/api/me/api-keys', {
        method: 'POST',
        body: JSON.stringify({ name }),
        token,
      }),
    
    revoke: (id: number, token: string) =>
      apiFetch(`/api/me/api-keys/${id}`, {
        method: 'DELETE',
        token,
      }),
  },

  // Export
  export: {
    json: (token: string) =>
      apiFetch<any>('/api/export/json', { token }),
    
    csv: (token: string, vehicleId?: number) => {
      const query = vehicleId ? `?vehicleId=${vehicleId}` : '';
      return fetch(`${API_BASE}/api/export/csv${query}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
      });
    },
  },
};
