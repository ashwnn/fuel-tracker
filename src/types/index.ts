// Shared types for the application

export type DistanceUnit = 'KM' | 'MILE';
export type VolumeUnit = 'LITER' | 'GALLON';
export type EconomyUnit = 'L_PER_100KM' | 'MPG';
export type FuelType = 'REGULAR' | 'PREMIUM' | 'DIESEL' | 'E85' | 'OTHER';
export type FillLevel = 'FULL' | 'PARTIAL';
export type EntrySourceType = 'MANUAL' | 'PHOTO_AI' | 'API';
export type TransmissionType = 'AUTOMATIC' | 'MANUAL' | 'CVT' | 'DCT' | 'OTHER';

export interface User {
  id: number;
  email: string;
  defaultDistanceUnit: DistanceUnit;
  defaultVolumeUnit: VolumeUnit;
  defaultEconomyUnit: EconomyUnit;
  defaultCurrency: string;
  createdAt: string;
}

export interface Vehicle {
  id: number;
  userId: number;
  name: string;
  make?: string;
  model?: string;
  year?: number;
  transmissionType?: TransmissionType;
  expectedMpg?: number;
  createdAt: string;
  updatedAt: string;
  tanks?: TankProfile[];
  stats?: VehicleStats;
}

export interface TankProfile {
  id: number;
  vehicleId: number;
  name: string;
  fuelType: FuelType;
  capacityL?: number;
  createdAt: string;
  updatedAt: string;
}

export interface FillUpEntry {
  id: number;
  userId: number;
  vehicleId: number;
  tankId?: number;
  entryDate: string;
  odometerKm: number;
  fuelVolumeL: number;
  totalCost: number;
  currency: string;
  pricePerLiter?: number;
  fuelType: FuelType;
  fillLevel: FillLevel;
  sourceType: EntrySourceType;
  imageUrl?: string;
  aiConfidence?: number;
  distanceSinceLastKm?: number;
  economyLPer100Km?: number;
  economyMpg?: number;
  costPerKm?: number;
  createdAt: string;
  updatedAt: string;
  tank?: TankProfile;
  vehicle?: {
    name: string;
    make?: string;
    model?: string;
    year?: number;
  };
}

export interface MonthlyBudget {
  id: number;
  userId: number;
  year: number;
  month: number;
  currency: string;
  amount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ApiKey {
  id: number;
  name: string;
  createdAt: string;
  lastUsedAt?: string;
  isActive: boolean;
  revokedAt?: string;
  key?: string; // Only present on creation
}

export interface VehicleStats {
  totalFuelL: number;
  totalCost: number;
  totalDistanceKm: number;
  avgEconomyLPer100Km?: number;
  avgEconomyMpg?: number;
  avgPricePerLiter?: number;
  entryCount: number;
}

export interface BudgetUsage {
  budget: {
    amount: number;
    currency: string;
  } | null;
  totalSpent: number;
  percentUsed?: number;
  entryCount: number;
}
