import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/server/auth';
import { prisma } from '@/server/prisma';

interface FuelReceiptData {
  date?: string;
  amount?: number;
  volume?: number;
  pricePerLiter?: number;
  currency?: string;
  fuelType?: string;
  confidence?: number;
}

const GEMINI_MODEL = 'gemini-2.0-flash';
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

function normalizeFuelType(fuelType?: string) {
  const normalized = (fuelType || '').toUpperCase();
  if (normalized === 'REGULAR' || normalized === 'GAS') return 'GASOLINE';
  if (normalized === 'ELECTRIC' || normalized === 'OTHER') return 'ELECTRIC';
  if (normalized === 'DIESEL') return 'DIESEL';
  return 'GASOLINE';
}

async function callGemini(base64Photo: string, mimeType: string) {
  const geminiApiKey = process.env.GEMINI_API_KEY;
  if (!geminiApiKey) {
    throw new Error('GEMINI_API_KEY not found in environment');
  }

  const prompt = `Analyze this fuel receipt image and extract the following information in JSON format:
{
  "date": "YYYY-MM-DD format or null if not found",
  "amount": "Total amount paid (number or null)",
  "volume": "Fuel volume in liters (number or null)",
  "pricePerLiter": "Price per liter (number or null)",
  "currency": "Currency code (e.g., USD, EUR) or null",
  "fuelType": "Type of fuel (e.g., GASOLINE, DIESEL, ELECTRIC) or null",
  "confidence": "Confidence level 0-100"
}

If any information cannot be extracted, set it to null. Respond ONLY with the JSON object, no additional text.`;

  const response = await fetch(`${GEMINI_ENDPOINT}?key=${geminiApiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            {
              inline_data: {
                mime_type: mimeType || 'image/jpeg',
                data: base64Photo,
              },
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`Gemini request failed (${response.status}): ${errorText}`);
  }

  return response.json();
}

// POST /api/vehicles/[id]/entries/photo - Process photo and create entry
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  console.log('[ENTRY PHOTO] Request received');
  
  try {
    const user = await authenticate(req.headers);
    console.log('[ENTRY PHOTO] Authentication:', user ? 'OK' : 'FAILED');
    
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { id } = await params;
    const vehicleId = parseInt(id);
    console.log('[ENTRY PHOTO] Vehicle ID:', vehicleId);

    // Verify vehicle ownership
    const vehicle = await prisma.vehicle.findFirst({
      where: { id: vehicleId, userId: user.id },
    });

    if (!vehicle) {
      console.log('[ENTRY PHOTO] Vehicle not found');
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
    }

    // Parse FormData
    const formData = await req.formData();
    const photo = formData.get('photo') as File;

    if (!photo) {
      console.log('[ENTRY PHOTO] No photo provided');
      return NextResponse.json({ error: 'No photo provided' }, { status: 400 });
    }

    console.log('[ENTRY PHOTO] Photo received:', { name: photo.name, size: photo.size, type: photo.type });

    // Convert photo to base64
    console.log('[ENTRY PHOTO] Converting photo to base64...');
    const photoBuffer = await photo.arrayBuffer();
    const base64Photo = Buffer.from(photoBuffer).toString('base64');

    // Call Gemini Vision to analyze the receipt
    console.log('[ENTRY PHOTO] Sending photo to Gemini for analysis...');
    const aiResponse = await callGemini(base64Photo, photo.type);
    console.log('[ENTRY PHOTO] Gemini response received');
    
    // Parse the AI response
    let fuelData: FuelReceiptData = {
      confidence: 0,
    };

    const aiText = (aiResponse?.candidates?.[0]?.content?.parts || [])
      .map((part: any) => (typeof part.text === 'string' ? part.text : ''))
      .filter(Boolean)
      .join('\n');

    console.log('[ENTRY PHOTO] AI Response text:', aiText);

    if (aiText) {
      try {
        fuelData = JSON.parse(aiText);
        console.log('[ENTRY PHOTO] Parsed fuel data:', fuelData);
      } catch (parseError) {
        console.error('[ENTRY PHOTO] Failed to parse AI response:', parseError);
        // Try to extract JSON from markdown code blocks or raw text
        let jsonStr = aiText;
        const codeBlockMatch = aiText.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (codeBlockMatch) {
          jsonStr = codeBlockMatch[1];
        }
        const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            fuelData = JSON.parse(jsonMatch[0]);
            console.log('[ENTRY PHOTO] Extracted fuel data from response:', fuelData);
          } catch (secondParseError) {
            console.error('[ENTRY PHOTO] Failed to extract JSON:', secondParseError);
          }
        }
      }
    }

    // Return extracted data for user to review and confirm
    console.log('[ENTRY PHOTO] Returning extracted data for user confirmation');
    
    // Map fuel type to frontend format
    const frontendFuelType = normalizeFuelType(fuelData.fuelType);

    const amount = fuelData.amount != null ? Number(fuelData.amount) : null;
    const volume = fuelData.volume != null ? Number(fuelData.volume) : null;
    const pricePerLiter = fuelData.pricePerLiter != null ? Number(fuelData.pricePerLiter) : null;
    const confidence = fuelData.confidence != null ? Number(fuelData.confidence) : 0;

    // Compute price per liter if AI did not supply one but volume and amount exist
    const computedPricePerLiter =
      pricePerLiter ?? (amount && volume ? amount / volume : null);

    // Return pre-fill data without creating entry
    const preFilledData = {
      entryDate: fuelData.date || new Date().toISOString().split('T')[0],
      fuelVolumeL: volume ?? '',
      totalCost: amount ?? '',
      currency: fuelData.currency || 'USD',
      fuelType: frontendFuelType,
      pricePerLiter: computedPricePerLiter || null,
      aiConfidence: confidence,
    };

    console.log('[ENTRY PHOTO] Returning pre-filled data:', preFilledData);
    
    return NextResponse.json({ 
      prefilledData: preFilledData,
      message: 'Photo processed. Please review and adjust the extracted data before saving.',
    }, { status: 200 });
  } catch (error) {
    console.error('[ENTRY PHOTO] ERROR:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[ENTRY PHOTO] Error message:', errorMessage);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
    }, { status: 500 });
  }
}
