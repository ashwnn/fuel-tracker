import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/server/auth';
import { prisma } from '@/server/prisma';
import { createVehicleSchema } from '@/server/utils/validation';
import { calculateFuelStats } from '@/server/utils/calculations';

// GET /api/vehicles - List all vehicles for authenticated user
export async function GET(req: NextRequest) {
  try {
    const user = await authenticate(req.headers);
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const vehicles = await prisma.vehicle.findMany({
      where: { userId: user.id },
      include: {
        tanks: true,
        _count: {
          select: { entries: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate stats for each vehicle
    const vehiclesWithStats = await Promise.all(
      vehicles.map(async (vehicle) => {
        const stats = await calculateFuelStats(vehicle.id);
        return {
          ...vehicle,
          stats,
        };
      })
    );

    return NextResponse.json({
      vehicles: vehiclesWithStats.map((v: any) => ({
        ...v,
        expectedMpg: v.expectedMpg ? Number(v.expectedMpg) : null,
      })),
    });
  } catch (error) {
    console.error('Get vehicles error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/vehicles - Create new vehicle
export async function POST(req: NextRequest) {
  try {
    const user = await authenticate(req.headers);
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await req.json();
    const parsed = createVehicleSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.errors },
        { status: 400 }
      );
    }

    const vehicle = await prisma.vehicle.create({
      data: {
        userId: user.id,
        ...parsed.data,
      },
      include: {
        tanks: true,
      },
    });

    return NextResponse.json({ vehicle: { ...vehicle, expectedMpg: vehicle.expectedMpg ? Number(vehicle.expectedMpg) : null } }, { status: 201 });
  } catch (error) {
    console.error('Create vehicle error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
