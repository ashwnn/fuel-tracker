import { Prisma } from '@prisma/client';
import { prisma } from '../prisma';
import { toKm, toLiters, mpgFromMetric, calculateLPer100Km } from '../utils/conversions';
import { CreateEntryInput } from '../utils/validation';

/**
 * Calculate derived fields for a fill-up entry
 * This includes:
 * - pricePerLiter
 * - distanceSinceLastKm (if previous entry exists)
 * - economyLPer100Km (if full fill and previous entry exists)
 * - economyMpg (if full fill and previous entry exists)
 * - costPerKm (if previous entry exists)
 */
export async function calculateDerivedFields(
  userId: number,
  vehicleId: number,
  tankId: number | null | undefined,
  input: any
): Promise<{
  odometerKm: number;
  fuelVolumeL: number;
  pricePerLiter: number | null;
  distanceSinceLastKm: number | null;
  economyLPer100Km: number | null;
  economyMpg: number | null;
  costPerKm: number | null;
}> {
  // Handle both old and new input formats
  const odometerKm = input.odometerKm ?? toKm(input.odometer, input.odometerUnit);
  const fuelVolumeL = input.fuelVolumeL ?? toLiters(input.fuelVolume, input.fuelUnit);
  const totalCost = input.totalCost;

  // Calculate price per liter
  const pricePerLiter = fuelVolumeL > 0 ? totalCost / fuelVolumeL : null;

  // Find the previous entry for this vehicle/tank combination
  const previous = await prisma.fillUpEntry.findFirst({
    where: {
      userId,
      vehicleId,
      tankId: tankId ?? null,
      odometerKm: { lt: odometerKm },
    },
    orderBy: { odometerKm: 'desc' },
  });

  let distanceSinceLastKm: number | null = null;
  let economyLPer100Km: number | null = null;
  let economyMpg: number | null = null;
  let costPerKm: number | null = null;

  if (previous) {
    const dist = odometerKm - Number(previous.odometerKm);
    
    if (dist > 0) {
      distanceSinceLastKm = dist;

      // Only calculate economy for FULL fills
      if (input.fillLevel === 'FULL' && fuelVolumeL > 0) {
        economyLPer100Km = calculateLPer100Km(dist, fuelVolumeL);
        economyMpg = mpgFromMetric(dist, fuelVolumeL);
      }

      // Calculate cost per km
      costPerKm = totalCost / dist;
    }
  }

  return {
    odometerKm,
    fuelVolumeL,
    pricePerLiter,
    distanceSinceLastKm,
    economyLPer100Km,
    economyMpg,
    costPerKm,
  };
}

/**
 * Calculate fuel statistics for a vehicle or tank
 */
export async function calculateFuelStats(
  vehicleId: number,
  tankId?: number,
  fuelType?: string
) {
  const where: Prisma.FillUpEntryWhereInput = {
    vehicleId,
    ...(tankId && { tankId }),
    ...(fuelType && { fuelType: fuelType as any }),
  };

  const entries = await prisma.fillUpEntry.findMany({
    where,
    orderBy: { entryDate: 'asc' },
  });

  if (entries.length === 0) {
    return {
      totalFuelL: 0,
      totalCost: 0,
      totalDistanceKm: 0,
      avgEconomyLPer100Km: null,
      avgPricePerLiter: null,
      entryCount: 0,
    };
  }

  const totalFuelL = entries.reduce((sum, e) => sum + Number(e.fuelVolumeL), 0);
  const totalCost = entries.reduce((sum, e) => sum + Number(e.totalCost), 0);
  
  // Calculate total distance (difference between first and last odometer)
  const totalDistanceKm = entries.length > 1
    ? Number(entries[entries.length - 1].odometerKm) - Number(entries[0].odometerKm)
    : 0;

  // Calculate average economy from full fills only
  const fullFills = entries.filter(e => e.fillLevel === 'FULL' && e.economyLPer100Km !== null);
  const avgEconomyLPer100Km = fullFills.length > 0
    ? fullFills.reduce((sum, e) => sum + Number(e.economyLPer100Km), 0) / fullFills.length
    : null;

  const mpgSamples = entries.filter(e => e.fillLevel === 'FULL' && e.economyMpg !== null);
  const avgEconomyMpg = mpgSamples.length > 0
    ? mpgSamples.reduce((sum, e) => sum + Number(e.economyMpg), 0) / mpgSamples.length
    : null;

  const avgPricePerLiter = totalFuelL > 0 ? totalCost / totalFuelL : null;

  return {
    totalFuelL,
    totalCost,
    totalDistanceKm,
    avgEconomyLPer100Km,
    avgEconomyMpg,
    avgPricePerLiter,
    entryCount: entries.length,
  };
}
