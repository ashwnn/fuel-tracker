-- Add transmission type enum column and expected MPG hint to vehicles
ALTER TABLE `Vehicle`
  ADD COLUMN `transmissionType` enum('AUTOMATIC','MANUAL','CVT','DCT','OTHER') NULL;

ALTER TABLE `Vehicle`
  ADD COLUMN `expectedMpg` decimal(8,3) NULL;
