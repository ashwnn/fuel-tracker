import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/server/auth';
import { prisma } from '@/server/prisma';
import { updateVehicleSchema } from '@/server/utils/validation';

// GET /api/vehicles/[id] - Get single vehicle
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

    const vehicle = await prisma.vehicle.findFirst({
      where: {
        id: vehicleId,
        userId: user.id,
      },
      include: {
        tanks: true,
        entries: {
          take: 10,
          orderBy: { entryDate: 'desc' },
        },
      },
    });

    if (!vehicle) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
    }

    return NextResponse.json({ vehicle: { ...vehicle, expectedMpg: vehicle.expectedMpg ? Number(vehicle.expectedMpg) : null } });
  } catch (error) {
    console.error('Get vehicle error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/vehicles/[id] - Update vehicle
export async function PUT(
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

    const body = await req.json();
    const parsed = updateVehicleSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.errors },
        { status: 400 }
      );
    }

    const vehicle = await prisma.vehicle.updateMany({
      where: {
        id: vehicleId,
        userId: user.id,
      },
      data: parsed.data,
    });

    if (vehicle.count === 0) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
    }

    const updated = await prisma.vehicle.findUnique({
      where: { id: vehicleId },
      include: { tanks: true },
    });

    return NextResponse.json({ vehicle: updated ? { ...updated, expectedMpg: updated.expectedMpg ? Number(updated.expectedMpg) : null } : null });
  } catch (error) {
    console.error('Update vehicle error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/vehicles/[id] - Delete vehicle
export async function DELETE(
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

    const result = await prisma.vehicle.deleteMany({
      where: {
        id: vehicleId,
        userId: user.id,
      },
    });

    if (result.count === 0) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Vehicle deleted successfully' });
  } catch (error) {
    console.error('Delete vehicle error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
