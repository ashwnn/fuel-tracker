import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/server/prisma';
import { verifyToken, JWTPayload } from '@/server/auth';

/**
 * GET /api/dashboard
 * 
 * Consolidated endpoint for fetching all dashboard data in a single request.
 * This replaces multiple separate API calls and significantly improves performance.
 * 
 * Returns:
 * - vehicles: Array of all user's vehicles with stats
 * - budgetUsage: Current month's budget usage
 * - lastEntries: Last entry for each vehicle (most recent first)
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const userId = payload.userId;
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    // Fetch all data in parallel for maximum efficiency
    const [vehicles, budget, entries] = await Promise.all([
      // Get all vehicles with their entries for stats
      prisma.vehicle.findMany({
        where: { userId },
        include: {
          entries: {
            select: {
              id: true,
              fuelVolumeL: true,
              totalCost: true,
              economyLPer100Km: true,
              economyMpg: true,
            },
          },
          tanks: true,
        },
      }),

      // Get current month's budget
      prisma.monthlyBudget.findUnique({
        where: { userId },
      }),

      // Get last entry for each vehicle
      prisma.fillUpEntry.findMany({
        where: {
          vehicle: {
            userId,
          },
        },
        orderBy: {
          entryDate: 'desc',
        },
      }),
    ]);

    // Calculate vehicle stats
    const vehiclesWithStats = vehicles.map((vehicle: any) => {
      const vehicleEntries = entries.filter((e: any) => e.vehicleId === vehicle.id);
      const totalFuelL = vehicleEntries.reduce((sum: number, e: any) => sum + Number(e.fuelVolumeL || 0), 0);
      const totalCost = vehicleEntries.reduce((sum: number, e: any) => sum + Number(e.totalCost || 0), 0);

      const economySamples = vehicleEntries.filter((e: any) => e.economyLPer100Km);
      const avgEconomyLPer100Km = economySamples.length > 0
        ? economySamples.reduce((sum: number, e: any) => sum + Number(e.economyLPer100Km || 0), 0) / economySamples.length
        : null;

      const mpgSamples = vehicleEntries.filter((e: any) => e.economyMpg);
      const avgEconomyMpg = mpgSamples.length > 0
        ? mpgSamples.reduce((sum: number, e: any) => sum + Number(e.economyMpg || 0), 0) / mpgSamples.length
        : null;

      return {
        ...vehicle,
        expectedMpg: vehicle.expectedMpg ? Number(vehicle.expectedMpg) : null,
        stats: {
          entryCount: vehicleEntries.length,
          totalFuelL,
          totalCost,
          avgEconomyLPer100Km: avgEconomyLPer100Km || null,
          avgEconomyMpg: avgEconomyMpg || null,
        },
      };
    });

    // Calculate budget usage for current month
    const currentMonthEntries = entries.filter((entry: any) => {
      const entryDate = new Date(entry.entryDate);
      return entryDate.getFullYear() === currentYear && entryDate.getMonth() + 1 === currentMonth;
    });

    const totalSpent = currentMonthEntries.reduce((sum: number, e: any) => sum + Number(e.totalCost || 0), 0);
    const budgetUsage = budget
      ? {
          budget: {
            id: budget.id,
            userId: budget.userId,
            amount: Number(budget.amount),
            currency: budget.currency,
          },
          totalSpent,
          percentUsed: (totalSpent / Number(budget.amount)) * 100,
        }
      : null;

    // Get last entry for each vehicle (for the "Last Fill-Up" section)
    const lastEntries: Record<number, any> = {};
    vehicles.forEach((vehicle: any) => {
      const lastEntry = entries.find((e: any) => e.vehicleId === vehicle.id);
      if (lastEntry) {
        lastEntries[vehicle.id] = lastEntry;
      }
    });

    // Fleet-wide MPG health vs expected
    const fleetMpgSamples = entries.filter((e: any) => e.economyMpg);
    const fleetAvgMpg = fleetMpgSamples.length > 0
      ? fleetMpgSamples.reduce((sum: number, e: any) => sum + Number(e.economyMpg || 0), 0) / fleetMpgSamples.length
      : null;

    const expectedValues = vehiclesWithStats
      .filter((v: any) => v.expectedMpg)
      .map((v: any) => Number(v.expectedMpg));
    const expectedAvgMpg = expectedValues.length > 0
      ? expectedValues.reduce((sum: number, val: number) => sum + val, 0) / expectedValues.length
      : null;

    const healthScore = fleetAvgMpg && expectedAvgMpg
      ? Math.max(0, Math.min(120, (fleetAvgMpg / expectedAvgMpg) * 100))
      : null;

    // Cache for 5 minutes to reduce database load
    const response = NextResponse.json({
      vehicles: vehiclesWithStats,
      budgetUsage,
      lastEntries,
      fleetHealth: {
        fleetAvgMpg,
        expectedAvgMpg,
        healthScore,
      },
    });

    response.headers.set('Cache-Control', 'private, max-age=300, s-maxage=300');
    return response;
  } catch (error) {
    console.error('Dashboard API error:', error);
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 });
  }
}
