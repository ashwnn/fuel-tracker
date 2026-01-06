import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/server/prisma';
import { verifyPassword, generateToken } from '@/server/auth';
import { loginSchema } from '@/server/utils/validation';

export async function POST(req: NextRequest) {
  console.log('[LOGIN] Request received');
  
  try {
    const body = await req.json();
    console.log('[LOGIN] Body parsed:', { email: body.email, passwordLength: body.password?.length });
    
    const parsed = loginSchema.safeParse(body);
    console.log('[LOGIN] Schema validation result:', parsed.success ? 'PASS' : 'FAIL');

    if (!parsed.success) {
      console.log('[LOGIN] Validation errors:', parsed.error.errors);
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.errors },
        { status: 400 }
      );
    }

    const { email, password } = parsed.data;
    console.log('[LOGIN] Attempting login for:', email);

    // Find user
    console.log('[LOGIN] Looking up user...');
    const user = await prisma.user.findUnique({
      where: { email },
    });
    console.log('[LOGIN] User lookup:', user ? 'FOUND' : 'NOT FOUND');

    if (!user) {
      console.log('[LOGIN] User not found for email:', email);
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Verify password
    console.log('[LOGIN] Verifying password...');
    const valid = await verifyPassword(password, user.passwordHash);
    console.log('[LOGIN] Password verification result:', valid ? 'VALID' : 'INVALID');
    
    if (!valid) {
      console.log('[LOGIN] Password mismatch for user:', email);
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Generate token
    console.log('[LOGIN] Generating JWT token...');
    const token = generateToken(user);
    console.log('[LOGIN] Token generated successfully');

    // Create response with cookie
    const response = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        defaultDistanceUnit: user.defaultDistanceUnit,
        defaultVolumeUnit: user.defaultVolumeUnit,
        defaultEconomyUnit: user.defaultEconomyUnit,
        defaultCurrency: user.defaultCurrency,
      },
      token,
    });

    // Set HTTP-only cookie
    console.log('[LOGIN] Setting HTTP-only cookie...');
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days to match token TTL
    });

    console.log('[LOGIN] Login successful for:', email);
    return response;
  } catch (error) {
    console.error('[LOGIN] ERROR:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : '';
    console.error('[LOGIN] Error message:', errorMessage);
    console.error('[LOGIN] Error stack:', errorStack);
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? {
          message: errorMessage,
          stack: errorStack,
        } : undefined,
      },
      { status: 500 }
    );
  }
}
