package com.connectflow.service;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class ImageUploadService {

    private final Cloudinary cloudinary;

    /**
     * Upload a single image file to Cloudinary.
     *
     * @param file          the image file
     * @param transactionId folder name inside "pawn-transactions/" on Cloudinary
     * @return the secure Cloudinary URL
     */
    @SuppressWarnings("unchecked")
    public String uploadImage(MultipartFile file, String transactionId) throws IOException {
        if (file.isEmpty()) {
            throw new IllegalArgumentException("File is empty");
        }

        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            throw new IllegalArgumentException("File must be an image");
        }

        String folder = "pawn-transactions/" + (transactionId != null && !transactionId.isBlank()
                ? transactionId : "pending");

        Map<?, ?> uploadResult = cloudinary.uploader().upload(
                file.getBytes(),
                ObjectUtils.asMap(
                        "folder", folder,
                        "resource_type", "image"
                )
        );

        String url = (String) uploadResult.get("secure_url");
        log.info("✅ Uploaded image to Cloudinary: {}", url);
        return url;
    }

    /**
     * Upload a Base64-encoded image to Cloudinary.
     * Fails fast if Base64 is invalid or upload fails.
     *
     * @param base64Data    Base64 encoded image (with or without "data:image/...;base64," prefix)
     * @param transactionId folder name inside "pawn-transactions/" on Cloudinary
     * @return the secure Cloudinary URL
     * @throws IllegalArgumentException if Base64 is invalid or not an image
     * @throws RuntimeException if Cloudinary upload fails
     */
    @SuppressWarnings("unchecked")
    public String uploadBase64Image(String base64Data, String transactionId) {
        if (base64Data == null || base64Data.isBlank()) {
            throw new IllegalArgumentException("Base64 image data is empty");
        }

        // Strip data URI prefix if present
        String cleanBase64 = base64Data;
        if (base64Data.startsWith("data:")) {
            int commaIdx = base64Data.indexOf(',');
            if (commaIdx == -1) {
                throw new IllegalArgumentException("Invalid Base64 data URI format");
            }
            String mimeAndEncoding = base64Data.substring(5, commaIdx); // "image/png;base64"
            cleanBase64 = base64Data.substring(commaIdx + 1);

            if (!mimeAndEncoding.contains("image/")) {
                throw new IllegalArgumentException("MIME type is not an image: " + mimeAndEncoding);
            }
        }

        // Decode Base64
        byte[] imageBytes;
        try {
            imageBytes = Base64.getDecoder().decode(cleanBase64);
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Invalid Base64 encoding: " + e.getMessage());
        }

        if (imageBytes.length == 0) {
            throw new IllegalArgumentException("Decoded image data is empty");
        }

        // Validate it's an image by checking magic bytes
        if (!isValidImageMagic(imageBytes)) {
            throw new IllegalArgumentException("Decoded data is not a valid image");
        }

        String folder = "pawn-transactions/" + (transactionId != null && !transactionId.isBlank()
                ? transactionId : "pending");

        // Upload to Cloudinary - fail fast if upload fails
        try {
            Map<?, ?> uploadResult = cloudinary.uploader().upload(
                    imageBytes,
                    ObjectUtils.asMap(
                            "folder", folder,
                            "resource_type", "image"
                    )
            );

            String url = (String) uploadResult.get("secure_url");
            if (url == null || url.isBlank()) {
                throw new RuntimeException("Cloudinary did not return a URL");
            }

            log.info("✅ Uploaded Base64 image to Cloudinary: {}", url);
            return url;
        } catch (Exception e) {
            log.error("❌ Failed to upload Base64 image to Cloudinary: {}", e.getMessage(), e);
            throw new RuntimeException("Cloudinary upload failed: " + e.getMessage(), e);
        }
    }

    /**
     * Check if byte array has valid image magic bytes.
     */
    private boolean isValidImageMagic(byte[] data) {
        if (data.length < 4) return false;

        // Check common image magic numbers
        // JPEG: FF D8 FF
        if (data[0] == (byte) 0xFF && data[1] == (byte) 0xD8 && data[2] == (byte) 0xFF) {
            return true;
        }
        // PNG: 89 50 4E 47
        if (data[0] == (byte) 0x89 && data[1] == (byte) 0x50 && data[2] == (byte) 0x4E && data[3] == (byte) 0x47) {
            return true;
        }
        // GIF: 47 49 46
        if (data[0] == (byte) 0x47 && data[1] == (byte) 0x49 && data[2] == (byte) 0x46) {
            return true;
        }
        // WebP: RIFF ... WEBP
        if (data[0] == (byte) 0x52 && data[1] == (byte) 0x49 && data[2] == (byte) 0x46 && data[3] == (byte) 0x46) {
            if (data.length >= 12 && data[8] == (byte) 0x57 && data[9] == (byte) 0x45 && data[10] == (byte) 0x42 && data[11] == (byte) 0x50) {
                return true;
            }
        }
        // BMP: 42 4D
        return data[0] == (byte) 0x42 && data[1] == (byte) 0x4D;
    }

    /**
     * Upload multiple image files to Cloudinary.
     */
    public List<String> uploadImages(List<MultipartFile> files, String transactionId) throws IOException {
        List<String> uploadedUrls = new ArrayList<>();
        for (MultipartFile file : files) {
            String url = uploadImage(file, transactionId);
            uploadedUrls.add(url);
        }
        return uploadedUrls;
    }

    /**
     * Delete an image from Cloudinary by its URL.
     * Falls back to a no-op for old local-path URLs.
     */
    @SuppressWarnings("unchecked")
    public void deleteImage(String imageUrl) {
        if (imageUrl == null || imageUrl.isBlank()) {
            return;
        }

        // Old local path – nothing to delete from Cloudinary
        if (!imageUrl.contains("cloudinary.com")) {
            log.warn("Skipping delete for non-Cloudinary URL: {}", imageUrl);
            return;
        }

        try {
            String publicId = extractPublicId(imageUrl);
            cloudinary.uploader().destroy(publicId, ObjectUtils.emptyMap());
            log.info("✅ Deleted image from Cloudinary: {}", publicId);
        } catch (Exception e) {
            log.error("Failed to delete image from Cloudinary: {}", imageUrl, e);
        }
    }

    /**
     * Check if a URL is a Cloudinary URL.
     */
    public boolean isCloudinaryUrl(String url) {
        return url != null && url.contains("cloudinary.com");
    }

    /**
     * Extract the Cloudinary public_id from a secure URL.
     * Example URL: https://res.cloudinary.com/cloud/image/upload/v123/pawn-transactions/txId/filename.jpg
     * → public_id: pawn-transactions/txId/filename
     */
    public String extractPublicId(String url) {
        // Everything after "/upload/" (strip version segment if present)
        int uploadIdx = url.indexOf("/upload/");
        if (uploadIdx == -1) return url;

        String path = url.substring(uploadIdx + 8); // skip "/upload/"
        // Remove version prefix "v1234567890/"
        if (path.matches("v\\d+/.*")) {
            path = path.substring(path.indexOf('/') + 1);
        }
        // Remove file extension
        int dotIdx = path.lastIndexOf('.');
        return dotIdx > 0 ? path.substring(0, dotIdx) : path;
    }

    /** For backward-compatibility with the test endpoint. */
    public String getUploadDir() {
        return "cloudinary";
    }
}
