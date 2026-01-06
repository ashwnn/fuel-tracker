import { z } from 'zod';

// Auth schemas
export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

// Vehicle schemas
export const createVehicleSchema = z.object({
  name: z.string().min(1, "Name is required"),
  make: z.string().optional(),
  model: z.string().optional(),
  year: z.number().int().min(1900).max(new Date().getFullYear() + 1).optional(),
  transmissionType: z.enum(["AUTOMATIC", "MANUAL", "CVT", "DCT", "OTHER"]).optional(),
  expectedMpg: z.number().positive().optional(),
});

export const updateVehicleSchema = createVehicleSchema.partial();

// Tank schemas
export const createTankSchema = z.object({
  name: z.string().min(1, "Name is required"),
  fuelType: z.enum(["REGULAR", "PREMIUM", "DIESEL", "E85", "OTHER"]),
  capacityL: z.number().positive().optional(),
});

export const updateTankSchema = createTankSchema.partial();

// Entry schemas
export const createEntrySchema = z.object({
  tankProfileId: z.number().int().optional(),
  entryDate: z.string().datetime().optional(),
  odometerKm: z.number().positive("Odometer must be a positive number"),
  fuelVolumeL: z.number().positive("Fuel volume must be a positive number"),
  totalCost: z.number().positive("Total cost must be a positive number"),
  currency: z.string().default("USD"),
  fuelType: z.enum(["GASOLINE", "DIESEL", "ELECTRIC", "REGULAR", "PREMIUM", "E85", "OTHER"]),
  fillLevel: z.enum(["FULL", "PARTIAL"]).default("FULL"),
  sourceType: z.enum(["MANUAL", "PHOTO_AI", "API"]).default("MANUAL"),
  imageUrl: z.string().url().optional().or(z.literal("")),
  aiConfidence: z.number().min(0).max(100).optional(),
  location: z.string().optional(),
  notes: z.string().optional(),
});

export const updateEntrySchema = createEntrySchema.partial();

// Budget schemas
export const createBudgetSchema = z.object({
  year: z.number().int().min(2000).max(2100),
  month: z.number().int().min(1).max(12),
  currency: z.string(),
  amount: z.number().positive(),
});

// API Key schemas
export const createApiKeySchema = z.object({
  name: z.string().min(1, "Name is required"),
});

// User preferences schema
export const updateUserPreferencesSchema = z.object({
  defaultDistanceUnit: z.enum(["KM", "MILE"]).optional(),
  defaultVolumeUnit: z.enum(["LITER", "GALLON"]).optional(),
  defaultEconomyUnit: z.enum(["L_PER_100KM", "MPG"]).optional(),
  defaultCurrency: z.string().optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateVehicleInput = z.infer<typeof createVehicleSchema>;
export type UpdateVehicleInput = z.infer<typeof updateVehicleSchema>;
export type CreateTankInput = z.infer<typeof createTankSchema>;
export type UpdateTankInput = z.infer<typeof updateTankSchema>;
export type CreateEntryInput = z.infer<typeof createEntrySchema>;
export type UpdateEntryInput = z.infer<typeof updateEntrySchema>;
export type CreateBudgetInput = z.infer<typeof createBudgetSchema>;
export type CreateApiKeyInput = z.infer<typeof createApiKeySchema>;
export type UpdateUserPreferencesInput = z.infer<typeof updateUserPreferencesSchema>;
