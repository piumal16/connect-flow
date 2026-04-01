package com.connectflow.service;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.ArrayList;
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
     * Extract the Cloudinary public_id from a secure URL.
     * Example URL: https://res.cloudinary.com/cloud/image/upload/v123/pawn-transactions/txId/filename.jpg
     * → public_id: pawn-transactions/txId/filename
     */
    private String extractPublicId(String url) {
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
