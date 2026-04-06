package com.connectflow.controller;

import com.connectflow.dto.CreatePawnTransactionRequest;
import com.connectflow.dto.PageResponse;
import com.connectflow.dto.PawnTransactionDTO;
import com.connectflow.dto.SetProfitRequest;
import com.connectflow.dto.TransactionEditHistoryDTO;
import com.connectflow.dto.TransactionProfitDTO;
import com.connectflow.dto.UpdatePawnTransactionDetailsRequest;
import com.connectflow.dto.UserDTO;
import com.connectflow.service.PawnTransactionService;
import com.connectflow.service.TransactionProfitService;
import com.connectflow.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import com.connectflow.aop.ActivityLog;

import java.time.LocalDate;
import org.springframework.format.annotation.DateTimeFormat;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/pawn-transactions")
@RequiredArgsConstructor
@Tag(name = "Pawn Transactions", description = "Pawn Transaction Management APIs")
public class PawnTransactionController {

    private final PawnTransactionService pawnTransactionService;
    private final UserService userService;
    private final TransactionProfitService transactionProfitService;

    @GetMapping
    @Operation(summary = "Get all pawn transactions")
    public ResponseEntity<List<PawnTransactionDTO>> getAllTransactions() {
        log.info("GET /pawn-transactions - Fetching all transactions");
        List<PawnTransactionDTO> transactions = pawnTransactionService.getAllTransactions();
        return ResponseEntity.ok(transactions);
    }

    @GetMapping("/pattern-config")
    @Operation(summary = "Get special pattern configuration")
    public ResponseEntity<Map<String, String>> getPatternConfig() {
        log.info("GET /pawn-transactions/pattern-config");
        return ResponseEntity.ok(Map.of("pattern", "TND"));
    }

    @GetMapping("/paginated")
    @Operation(summary = "Get pawn transactions with pagination")
    public ResponseEntity<PageResponse<PawnTransactionDTO>> getTransactionsPaginated(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "pawnDate") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir) {
        log.info("GET /pawn-transactions/paginated - page: {}, size: {}", page, size);
        PageResponse<PawnTransactionDTO> response = pawnTransactionService.getAllTransactionsPaginated(page, size, sortBy, sortDir);
        return ResponseEntity.ok(response);
    }

//    @GetMapping("/pattern-config")
//    @Operation(summary = "Get special pattern configuration")
//    public ResponseEntity<Map<String, String>> getPatternConfig() {
//        log.info("GET /pawn-transactions/pattern-config");
//        return ResponseEntity.ok(Map.of("pattern", "TND"));
//    }

    @GetMapping("/{id}")
    @Operation(summary = "Get transaction by ID")
    public ResponseEntity<PawnTransactionDTO> getTransactionById(@PathVariable UUID id) {
        log.info("GET /pawn-transactions/{}", id);
        Optional<PawnTransactionDTO> transaction = pawnTransactionService.getTransactionById(id);
        return transaction.map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @GetMapping("/pawn-id/{pawnId}")
    @Operation(summary = "Get transaction by pawn ID")
    public ResponseEntity<PawnTransactionDTO> getTransactionByPawnId(@PathVariable String pawnId) {
        log.info("GET /pawn-transactions/pawn-id/{}", pawnId);
        Optional<PawnTransactionDTO> transaction = pawnTransactionService.getTransactionByPawnId(pawnId);
        return transaction.map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @GetMapping("/branch/{branchId}")
    @Operation(summary = "Get transactions by branch")
    public ResponseEntity<List<PawnTransactionDTO>> getTransactionsByBranch(@PathVariable UUID branchId) {
        log.info("GET /pawn-transactions/branch/{}", branchId);
        List<PawnTransactionDTO> transactions = pawnTransactionService.getTransactionsByBranch(branchId);
        return ResponseEntity.ok(transactions);
    }

    @GetMapping("/branch/{branchId}/paginated")
    @Operation(summary = "Get transactions by branch with pagination")
    public ResponseEntity<PageResponse<PawnTransactionDTO>> getTransactionsByBranchPaginated(
            @PathVariable UUID branchId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "pawnDate") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir) {
        log.info("GET /pawn-transactions/branch/{}/paginated", branchId);
        PageResponse<PawnTransactionDTO> response = pawnTransactionService.getTransactionsByBranchPaginated(
                branchId, page, size, sortBy, sortDir);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/status/{status}")
    @Operation(summary = "Get transactions by status")
    public ResponseEntity<PageResponse<PawnTransactionDTO>> getTransactionsByStatus(
            @PathVariable String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "pawnDate") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir) {
        log.info("GET /pawn-transactions/status/{}", status);
        PageResponse<PawnTransactionDTO> response = pawnTransactionService.getTransactionsByStatus(
                status, page, size, sortBy, sortDir);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/search")
    @Operation(summary = "Search transactions")
    public ResponseEntity<PageResponse<PawnTransactionDTO>> searchTransactions(
            @RequestParam String query,
            @RequestParam(required = false) UUID branchId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "pawnDate") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir) {
        log.info("GET /pawn-transactions/search - query: {}", query);
        PageResponse<PawnTransactionDTO> response = pawnTransactionService.searchTransactions(
                query, branchId, page, size, sortBy, sortDir);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/search/advanced")
    @Operation(summary = "Advanced search transactions with multiple filters")
    public ResponseEntity<PageResponse<PawnTransactionDTO>> searchTransactionsAdvanced(
            @RequestParam(required = false) String pawnId,
            @RequestParam(required = false) String customerNic,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Double minAmount,
            @RequestParam(required = false) Double maxAmount,
            @RequestParam(required = false) String patternMode,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) String filterBranchId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "pawnDate") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir) {
        log.info("GET /pawn-transactions/search/advanced - pawnId: {}, customerNic: {}, status: {}, startDate: {}, endDate: {}",
                 pawnId, customerNic, status, startDate, endDate);

        // Get authenticated user's branch if needed
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        UUID branchId = null;
        if (authentication != null && authentication.getPrincipal() != null) {
            String email = authentication.getPrincipal().toString();
            Optional<UserDTO> currentUser = userService.getUserByEmail(email);
            if (currentUser.isPresent()) {
                UserDTO user = currentUser.get();
                if (user.getRole() != com.connectflow.model.UserRole.Role.ADMIN
                        && user.getRole() != com.connectflow.model.UserRole.Role.SUPERADMIN) {
                    branchId = user.getBranchId();
                } else if (filterBranchId != null && !filterBranchId.isEmpty()) {
                    branchId = UUID.fromString(filterBranchId);
                }
            }
        }

        java.math.BigDecimal minAmountBD = minAmount != null ? java.math.BigDecimal.valueOf(minAmount) : null;
        java.math.BigDecimal maxAmountBD = maxAmount != null ? java.math.BigDecimal.valueOf(maxAmount) : null;

        PageResponse<PawnTransactionDTO> response = pawnTransactionService.searchTransactionsAdvanced(
                pawnId, customerNic, status, minAmountBD, maxAmountBD, patternMode, branchId,
                startDate, endDate,
                page, size, sortBy, sortDir);
        return ResponseEntity.ok(response);
    }

    @PostMapping
    @Operation(summary = "Create new pawn transaction")
    @ActivityLog(action = "CREATE_PAWN_TRANSACTION", description = "Created new pawn transaction")
    public ResponseEntity<PawnTransactionDTO> createTransaction(@RequestBody CreatePawnTransactionRequest request) {
        log.info("POST /pawn-transactions - Creating new transaction for customer: {}", request.getCustomerName());

        // Get authenticated user from SecurityContext
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || authentication.getPrincipal() == null) {
            log.error("No authentication found");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        String email = authentication.getPrincipal().toString();
        log.info("Authenticated user email: {}", email);

        // Get user details including branch_id
        Optional<UserDTO> currentUser = userService.getUserByEmail(email);
        if (currentUser.isEmpty()) {
            log.error("User not found for email: {}", email);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        UserDTO user = currentUser.get();
        if (user.getBranchId() == null) {
            log.error("User {} does not have a branch assigned", email);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }

        try {
            PawnTransactionDTO created = pawnTransactionService.createTransaction(
                    request, user.getBranchId(), user.getId());
            return ResponseEntity.status(HttpStatus.CREATED).body(created);
        } catch (IllegalArgumentException e) {
            log.error("Validation error: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        } catch (RuntimeException e) {
            // Catch image upload failures and other runtime errors
            if (e.getMessage() != null && e.getMessage().contains("Image upload failed")) {
                log.error("Image upload error during transaction creation: {}", e.getMessage(), e);
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(null); // Return error; client should parse error body or use exception handler
            } else if (e.getMessage() != null && e.getMessage().contains("Cloudinary")) {
                log.error("Cloudinary error during transaction creation: {}", e.getMessage(), e);
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
            }
            throw e;
        }
    }

    @PatchMapping("/{id}/status")
    @Operation(summary = "Update transaction status")
    @ActivityLog(action = "UPDATE_TRANSACTION_STATUS", description = "Updated pawn transaction status")
    public ResponseEntity<PawnTransactionDTO> updateTransactionStatus(
            @PathVariable UUID id,
            @RequestBody Map<String, String> body) {
        log.info("PATCH /pawn-transactions/{}/status", id);
        String status = body.get("status");
        if (status == null) {
            return ResponseEntity.badRequest().build();
        }

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || authentication.getPrincipal() == null) {
            log.error("No authentication found");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        String email = authentication.getPrincipal().toString();
        Optional<UserDTO> currentUser = userService.getUserByEmail(email);
        if (currentUser.isEmpty()) {
            log.error("User not found for email: {}", email);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        try {
            UserDTO user = currentUser.get();
            PawnTransactionDTO updated = pawnTransactionService.updateTransactionStatus(
                    id, status, user.getId(), user.getFullName());
            return ResponseEntity.ok(updated);
        } catch (RuntimeException e) {
            log.error("Error updating transaction status: {}", e.getMessage());
            return ResponseEntity.notFound().build();
        }
    }

    @PatchMapping("/{id}/remarks")
    @Operation(summary = "Update transaction remarks")
    @ActivityLog(action = "UPDATE_TRANSACTION_REMARKS", description = "Updated pawn transaction remarks")
    public ResponseEntity<PawnTransactionDTO> updateTransactionRemarks(
            @PathVariable UUID id,
            @RequestBody Map<String, String> body) {
        log.info("PATCH /pawn-transactions/{}/remarks", id);
        String remarks = body.get("remarks");

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || authentication.getPrincipal() == null) {
            log.error("No authentication found");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        String email = authentication.getPrincipal().toString();
        Optional<UserDTO> currentUser = userService.getUserByEmail(email);
        if (currentUser.isEmpty()) {
            log.error("User not found for email: {}", email);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        try {
            UserDTO user = currentUser.get();
            PawnTransactionDTO updated = pawnTransactionService.updateTransactionRemarks(
                    id, remarks, user.getId(), user.getFullName());
            return ResponseEntity.ok(updated);
        } catch (RuntimeException e) {
            log.error("Error updating transaction remarks: {}", e.getMessage());
            return ResponseEntity.notFound().build();
        }
    }

    @PatchMapping("/{id}/block-reason")
    @Operation(summary = "Update transaction block reason and add customer to blacklist with optional police report")
    @ActivityLog(action = "BLOCK_TRANSACTION", description = "Blocked pawn transaction with reason")
    public ResponseEntity<PawnTransactionDTO> updateBlockReason(
            @PathVariable UUID id,
            @RequestBody Map<String, Object> body) {
        log.info("PATCH /pawn-transactions/{}/block-reason", id);
        String blockReason = (String) body.get("blockReason");
        String policeReportNumber = (String) body.get("policeReportNumber");
        String policeReportDate = (String) body.get("policeReportDate");

        if (blockReason == null || blockReason.trim().isEmpty()) {
            log.error("Block reason is required");
            return ResponseEntity.badRequest().build();
        }

        // Get authenticated user from SecurityContext
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || authentication.getPrincipal() == null) {
            log.error("No authentication found");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        String email = authentication.getPrincipal().toString();
        log.info("Authenticated user email: {}", email);

        // Get user details including branch_id
        Optional<UserDTO> currentUser = userService.getUserByEmail(email);
        if (currentUser.isEmpty()) {
            log.error("User not found for email: {}", email);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        UserDTO user = currentUser.get();
        if (user.getBranchId() == null) {
            log.error("User {} does not have a branch assigned", email);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }

        try {
            PawnTransactionDTO updated = pawnTransactionService.updateBlockReason(
                    id, blockReason, policeReportNumber, policeReportDate, user.getBranchId(), user.getId(), user.getFullName());
            return ResponseEntity.ok(updated);
        } catch (RuntimeException e) {
            log.error("Error updating transaction block reason: {}", e.getMessage());
            return ResponseEntity.notFound().build();
        }
    }

    @PatchMapping("/{id}/details")
    @Operation(summary = "Update editable transaction details")
    @ActivityLog(action = "UPDATE_TRANSACTION_DETAILS", description = "Updated editable pawn transaction details")
    public ResponseEntity<PawnTransactionDTO> updateTransactionDetails(
            @PathVariable UUID id,
            @RequestBody UpdatePawnTransactionDetailsRequest request) {
        log.info("PATCH /pawn-transactions/{}/details", id);

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || authentication.getPrincipal() == null) {
            log.error("No authentication found");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        String email = authentication.getPrincipal().toString();
        Optional<UserDTO> currentUser = userService.getUserByEmail(email);
        if (currentUser.isEmpty()) {
            log.error("User not found for email: {}", email);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        try {
            UserDTO user = currentUser.get();
            PawnTransactionDTO updated = pawnTransactionService.updateTransactionDetails(
                    id, request, user.getId(), user.getFullName());
            return ResponseEntity.ok(updated);
        } catch (RuntimeException e) {
            log.error("Error updating transaction details: {}", e.getMessage());
            return ResponseEntity.notFound().build();
        }
    }

    @GetMapping("/{id}/history")
    @Operation(summary = "Get transaction edit history")
    public ResponseEntity<List<TransactionEditHistoryDTO>> getTransactionHistory(
            @PathVariable UUID id,
            @RequestParam(defaultValue = "10") int limit) {
        log.info("GET /pawn-transactions/{}/history", id);
        return ResponseEntity.ok(pawnTransactionService.getTransactionHistory(id, limit));
    }

    @GetMapping("/search-advanced")
    @Operation(summary = "Search transactions with advanced filters")
    public ResponseEntity<PageResponse<PawnTransactionDTO>> searchTransactionsAdvancedAlternate(
            @RequestParam(required = false) String pawnId,
            @RequestParam(required = false) String customerNic,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) java.math.BigDecimal minAmount,
            @RequestParam(required = false) java.math.BigDecimal maxAmount,
            @RequestParam(required = false) String patternMode,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) String filterBranchId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "pawnDate") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || authentication.getPrincipal() == null) {
            log.error("No authentication found");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        String email = authentication.getPrincipal().toString();
        Optional<UserDTO> currentUser = userService.getUserByEmail(email);
        if (currentUser.isEmpty()) {
            log.error("User not found for email: {}", email);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        UserDTO user = currentUser.get();
        UUID branchScope = null;
        if (user.getRole() != null && user.getRole() != com.connectflow.model.UserRole.Role.ADMIN
                && user.getRole() != com.connectflow.model.UserRole.Role.SUPERADMIN) {
            branchScope = user.getBranchId();
            if (branchScope == null) {
                log.error("User {} does not have a branch assigned", email);
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
            }
        } else if (filterBranchId != null && !filterBranchId.isEmpty()) {
            branchScope = UUID.fromString(filterBranchId);
        }

        PageResponse<PawnTransactionDTO> response = pawnTransactionService.searchTransactionsAdvanced(
                pawnId, customerNic, status, minAmount, maxAmount, patternMode, branchScope,
                startDate, endDate,
                page, size, sortBy, sortDir
        );
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{id}/profit")
    @Operation(summary = "Set transaction as profited")
    public ResponseEntity<?> setProfitForTransaction(
            @PathVariable UUID id,
            @RequestBody SetProfitRequest request) {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            if (authentication == null || authentication.getPrincipal() == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
            }

            String email = authentication.getPrincipal().toString();
            Optional<UserDTO> currentUser = userService.getUserByEmail(email);
            if (currentUser.isEmpty()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
            }

            UserDTO user = currentUser.get();

            if (user.getRole() != com.connectflow.model.UserRole.Role.ADMIN
                    && user.getRole() != com.connectflow.model.UserRole.Role.SUPERADMIN
                    && user.getRole() != com.connectflow.model.UserRole.Role.MANAGER) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Only Admin and Manager can set profit"));
            }

            TransactionProfitDTO result = transactionProfitService.setProfitForTransaction(id, request, user.getId());
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            log.error("Error setting profit for transaction: {}", id, e);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/{id}/profit")
    @Operation(summary = "Get profit record for transaction")
    public ResponseEntity<?> getProfitForTransaction(@PathVariable UUID id) {
        try {
            Optional<TransactionProfitDTO> result = transactionProfitService.getProfitByTransactionId(id);
            return result.map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.notFound().build());
        } catch (Exception e) {
            log.error("Error fetching profit for transaction: {}", id, e);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", e.getMessage()));
        }
    }
}
