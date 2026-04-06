package com.connectflow.controller;

import com.connectflow.service.ImageUploadService;
import com.connectflow.service.ImageMigrationService;
import com.connectflow.service.ImageMigrationService.MigrationResult;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/images")
@RequiredArgsConstructor
@Tag(name = "Images", description = "Image Upload APIs")
public class ImageUploadController {

    private final ImageUploadService imageUploadService;
    private final ImageMigrationService imageMigrationService;

    @PostMapping("/upload")
    @Operation(summary = "Upload single image")
    public ResponseEntity<Map<String, Object>> uploadImage(
            @RequestParam("file") MultipartFile file,
            @RequestParam("transactionId") String transactionId) {
        try {
            log.info("Uploading image for transaction: {}", transactionId);

            String imageUrl = imageUploadService.uploadImage(file, transactionId);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("url", imageUrl);
            response.put("filename", file.getOriginalFilename());
            response.put("size", file.getSize());

            return ResponseEntity.ok(response);
        } catch (IOException e) {
            log.error("Failed to upload image", e);
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        } catch (IllegalArgumentException e) {
            log.warn("Invalid image upload: {}", e.getMessage());
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
        }
    }

    @PostMapping("/upload-multiple")
    @Operation(summary = "Upload multiple images")
    public ResponseEntity<Map<String, Object>> uploadMultipleImages(
            @RequestParam("files") List<MultipartFile> files,
            @RequestParam("transactionId") String transactionId) {
        try {
            log.info("Uploading {} images for transaction: {}", files.size(), transactionId);

            List<String> imageUrls = imageUploadService.uploadImages(files, transactionId);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("urls", imageUrls);
            response.put("count", imageUrls.size());

            return ResponseEntity.ok(response);
        } catch (IOException e) {
            log.error("Failed to upload images", e);
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        } catch (IllegalArgumentException e) {
            log.warn("Invalid image upload: {}", e.getMessage());
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
        }
    }

    @DeleteMapping("/delete")
    @Operation(summary = "Delete an image")
    public ResponseEntity<Map<String, String>> deleteImage(@RequestParam("url") String imageUrl) {
        try {
            log.info("Deleting image: {}", imageUrl);
            imageUploadService.deleteImage(imageUrl);

            Map<String, String> response = new HashMap<>();
            response.put("success", "true");
            response.put("message", "Image deleted successfully");

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Failed to delete image", e);
            Map<String, String> error = new HashMap<>();
            error.put("success", "false");
            error.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }

    @GetMapping("/test")
    @Operation(summary = "Test image upload service")
    public ResponseEntity<Map<String, String>> testUpload() {
        Map<String, String> response = new HashMap<>();
        response.put("status", "ok");
        response.put("uploadDir", imageUploadService.getUploadDir());
        return ResponseEntity.ok(response);
    }

    @PostMapping("/migrate-base64")
    @Operation(summary = "Migrate existing Base64 images to Cloudinary (admin only)")
    public ResponseEntity<Map<String, Object>> migrateBase64Images() {
        try {
            log.info("Starting Base64 to Cloudinary migration...");

            MigrationResult result = imageMigrationService.migrateAllBase64Images();

            Map<String, Object> response = new HashMap<>();
            response.put("status", result.isSuccess() ? "success" : "partial");
            response.put("totalFound", result.getTotalFound());
            response.put("successful", result.getSuccessful());
            response.put("failed", result.getFailed());
            if (!result.getErrors().isEmpty()) {
                response.put("errors", result.getErrors());
            }
            if (result.getFatalError() != null) {
                response.put("fatalError", result.getFatalError());
            }

            return result.isSuccess() ? ResponseEntity.ok(response) : ResponseEntity.status(HttpStatus.PARTIAL_CONTENT).body(response);

        } catch (Exception e) {
            log.error("Migration failed", e);
            Map<String, Object> error = new HashMap<>();
            error.put("status", "error");
            error.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }
}
