import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/server/auth';
import { prisma } from '@/server/prisma';

// DELETE /api/vehicles/[id]/entries/[entryId] - Delete an entry
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; entryId: string }> }
) {
  try {
    const user = await authenticate(req.headers);
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { id, entryId } = await params;
    const vehicleId = parseInt(id);
    const entryIdNum = parseInt(entryId);

    if (Number.isNaN(vehicleId) || Number.isNaN(entryIdNum)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }

    // Verify vehicle ownership
    const vehicle = await prisma.vehicle.findFirst({
      where: { id: vehicleId, userId: user.id },
    });

    if (!vehicle) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
    }

    // Delete the entry (ensuring it belongs to this vehicle and user)
    const result = await prisma.fillUpEntry.deleteMany({
      where: {
        id: entryIdNum,
        vehicleId: vehicleId,
        userId: user.id,
      },
    });

    if (result.count === 0) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Entry deleted successfully' });
  } catch (error) {
    console.error('Delete entry error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
