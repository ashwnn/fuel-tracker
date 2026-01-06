-- Add all missing columns to Vehicle table to match schema
ALTER TABLE `Vehicle`
ADD COLUMN `transmissionType` ENUM('AUTOMATIC', 'MANUAL', 'CVT', 'DCT', 'OTHER') NULL,
ADD COLUMN `expectedMpg` DECIMAL(8, 3) NULL;
