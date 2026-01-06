import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/server/auth';
import { prisma } from '@/server/prisma';
import { createEntrySchema } from '@/server/utils/validation';
import { calculateDerivedFields } from '@/server/utils/calculations';

// GET /api/vehicles/[id]/entries - List entries for a vehicle
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticate(req.headers);
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { id } = await params;
    const vehicleId = parseInt(id);

    if (Number.isNaN(vehicleId)) {
      return NextResponse.json({ error: 'Invalid vehicle id' }, { status: 400 });
    }

    // Verify vehicle ownership
    const vehicle = await prisma.vehicle.findFirst({
      where: { id: vehicleId, userId: user.id },
    });

    if (!vehicle) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
    }

    // Parse query parameters
    const { searchParams } = new URL(req.url);
    const tankId = searchParams.get('tankId');
    const fuelType = searchParams.get('fuelType');
    const fillLevel = searchParams.get('fillLevel');
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const entries = await prisma.fillUpEntry.findMany({
      where: {
        vehicleId,
        userId: user.id,
        ...(tankId && { tankId: parseInt(tankId) }),
        ...(fuelType && { fuelType: fuelType as any }),
        ...(fillLevel && { fillLevel: fillLevel as any }),
        ...(from && { entryDate: { gte: new Date(from) } }),
        ...(to && { entryDate: { lte: new Date(to) } }),
      },
      include: {
        tank: true,
      },
      orderBy: { entryDate: 'desc' },
      take: limit,
      skip: offset,
    });

    const total = await prisma.fillUpEntry.count({
      where: {
        vehicleId,
        userId: user.id,
        ...(tankId && { tankId: parseInt(tankId) }),
        ...(fuelType && { fuelType: fuelType as any }),
        ...(fillLevel && { fillLevel: fillLevel as any }),
        ...(from && { entryDate: { gte: new Date(from) } }),
        ...(to && { entryDate: { lte: new Date(to) } }),
      },
    });

    return NextResponse.json({ entries, total, limit, offset });
  } catch (error) {
    console.error('Get entries error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/vehicles/[id]/entries - Create new entry
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  console.log('[ENTRY CREATE] Request received');
  
  try {
    const user = await authenticate(req.headers);
    console.log('[ENTRY CREATE] Authentication:', user ? 'OK' : 'FAILED');
    
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { id } = await params;
    const vehicleId = parseInt(id);
    console.log('[ENTRY CREATE] Vehicle ID:', vehicleId);

    if (Number.isNaN(vehicleId)) {
      console.log('[ENTRY CREATE] Invalid vehicle id');
      return NextResponse.json({ error: 'Invalid vehicle id' }, { status: 400 });
    }

    // Verify vehicle ownership
    const vehicle = await prisma.vehicle.findFirst({
      where: { id: vehicleId, userId: user.id },
    });

    if (!vehicle) {
      console.log('[ENTRY CREATE] Vehicle not found');
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
    }

    const body = await req.json();
    console.log('[ENTRY CREATE] Request body:', body);
    
    const parsed = createEntrySchema.safeParse(body);
    console.log('[ENTRY CREATE] Schema validation:', parsed.success ? 'PASS' : 'FAIL');

    if (!parsed.success) {
      console.log('[ENTRY CREATE] Validation errors:', parsed.error.errors);
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.errors },
        { status: 400 }
      );
    }

    const input = parsed.data;
    console.log('[ENTRY CREATE] Parsed input:', { odometerKm: input.odometerKm, fuelVolumeL: input.fuelVolumeL, totalCost: input.totalCost });

    // Verify tank ownership if tankProfileId provided
    if (input.tankProfileId) {
      const tank = await prisma.tankProfile.findFirst({
        where: {
          id: input.tankProfileId,
          vehicleId,
        },
      });

      if (!tank) {
        console.log('[ENTRY CREATE] Tank not found');
        return NextResponse.json({ error: 'Tank not found' }, { status: 404 });
      }
    }

    // Calculate derived fields
    console.log('[ENTRY CREATE] Calculating derived fields...');
    const derived = await calculateDerivedFields(
      user.id,
      vehicleId,
      input.tankProfileId ?? null,
      input
    );
    console.log('[ENTRY CREATE] Derived fields calculated:', { economyLPer100Km: derived.economyLPer100Km, pricePerLiter: derived.pricePerLiter });

    // Map fuelType - GASOLINE/ELECTRIC from frontend to REGULAR/OTHER in database
    let dbFuelType = input.fuelType;
    if (input.fuelType === 'GASOLINE') dbFuelType = 'REGULAR';
    if (input.fuelType === 'ELECTRIC') dbFuelType = 'OTHER';

    // Create entry
    console.log('[ENTRY CREATE] Creating entry in database...');
    const entry = await prisma.fillUpEntry.create({
      data: {
        userId: user.id,
        vehicleId,
        tankId: input.tankProfileId ?? null,
        entryDate: input.entryDate ? new Date(input.entryDate) : new Date(),
        odometerKm: derived.odometerKm,
        fuelVolumeL: derived.fuelVolumeL,
        totalCost: input.totalCost,
        currency: input.currency || 'USD',
        pricePerLiter: derived.pricePerLiter,
        fuelType: dbFuelType as any,
        fillLevel: input.fillLevel,
        sourceType: input.sourceType,
        imageUrl: input.imageUrl,
        aiConfidence: input.aiConfidence,
        distanceSinceLastKm: derived.distanceSinceLastKm,
        economyLPer100Km: derived.economyLPer100Km,
        economyMpg: derived.economyMpg,
        costPerKm: derived.costPerKm,
      },
      include: {
        tank: true,
      },
    });

    console.log('[ENTRY CREATE] Entry created successfully:', { id: entry.id, vehicleId, odometerKm: entry.odometerKm });
    return NextResponse.json({ entry }, { status: 201 });
  } catch (error) {
    console.error('[ENTRY CREATE] ERROR:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[ENTRY CREATE] Error message:', errorMessage);
    const isClientError =
      typeof errorMessage === 'string' &&
      (errorMessage.toLowerCase().includes('invalid') || errorMessage.toLowerCase().includes('must be'));

    return NextResponse.json({ 
      error: isClientError ? errorMessage : 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
    }, { status: isClientError ? 400 : 500 });
  }
}
