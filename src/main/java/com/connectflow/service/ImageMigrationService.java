package com.connectflow.service;

import com.connectflow.model.PawnTransactionItemImage;
import com.connectflow.repository.PawnTransactionItemImageRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Service to migrate existing Base64 images to Cloudinary URLs.
 * Scans pawn_transaction_item_images table for non-Cloudinary URLs and uploads them.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ImageMigrationService {

    private final PawnTransactionItemImageRepository imageRepository;
    private final ImageUploadService imageUploadService;

    /**
     * Migrate all non-Cloudinary images to Cloudinary.
     * Returns migration result summary.
     */
    @Transactional
    public MigrationResult migrateAllBase64Images() {
        MigrationResult result = new MigrationResult();

        try {
            // Fetch all images that are NOT Cloudinary URLs
            List<PawnTransactionItemImage> imagesToMigrate = imageRepository.findAll().stream()
                    .filter(img -> img.getImageUrl() != null && !imageUploadService.isCloudinaryUrl(img.getImageUrl()))
                    .toList();

            log.info("Found {} images to migrate", imagesToMigrate.size());
            result.setTotalFound(imagesToMigrate.size());

            for (PawnTransactionItemImage image : imagesToMigrate) {
                try {
                    String originalUrl = image.getImageUrl();
                    log.info("Migrating image {}: {}", image.getId(), originalUrl);

                    // Upload Base64 image to Cloudinary
                    String cloudinaryUrl = imageUploadService.uploadBase64Image(
                            originalUrl,
                            image.getTransactionId().toString()
                    );

                    // Update the image record
                    image.setImageUrl(cloudinaryUrl);
                    imageRepository.save(image);

                    result.incrementSuccessful();
                    log.info("Successfully migrated image {}", image.getId());

                } catch (Exception e) {
                    result.incrementFailed();
                    log.error("Unexpected error migrating image {}: {}", image.getId(), e.getMessage(), e);
                    result.addError("Image " + image.getId() + ": " + e.getMessage());
                }
            }

            log.info("Migration complete: {} successful, {} failed", result.getSuccessful(), result.getFailed());
            return result;

        } catch (Exception e) {
            log.error("Fatal error during migration", e);
            result.setFatalError(e.getMessage());
            return result;
        }
    }

    /**
     * Migration result summary DTO
     */
    public static class MigrationResult {
        private int totalFound = 0;
        private int successful = 0;
        private int failed = 0;
        private String fatalError = null;
        private final java.util.List<String> errors = new java.util.ArrayList<>();

        public int getTotalFound() {
            return totalFound;
        }

        public void setTotalFound(int totalFound) {
            this.totalFound = totalFound;
        }

        public int getSuccessful() {
            return successful;
        }

        public void incrementSuccessful() {
            this.successful++;
        }

        public int getFailed() {
            return failed;
        }

        public void incrementFailed() {
            this.failed++;
        }

        public String getFatalError() {
            return fatalError;
        }

        public void setFatalError(String fatalError) {
            this.fatalError = fatalError;
        }

        public List<String> getErrors() {
            return errors;
        }

        public void addError(String error) {
            this.errors.add(error);
        }

        public boolean isSuccess() {
            return fatalError == null && failed == 0;
        }
    }
}

