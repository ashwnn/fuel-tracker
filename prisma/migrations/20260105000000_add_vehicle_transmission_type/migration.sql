-- Add missing transmissionType column to Vehicle
ALTER TABLE `Vehicle`
ADD COLUMN `transmissionType` ENUM('AUTOMATIC', 'MANUAL', 'CVT', 'DCT', 'OTHER') NULL;
