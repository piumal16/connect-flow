# Logging Module Implementation Guide

## Overview

This guide provides a comprehensive approach to implementing a centralized logging module for the Connect Flow microservices architecture. The module supports log storage, backup/archiving, and viewing capabilities across all 11 microservices.

---

## Project Structure

```
backend/src/main/java/com/connectflow/
├── logging/
│   ├── config/
│   │   └── LoggingConfiguration.java
│   ├── service/
│   │   ├── LogService.java
│   │   ├── LogArchiveService.java
│   │   └── LogCleanupService.java
│   ├── controller/
│   │   └── LogController.java
│   ├── dto/
│   │   ├── LogRequest.java
│   │   ├── LogResponse.java
│   │   └── LogStatsResponse.java
│   ├── util/
│   │   ├── LogFileManager.java
│   │   └── LogPathResolver.java
│   └── exception/
│       └── LoggingException.java
```

---

## Directory Structure

Logs will be organized as follows:

```
bnk/
├── service-broker/
│   ├── 2026-05-21.log
│   ├── 2026-05-20.log
│   └── application.log
├── admin-service/
│   ├── 2026-05-21.log
│   └── application.log
├── qr-service/
├── ntf-service/
├── api-gateway/
├── app-registry-eureka/
├── iwallet-backoffice/
├── auth-server/
├── uga-service/
├── iswitches-admin/
├── api-wallet/
└── archive/
    ├── service-broker/
    │   ├── 2026-05-21-service-broker.zip
    │   └── 2026-05-20-service-broker.zip
    ├── admin-service/
    │   └── 2026-05-21-admin-service.zip
    └── ... (other modules)
```

---

## Implementation Steps

### Step 1: Add Dependencies to `pom.xml`

Add the following dependencies to your `pom.xml` file (already present in your project):

```xml
<!-- Already included -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-web</artifactId>
</dependency>

<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-aop</artifactId>
</dependency>

<!-- Add these for logging -->
<dependency>
    <groupId>ch.qos.logback</groupId>
    <artifactId>logback-classic</artifactId>
</dependency>

<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-logging</artifactId>
</dependency>

<!-- For file compression (archiving) -->
<dependency>
    <groupId>org.apache.commons</groupId>
    <artifactId>commons-compress</artifactId>
    <version>1.24.0</version>
</dependency>

<!-- Lombok (already in your project) -->
<dependency>
    <groupId>org.projectlombok</groupId>
    <artifactId>lombok</artifactId>
    <optional>true</optional>
</dependency>
```

### Step 2: Create Exception Class

**File:** `LoggingException.java`

```java
package com.connectflow.logging.exception;

public class LoggingException extends RuntimeException {
    public LoggingException(String message) {
        super(message);
    }

    public LoggingException(String message, Throwable cause) {
        super(message, cause);
    }
}
```

### Step 3: Create Configuration Classes

#### LoggingConfiguration.java

```java
package com.connectflow.logging.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;
import lombok.Getter;
import lombok.Setter;

@Component
@ConfigurationProperties(prefix = "app.logging")
@Getter
@Setter
public class LoggingConfiguration {
    private String basePath = "bnk";
    private String archivePath = "bnk/archive";
    private long maxFileSize = 10 * 1024 * 1024; // 10MB default
    private int retentionDays = 30;
    private String moduleName;
    private boolean compressionEnabled = true;
}
```

### Step 4: Create Utility Classes

#### LogPathResolver.java

```java
package com.connectflow.logging.util;

import java.io.File;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import org.springframework.stereotype.Component;
import com.connectflow.logging.config.LoggingConfiguration;

@Component
public class LogPathResolver {
    private final LoggingConfiguration config;
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd");

    public LogPathResolver(LoggingConfiguration config) {
        this.config = config;
    }

    /**
     * Get the directory path for a specific module
     */
    public String getModuleLogPath(String moduleName) {
        return config.getBasePath() + File.separator + moduleName;
    }

    /**
     * Get the archive directory path for a specific module
     */
    public String getModuleArchivePath(String moduleName) {
        return config.getArchivePath() + File.separator + moduleName;
    }

    /**
     * Get the current log file path with today's date
     */
    public String getCurrentLogFilePath(String moduleName) {
        String logDir = getModuleLogPath(moduleName);
        String dateStr = LocalDate.now().format(DATE_FORMATTER);
        return logDir + File.separator + dateStr + ".log";
    }

    /**
     * Get archive file name for a specific date
     */
    public String getArchiveFileName(String moduleName, LocalDate date) {
        String dateStr = date.format(DATE_FORMATTER);
        return dateStr + "-" + moduleName + ".zip";
    }

    /**
     * Create necessary directories
     */
    public void ensureDirectoriesExist(String moduleName) {
        createDirectoryIfNotExists(getModuleLogPath(moduleName));
        createDirectoryIfNotExists(getModuleArchivePath(moduleName));
    }

    private void createDirectoryIfNotExists(String path) {
        File dir = new File(path);
        if (!dir.exists()) {
            dir.mkdirs();
        }
    }
}
```

#### LogFileManager.java

```java
package com.connectflow.logging.util;

import java.io.*;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.*;
import org.apache.commons.compress.archivers.zip.ZipArchiveEntry;
import org.apache.commons.compress.archivers.zip.ZipArchiveOutputStream;
import org.springframework.stereotype.Component;
import com.connectflow.logging.exception.LoggingException;

@Component
public class LogFileManager {

    /**
     * Write log entry to file
     */
    public synchronized void writeLog(String filePath, String logEntry) {
        try {
            new File(filePath).getParentFile().mkdirs();
            try (FileWriter fw = new FileWriter(filePath, true);
                 BufferedWriter bw = new BufferedWriter(fw)) {
                bw.write(logEntry);
                bw.newLine();
            }
        } catch (IOException e) {
            throw new LoggingException("Failed to write log: " + e.getMessage(), e);
        }
    }

    /**
     * Read log file with optional limit
     */
    public String readLog(String filePath, int limit) {
        try {
            List<String> lines = Files.readAllLines(Paths.get(filePath));
            
            if (limit > 0 && lines.size() > limit) {
                lines = lines.subList(lines.size() - limit, lines.size());
            }
            
            return String.join("\n", lines);
        } catch (IOException e) {
            throw new LoggingException("Failed to read log: " + e.getMessage(), e);
        }
    }

    /**
     * List all log files in a directory
     */
    public List<String> listLogFiles(String directoryPath) {
        File dir = new File(directoryPath);
        List<String> files = new ArrayList<>();
        
        if (dir.exists() && dir.isDirectory()) {
            File[] logFiles = dir.listFiles((d, name) -> name.endsWith(".log"));
            if (logFiles != null) {
                for (File file : logFiles) {
                    files.add(file.getName());
                }
            }
        }
        return files;
    }

    /**
     * Archive log file to ZIP
     */
    public void archiveLog(String sourceFilePath, String archiveFilePath) {
        try {
            File archiveDir = new File(archiveFilePath).getParentFile();
            archiveDir.mkdirs();

            try (ZipArchiveOutputStream zaos = new ZipArchiveOutputStream(
                    new FileOutputStream(archiveFilePath))) {
                
                File sourceFile = new File(sourceFilePath);
                if (sourceFile.exists()) {
                    ZipArchiveEntry entry = new ZipArchiveEntry(sourceFile.getName());
                    zaos.putArchiveEntry(entry);
                    
                    Files.copy(Paths.get(sourceFilePath), zaos);
                    zaos.closeArchiveEntry();
                }
            }
        } catch (IOException e) {
            throw new LoggingException("Failed to archive log: " + e.getMessage(), e);
        }
    }

    /**
     * Delete file
     */
    public void deleteFile(String filePath) {
        try {
            Files.deleteIfExists(Paths.get(filePath));
        } catch (IOException e) {
            throw new LoggingException("Failed to delete file: " + e.getMessage(), e);
        }
    }

    /**
     * Get file size in bytes
     */
    public long getFileSize(String filePath) {
        try {
            return Files.size(Paths.get(filePath));
        } catch (IOException e) {
            return 0;
        }
    }

    /**
     * Search for keyword in log file
     */
    public List<String> searchInLog(String filePath, String keyword) {
        List<String> results = new ArrayList<>();
        try {
            List<String> lines = Files.readAllLines(Paths.get(filePath));
            for (String line : lines) {
                if (line.toLowerCase().contains(keyword.toLowerCase())) {
                    results.add(line);
                }
            }
        } catch (IOException e) {
            throw new LoggingException("Failed to search in log: " + e.getMessage(), e);
        }
        return results;
    }
}
```

### Step 5: Create DTOs

#### LogRequest.java

```java
package com.connectflow.logging.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class LogRequest {
    private String level; // INFO, WARN, ERROR, DEBUG
    private String message;
    private String details;
}
```

#### LogResponse.java

```java
package com.connectflow.logging.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;
import java.util.List;

@Getter
@Setter
@AllArgsConstructor
public class LogResponse {
    private String moduleName;
    private String timestamp;
    private String content;
    private int lineCount;
}
```

#### LogStatsResponse.java

```java
package com.connectflow.logging.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;
import java.util.List;

@Getter
@Setter
@AllArgsConstructor
public class LogStatsResponse {
    private String moduleName;
    private long currentLogSizeBytes;
    private long totalArchivedSizeBytes;
    private int currentLogFiles;
    private int archivedLogFiles;
    private List<String> currentFiles;
    private List<String> archivedFiles;
}
```

### Step 6: Create Service Classes

#### LogService.java

```java
package com.connectflow.logging.service;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import org.springframework.stereotype.Service;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import com.connectflow.logging.config.LoggingConfiguration;
import com.connectflow.logging.dto.LogRequest;
import com.connectflow.logging.util.LogFileManager;
import com.connectflow.logging.util.LogPathResolver;

@Service
public class LogService {
    private static final Logger logger = LoggerFactory.getLogger(LogService.class);
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd");

    private final LogPathResolver pathResolver;
    private final LogFileManager fileManager;
    private final LoggingConfiguration config;

    public LogService(LogPathResolver pathResolver, LogFileManager fileManager, 
                     LoggingConfiguration config) {
        this.pathResolver = pathResolver;
        this.fileManager = fileManager;
        this.config = config;
    }

    /**
     * Write a log entry to the module's log file
     */
    public void writeLog(String moduleName, LogRequest logRequest) {
        pathResolver.ensureDirectoriesExist(moduleName);
        
        String timestamp = java.time.LocalDateTime.now().toString();
        String logEntry = String.format("[%s] [%s] %s - %s", 
            timestamp, logRequest.getLevel(), logRequest.getMessage(), 
            logRequest.getDetails() != null ? logRequest.getDetails() : "");
        
        String logFilePath = pathResolver.getCurrentLogFilePath(moduleName);
        fileManager.writeLog(logFilePath, logEntry);
        
        // Check if rotation is needed
        if (fileManager.getFileSize(logFilePath) > config.getMaxFileSize()) {
            rotateLog(moduleName, logFilePath);
        }
    }

    /**
     * Rotate log file when size exceeds limit
     */
    private void rotateLog(String moduleName, String logFilePath) {
        try {
            String archivePath = pathResolver.getModuleArchivePath(moduleName);
            String archiveFileName = pathResolver.getArchiveFileName(moduleName, LocalDate.now());
            fileManager.archiveLog(logFilePath, archivePath + "/" + archiveFileName);
            
            // Clear current log file
            fileManager.deleteFile(logFilePath);
            logger.info("Log rotated for module: {}", moduleName);
        } catch (Exception e) {
            logger.error("Error rotating log for module: {}", moduleName, e);
        }
    }

    /**
     * Read current log file for a module
     */
    public String readCurrentLog(String moduleName, int limit) {
        pathResolver.ensureDirectoriesExist(moduleName);
        String logFilePath = pathResolver.getCurrentLogFilePath(moduleName);
        return fileManager.readLog(logFilePath, limit);
    }

    /**
     * List all archived logs for a module
     */
    public List<String> listArchivedLogs(String moduleName) {
        String archivePath = pathResolver.getModuleArchivePath(moduleName);
        return fileManager.listLogFiles(archivePath);
    }

    /**
     * Search logs by keyword
     */
    public List<String> searchLogs(String moduleName, String keyword) {
        String logFilePath = pathResolver.getCurrentLogFilePath(moduleName);
        return fileManager.searchInLog(logFilePath, keyword);
    }
}
```

#### LogArchiveService.java

```java
package com.connectflow.logging.service;

import org.springframework.stereotype.Service;
import org.springframework.scheduling.annotation.Scheduled;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import com.connectflow.logging.util.LogFileManager;
import com.connectflow.logging.util.LogPathResolver;
import com.connectflow.logging.config.LoggingConfiguration;
import java.io.File;
import java.time.LocalDate;

@Service
public class LogArchiveService {
    private static final Logger logger = LoggerFactory.getLogger(LogArchiveService.class);

    private final LogFileManager fileManager;
    private final LogPathResolver pathResolver;
    private final LoggingConfiguration config;

    public LogArchiveService(LogFileManager fileManager, LogPathResolver pathResolver,
                            LoggingConfiguration config) {
        this.fileManager = fileManager;
        this.pathResolver = pathResolver;
        this.config = config;
    }

    /**
     * Archive log file for a specific module
     */
    public void archiveModuleLog(String moduleName, String logFileName) {
        String sourceFilePath = pathResolver.getModuleLogPath(moduleName) + "/" + logFileName;
        String archiveFileName = logFileName.replace(".log", "") + "-" + moduleName + ".zip";
        String archiveFilePath = pathResolver.getModuleArchivePath(moduleName) + "/" + archiveFileName;
        
        try {
            fileManager.archiveLog(sourceFilePath, archiveFilePath);
            logger.info("Archived log file: {} for module: {}", logFileName, moduleName);
        } catch (Exception e) {
            logger.error("Error archiving log for module: {}", moduleName, e);
        }
    }

    /**
     * Scheduled task to archive old logs (runs daily at 2 AM)
     */
    @Scheduled(cron = "0 0 2 * * ?")
    public void archiveOldLogs() {
        logger.info("Starting scheduled log archival task");
        
        // Get all modules from base path
        File baseDir = new File(config.getBasePath());
        if (baseDir.exists() && baseDir.isDirectory()) {
            File[] modules = baseDir.listFiles(File::isDirectory);
            if (modules != null) {
                for (File moduleDir : modules) {
                    String moduleName = moduleDir.getName();
                    if (!moduleName.equals("archive")) {
                        archiveModuleLogs(moduleName);
                    }
                }
            }
        }
    }

    /**
     * Archive all logs in a module
     */
    private void archiveModuleLogs(String moduleName) {
        String logPath = pathResolver.getModuleLogPath(moduleName);
        File logDir = new File(logPath);
        
        if (logDir.exists()) {
            File[] logFiles = logDir.listFiles((d, name) -> name.endsWith(".log"));
            if (logFiles != null) {
                for (File logFile : logFiles) {
                    archiveModuleLog(moduleName, logFile.getName());
                }
            }
        }
    }
}
```

#### LogCleanupService.java

```java
package com.connectflow.logging.service;

import org.springframework.stereotype.Service;
import org.springframework.scheduling.annotation.Scheduled;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import com.connectflow.logging.util.LogFileManager;
import com.connectflow.logging.util.LogPathResolver;
import com.connectflow.logging.config.LoggingConfiguration;
import java.io.File;
import java.nio.file.Files;
import java.nio.file.attribute.FileTime;
import java.time.Instant;
import java.time.temporal.ChronoUnit;

@Service
public class LogCleanupService {
    private static final Logger logger = LoggerFactory.getLogger(LogCleanupService.class);

    private final LogFileManager fileManager;
    private final LogPathResolver pathResolver;
    private final LoggingConfiguration config;

    public LogCleanupService(LogFileManager fileManager, LogPathResolver pathResolver,
                            LoggingConfiguration config) {
        this.fileManager = fileManager;
        this.pathResolver = pathResolver;
        this.config = config;
    }

    /**
     * Scheduled task to cleanup old archived logs (runs weekly on Sunday at 3 AM)
     */
    @Scheduled(cron = "0 0 3 ? * SUN")
    public void cleanupOldLogs() {
        logger.info("Starting scheduled log cleanup task");
        
        File archiveDir = new File(config.getArchivePath());
        if (archiveDir.exists() && archiveDir.isDirectory()) {
            File[] modules = archiveDir.listFiles(File::isDirectory);
            if (modules != null) {
                for (File moduleDir : modules) {
                    cleanupModuleArchives(moduleDir.getName());
                }
            }
        }
    }

    /**
     * Clean up archived logs older than retention days
     */
    private void cleanupModuleArchives(String moduleName) {
        String archivePath = pathResolver.getModuleArchivePath(moduleName);
        File archiveDir = new File(archivePath);
        
        if (archiveDir.exists()) {
            File[] zipFiles = archiveDir.listFiles((d, name) -> name.endsWith(".zip"));
            if (zipFiles != null) {
                Instant cutoffTime = Instant.now().minus(config.getRetentionDays(), ChronoUnit.DAYS);
                
                for (File zipFile : zipFiles) {
                    try {
                        FileTime fileTime = Files.getLastModifiedTime(zipFile.toPath());
                        if (fileTime.toInstant().isBefore(cutoffTime)) {
                            fileManager.deleteFile(zipFile.getAbsolutePath());
                            logger.info("Deleted old archive: {}", zipFile.getName());
                        }
                    } catch (Exception e) {
                        logger.error("Error processing archive file: {}", zipFile.getName(), e);
                    }
                }
            }
        }
    }

    /**
     * Manual cleanup of old logs for a specific module
     */
    public void cleanupModuleLogs(String moduleName) {
        cleanupModuleArchives(moduleName);
        logger.info("Completed cleanup for module: {}", moduleName);
    }
}
```

### Step 7: Create Controller

#### LogController.java

```java
package com.connectflow.logging.controller;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.connectflow.logging.dto.LogRequest;
import com.connectflow.logging.dto.LogResponse;
import com.connectflow.logging.dto.LogStatsResponse;
import com.connectflow.logging.service.LogService;
import com.connectflow.logging.service.LogArchiveService;
import com.connectflow.logging.service.LogCleanupService;
import com.connectflow.logging.util.LogFileManager;
import com.connectflow.logging.util.LogPathResolver;

@RestController
@RequestMapping("/api/logs")
@CrossOrigin(origins = "*")
public class LogController {

    private final LogService logService;
    private final LogArchiveService archiveService;
    private final LogCleanupService cleanupService;
    private final LogPathResolver pathResolver;
    private final LogFileManager fileManager;

    public LogController(LogService logService, LogArchiveService archiveService,
                        LogCleanupService cleanupService, LogPathResolver pathResolver,
                        LogFileManager fileManager) {
        this.logService = logService;
        this.archiveService = archiveService;
        this.cleanupService = cleanupService;
        this.pathResolver = pathResolver;
        this.fileManager = fileManager;
    }

    /**
     * Write a log entry
     */
    @PostMapping("/{moduleName}")
    public ResponseEntity<?> writeLog(@PathVariable String moduleName, 
                                      @RequestBody LogRequest logRequest) {
        logService.writeLog(moduleName, logRequest);
        return ResponseEntity.ok(Map.of("message", "Log entry written successfully"));
    }

    /**
     * Read current logs for a module
     */
    @GetMapping("/{moduleName}")
    public ResponseEntity<LogResponse> readCurrentLogs(@PathVariable String moduleName,
                                                       @RequestParam(defaultValue = "100") int limit) {
        String content = logService.readCurrentLog(moduleName, limit);
        LogResponse response = new LogResponse(moduleName, 
            java.time.LocalDateTime.now().toString(), 
            content, 
            content.split("\n").length);
        return ResponseEntity.ok(response);
    }

    /**
     * List archived logs for a module
     */
    @GetMapping("/{moduleName}/archived")
    public ResponseEntity<?> listArchivedLogs(@PathVariable String moduleName) {
        List<String> archivedLogs = logService.listArchivedLogs(moduleName);
        return ResponseEntity.ok(Map.of("moduleName", moduleName, "archivedLogs", archivedLogs));
    }

    /**
     * Search logs by keyword
     */
    @GetMapping("/{moduleName}/search")
    public ResponseEntity<?> searchLogs(@PathVariable String moduleName,
                                       @RequestParam String keyword) {
        List<String> results = logService.searchLogs(moduleName, keyword);
        return ResponseEntity.ok(Map.of(
            "moduleName", moduleName,
            "keyword", keyword,
            "results", results,
            "count", results.size()
        ));
    }

    /**
     * Get log statistics for a module
     */
    @GetMapping("/{moduleName}/stats")
    public ResponseEntity<LogStatsResponse> getLogStats(@PathVariable String moduleName) {
        String logPath = pathResolver.getModuleLogPath(moduleName);
        String archivePath = pathResolver.getModuleArchivePath(moduleName);
        
        List<String> currentFiles = fileManager.listLogFiles(logPath);
        List<String> archivedFiles = fileManager.listLogFiles(archivePath);
        
        long currentSize = currentFiles.stream()
            .mapToLong(f -> fileManager.getFileSize(logPath + "/" + f))
            .sum();
        
        long archivedSize = archivedFiles.stream()
            .mapToLong(f -> fileManager.getFileSize(archivePath + "/" + f))
            .sum();
        
        LogStatsResponse stats = new LogStatsResponse(moduleName, currentSize, archivedSize,
            currentFiles.size(), archivedFiles.size(), currentFiles, archivedFiles);
        
        return ResponseEntity.ok(stats);
    }

    /**
     * Archive current logs
     */
    @PostMapping("/{moduleName}/archive")
    public ResponseEntity<?> archiveCurrentLogs(@PathVariable String moduleName) {
        archiveService.archiveModuleLogs(moduleName);
        return ResponseEntity.ok(Map.of("message", "Logs archived successfully"));
    }

    /**
     * Cleanup old logs
     */
    @PostMapping("/{moduleName}/cleanup")
    public ResponseEntity<?> cleanupLogs(@PathVariable String moduleName) {
        cleanupService.cleanupModuleLogs(moduleName);
        return ResponseEntity.ok(Map.of("message", "Old logs cleaned up successfully"));
    }

    /**
     * Health check for logging service
     */
    @GetMapping("/health")
    public ResponseEntity<?> healthCheck() {
        return ResponseEntity.ok(Map.of("status", "Logging service is healthy"));
    }
}
```

### Step 8: Add Configuration to `application.properties`

Add the following to your `application.properties`:

```properties
# Logging Configuration
app.logging.base-path=bnk
app.logging.archive-path=bnk/archive
app.logging.max-file-size=10485760
app.logging.retention-days=30
app.logging.compression-enabled=true
app.logging.module-name=your-service-name

# Spring Logging
logging.level.root=INFO
logging.level.com.connectflow=DEBUG
logging.pattern.console=%d{HH:mm:ss.SSS} [%thread] %-5level %logger{36} - %msg%n
```

### Step 9: Enable Scheduling

Add `@EnableScheduling` to your main application class:

```java
package com.connectflow;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class ConnectFlowApplication {
    public static void main(String[] args) {
        SpringApplication.run(ConnectFlowApplication.class, args);
    }
}
```

---

## Usage Examples

### 1. Write a Log Entry (via API)

```bash
curl -X POST http://localhost:8080/api/logs/admin-service \
  -H "Content-Type: application/json" \
  -d '{
    "level": "INFO",
    "message": "User login attempt",
    "details": "User ID: usr_123, Status: Success"
  }'
```

### 2. Read Current Logs

```bash
curl "http://localhost:8080/api/logs/admin-service?limit=50"
```

### 3. Search Logs

```bash
curl "http://localhost:8080/api/logs/admin-service/search?keyword=error"
```

### 4. Get Log Statistics

```bash
curl "http://localhost:8080/api/logs/admin-service/stats"
```

### 5. Archive Logs

```bash
curl -X POST http://localhost:8080/api/logs/admin-service/archive
```

### 6. Cleanup Old Logs

```bash
curl -X POST http://localhost:8080/api/logs/admin-service/cleanup
```

### 7. Programmatic Usage in Services

```java
@Service
public class UserService {
    private final LogService logService;
    
    public UserService(LogService logService) {
        this.logService = logService;
    }
    
    public void createUser(User user) {
        LogRequest logRequest = new LogRequest();
        logRequest.setLevel("INFO");
        logRequest.setMessage("User created");
        logRequest.setDetails("User ID: " + user.getId());
        
        logService.writeLog("admin-service", logRequest);
    }
}
```

---

## Scheduled Tasks

The logging module includes automatic scheduled tasks:

1. **Daily Log Archival** (2:00 AM)
   - Archives all logs older than current date
   - Compresses them into ZIP files

2. **Weekly Log Cleanup** (Sunday 3:00 AM)
   - Removes archived logs older than retention period (default: 30 days)
   - Helps manage disk space

---

## Directory Organization by Module

Each of your microservices can use this module:

- **service-broker** → `bnk/service-broker/`
- **admin-service** → `bnk/admin-service/`
- **qr-service** → `bnk/qr-service/`
- **ntf-service** → `bnk/ntf-service/`
- **api-gateway** → `bnk/api-gateway/`
- **app-registry-eureka** → `bnk/app-registry-eureka/`
- **iwallet-backoffice** → `bnk/iwallet-backoffice/`
- **auth-server** → `bnk/auth-server/`
- **uga-service** → `bnk/uga-service/`
- **iswitches-admin** → `bnk/iswitches-admin/`
- **api-wallet** → `bnk/api-wallet/`

---

## Best Practices

1. **Consistent Module Names**: Use the same service names across all logging calls
2. **Appropriate Log Levels**: Use INFO for important operations, DEBUG for detailed traces, WARN for warnings, ERROR for exceptions
3. **Contextual Information**: Always include relevant details in the "details" field
4. **Regular Cleanup**: The scheduler runs automatically, but you can trigger manual cleanup when needed
5. **Log Rotation**: Configure `max-file-size` based on your storage capacity
6. **Retention Policy**: Adjust `retention-days` based on compliance and storage requirements

---

## Exception Handling

The `LoggingException` is thrown for:
- File I/O errors
- Directory creation failures
- Compression/archiving errors
- Log search failures

Handle these exceptions appropriately in your services.

---

## Testing the Module

Use Postman or curl to test endpoints:

1. Write logs to a module
2. Retrieve logs with different limits
3. Search for specific keywords
4. Check statistics
5. Manually trigger archive/cleanup
6. Verify directory structure in `bnk/` folder

---

## Notes

- Ensure the application has write permissions to create the `bnk/` directory
- The module is thread-safe for concurrent log writes
- Log files are stored in plain text format before archiving
- Archives use ZIP compression for efficient storage
- Consider implementing log rotation policies based on your requirements
