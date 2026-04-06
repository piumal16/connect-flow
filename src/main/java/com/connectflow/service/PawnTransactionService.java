package com.connectflow.service;

import com.connectflow.dto.BlacklistDTO;
import com.connectflow.dto.CreatePawnTransactionRequest;
import com.connectflow.dto.ItemDetailDTO;
import com.connectflow.dto.PageResponse;
import com.connectflow.dto.PawnTransactionDTO;
import com.connectflow.dto.TransactionEditHistoryDTO;
import com.connectflow.dto.UpdatePawnTransactionDetailsRequest;
import com.connectflow.model.Branch;
import com.connectflow.model.Customer;
import com.connectflow.model.InterestRate;
import com.connectflow.model.PawnTransaction;
import com.connectflow.model.PawnTransactionItem;
import com.connectflow.model.PawnTransactionItemImage;
import com.connectflow.model.TransactionEditHistory;
import com.connectflow.model.User;
import com.connectflow.repository.BranchRepository;
import com.connectflow.repository.CustomerRepository;
import com.connectflow.repository.InterestRateRepository;
import com.connectflow.repository.PawnTransactionItemImageRepository;
import com.connectflow.repository.PawnTransactionItemRepository;
import com.connectflow.repository.PawnTransactionRepository;
import com.connectflow.repository.TransactionEditHistoryRepository;
import com.connectflow.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class PawnTransactionService {

    private final PawnTransactionRepository pawnTransactionRepository;
    private final BranchRepository branchRepository;
    private final UserRepository userRepository;
    private final CustomerRepository customerRepository;
    private final InterestRateRepository interestRateRepository;
    private final BlacklistService blacklistService;
    private final PawnTransactionItemRepository itemRepository;
    private final PawnTransactionItemImageRepository itemImageRepository;
    private final TransactionEditHistoryRepository editHistoryRepository;
    private final ImageUploadService imageUploadService;

    /**
     * Get all transactions
     */
    public List<PawnTransactionDTO> getAllTransactions() {
        return pawnTransactionRepository.findAll().stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    /**
     * Get transactions with pagination
     */
    public PageResponse<PawnTransactionDTO> getAllTransactionsPaginated(int page, int size, String sortBy, String sortDir) {
        Sort sort = sortDir.equalsIgnoreCase("desc")
                ? Sort.by(sortBy).descending()
                : Sort.by(sortBy).ascending();

        Pageable pageable = PageRequest.of(page, size, sort);
        Page<PawnTransaction> transactionPage = pawnTransactionRepository.findAll(pageable);

        List<PawnTransactionDTO> content = transactionPage.getContent().stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());

        return new PageResponse<>(
                content,
                transactionPage.getNumber(),
                transactionPage.getSize(),
                transactionPage.getTotalElements(),
                transactionPage.getTotalPages(),
                transactionPage.isLast()
        );
    }

    /**
     * Get transaction by ID
     */
    public Optional<PawnTransactionDTO> getTransactionById(UUID id) {
        return pawnTransactionRepository.findById(id).map(this::convertToDTO);
    }

    /**
     * Get transaction by pawn ID
     */
    public Optional<PawnTransactionDTO> getTransactionByPawnId(String pawnId) {
        return pawnTransactionRepository.findByPawnId(pawnId).map(this::convertToDTO);
    }

    /**
     * Get transactions by branch
     */
    public List<PawnTransactionDTO> getTransactionsByBranch(UUID branchId) {
        return pawnTransactionRepository.findByBranchId(branchId).stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    /**
     * Get transactions by branch with pagination
     */
    public PageResponse<PawnTransactionDTO> getTransactionsByBranchPaginated(UUID branchId, int page, int size, String sortBy, String sortDir) {
        Sort sort = sortDir.equalsIgnoreCase("desc")
                ? Sort.by(sortBy).descending()
                : Sort.by(sortBy).ascending();

        Pageable pageable = PageRequest.of(page, size, sort);
        Page<PawnTransaction> transactionPage = pawnTransactionRepository.findByBranchId(branchId, pageable);

        List<PawnTransactionDTO> content = transactionPage.getContent().stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());

        return new PageResponse<>(
                content,
                transactionPage.getNumber(),
                transactionPage.getSize(),
                transactionPage.getTotalElements(),
                transactionPage.getTotalPages(),
                transactionPage.isLast()
        );
    }

    /**
     * Get transactions by status
     */
    public PageResponse<PawnTransactionDTO> getTransactionsByStatus(String status, int page, int size, String sortBy, String sortDir) {
        Sort sort = sortDir.equalsIgnoreCase("desc")
                ? Sort.by(sortBy).descending()
                : Sort.by(sortBy).ascending();

        Pageable pageable = PageRequest.of(page, size, sort);
        Page<PawnTransaction> transactionPage = pawnTransactionRepository.findByStatus(status, pageable);

        List<PawnTransactionDTO> content = transactionPage.getContent().stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());

        return new PageResponse<>(
                content,
                transactionPage.getNumber(),
                transactionPage.getSize(),
                transactionPage.getTotalElements(),
                transactionPage.getTotalPages(),
                transactionPage.isLast()
        );
    }

    /**
     * Search transactions
     */
    public PageResponse<PawnTransactionDTO> searchTransactions(String search, UUID branchId, int page, int size, String sortBy, String sortDir) {
        Sort sort = sortDir.equalsIgnoreCase("desc")
                ? Sort.by(sortBy).descending()
                : Sort.by(sortBy).ascending();

        Pageable pageable = PageRequest.of(page, size, sort);
        Page<PawnTransaction> transactionPage;

        if (branchId != null) {
            transactionPage = pawnTransactionRepository.searchTransactionsByBranch(branchId, search, pageable);
        } else {
            transactionPage = pawnTransactionRepository.searchTransactions(search, pageable);
        }

        List<PawnTransactionDTO> content = transactionPage.getContent().stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());

        return new PageResponse<>(
                content,
                transactionPage.getNumber(),
                transactionPage.getSize(),
                transactionPage.getTotalElements(),
                transactionPage.getTotalPages(),
                transactionPage.isLast()
        );
    }

    /**
     * Advanced search for transactions with optional filters
     */
    public PageResponse<PawnTransactionDTO> searchTransactionsAdvanced(String pawnId,
                                                                       String customerNic,
                                                                       String status,
                                                                       BigDecimal minAmount,
                                                                       BigDecimal maxAmount,
                                                                       String patternMode,
                                                                       UUID branchId,
                                                                       LocalDate startDate,
                                                                       LocalDate endDate,
                                                                       int page,
                                                                       int size,
                                                                       String sortBy,
                                                                       String sortDir) {
        String normalizedPawnId = pawnId != null && !pawnId.trim().isEmpty() ? pawnId.trim() : null;
        String normalizedNic = customerNic != null && !customerNic.trim().isEmpty() ? customerNic.trim() : null;
        String normalizedStatus = status != null && !status.trim().isEmpty() && !"all".equalsIgnoreCase(status)
                ? status.trim()
                : null;
        String normalizedPatternMode = patternMode != null && !patternMode.trim().isEmpty() ? patternMode.trim() : null;

        Sort sort = sortDir.equalsIgnoreCase("desc")
                ? Sort.by(sortBy).descending()
                : Sort.by(sortBy).ascending();

        Pageable pageable = PageRequest.of(page, size, sort);
        Page<PawnTransaction> transactionPage = pawnTransactionRepository.searchTransactionsAdvanced(
                branchId,
                normalizedPawnId,
                normalizedNic,
                normalizedStatus,
                minAmount,
                maxAmount,
                normalizedPatternMode,
                startDate,
                endDate,
                pageable
        );

        List<PawnTransactionDTO> content = transactionPage.getContent().stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());

        return new PageResponse<>(
                content,
                transactionPage.getNumber(),
                transactionPage.getSize(),
                transactionPage.getTotalElements(),
                transactionPage.getTotalPages(),
                transactionPage.isLast()
        );
    }

    /**
     * Create new pawn transaction
     * Automatically creates or updates customer record
     * Checks if customer is blacklisted before creation
     */
    public PawnTransactionDTO createTransaction(CreatePawnTransactionRequest request, UUID branchId, UUID createdBy) {
        // Validate required fields
        if (request.getCustomerName() == null || request.getCustomerName().trim().isEmpty()) {
            throw new IllegalArgumentException("Customer name is required");
        }
        if (request.getCustomerNic() == null || request.getCustomerNic().trim().isEmpty()) {
            throw new IllegalArgumentException("Customer NIC is required");
        }
        if (request.getCustomerAddress() == null || request.getCustomerAddress().trim().isEmpty()) {
            throw new IllegalArgumentException("Customer address is required");
        }
        if (request.getItems() == null || request.getItems().isEmpty()) {
            throw new IllegalArgumentException("At least one item is required");
        }

        // ✅ CHECK BLACKLIST BY NIC
        String nic = request.getCustomerNic().trim();
        List<BlacklistDTO> blacklistedByNic = blacklistService.checkByNic(nic);
        if (!blacklistedByNic.isEmpty()) {
            log.warn("Customer with NIC {} is blacklisted. Blocking transaction creation.", nic);
            throw new IllegalArgumentException("Customer is blacklisted. Cannot create transaction for NIC: " + nic + ". Reason: " + blacklistedByNic.get(0).getReason());
        }

        // ✅ CHECK BLACKLIST BY MOBILE NUMBER (if provided)
        if (request.getCustomerPhone() != null && !request.getCustomerPhone().trim().isEmpty()) {
            String phone = request.getCustomerPhone().trim();
            // Note: This would require adding a phone-based search to BlacklistService
            // For now, we log this for manual review
            log.info("Blacklist check for phone {} would be performed if implemented", phone);
        }

        // Log customer creation via pawn transaction
        log.info("Creating pawn transaction with customer details - Name: {}, NIC: {}, Type: {}",
                request.getCustomerName(), request.getCustomerNic(), request.getCustomerType());

        // Create or update customer
        Customer customer = createOrUpdateCustomer(request);
        log.info("Customer created/updated with ID: {}", customer.getId());

        // Generate pawn ID
        String pawnId = generatePawnId();

        // Calculate dates if not provided
        java.time.LocalDate pawnDate = request.getPawnDate();
        java.time.LocalDate maturityDate = request.getMaturityDate();

        if (pawnDate == null) {
            pawnDate = java.time.LocalDate.now();
            log.info("Pawn date not provided, using today: {}", pawnDate);
        }

        if (maturityDate == null && request.getPeriodMonths() != null) {
            maturityDate = pawnDate.plusMonths(request.getPeriodMonths());
            log.info("Maturity date not provided, calculated: {}", maturityDate);
        }

        // Get interest rate values - use provided values or fetch from database
        java.math.BigDecimal interestRatePercent = request.getInterestRatePercent();
        java.math.BigDecimal firstMonthInterestRatePercent = request.getFirstMonthInterestRatePercent();
        if (interestRatePercent == null && request.getInterestRateId() != null) {
            log.info("Interest rate percent not provided, fetching from database for rate ID: {}", request.getInterestRateId());
            var optionalRate = interestRateRepository.findById(request.getInterestRateId());
            if (optionalRate.isPresent()) {
                interestRatePercent = optionalRate.get().getRatePercent();
                if (firstMonthInterestRatePercent == null) {
                    firstMonthInterestRatePercent = optionalRate.get().getFirstMonthRatePercent();
                }
                log.info("Fetched interest rate percent: {}", interestRatePercent);
            } else {
                log.warn("Interest rate not found for ID: {}", request.getInterestRateId());
                // Use default if not found
                interestRatePercent = new java.math.BigDecimal("8.50");
            }
        }

        if (interestRatePercent == null) {
            // Final fallback
            interestRatePercent = new java.math.BigDecimal("8.50");
            log.warn("No interest rate percent available, using default: {}", interestRatePercent);
        }

        if (firstMonthInterestRatePercent == null) {
            firstMonthInterestRatePercent = interestRatePercent.divide(new BigDecimal("12"), 2, RoundingMode.HALF_UP);
            log.info("First-month interest rate percent not provided, derived from normal rate: {}", firstMonthInterestRatePercent);
        }

        // Calculate total loan amount from all items
        java.math.BigDecimal totalLoanAmount = request.getItems().stream()
            .map(ItemDetailDTO::getAppraisedValue)
            .reduce(java.math.BigDecimal.ZERO, java.math.BigDecimal::add);

        if (request.getLoanAmount() != null) {
            totalLoanAmount = request.getLoanAmount();
        }

        log.info("Calculated total loan amount: {}", totalLoanAmount);

        PawnTransaction transaction = PawnTransaction.builder()
                .pawnId(pawnId)
                .branchId(branchId)
                .customerId(customer.getId())
                .customer(customer)
                .idType(request.getIdType() != null ? request.getIdType() : "NIC")
                .patternMode(request.getPatternMode() != null ? request.getPatternMode() : "A")
                .loanAmount(totalLoanAmount)
                .remainingBalance(totalLoanAmount)
                .interestRateId(request.getInterestRateId())
                .interestRatePercent(interestRatePercent)
                .firstMonthInterestRatePercent(firstMonthInterestRatePercent)
                .periodMonths(request.getPeriodMonths() != null ? request.getPeriodMonths() : 6)
                .pawnDate(pawnDate)
                .maturityDate(maturityDate)
                .status("Active")
                .remarks(request.getRemarks())
                .createdBy(createdBy)
                .build();

        PawnTransaction saved = pawnTransactionRepository.save(transaction);

        // Save items if provided
        if (request.getItems() != null && !request.getItems().isEmpty()) {
            log.info("Saving {} items for transaction {}", request.getItems().size(), saved.getId());
            saveTransactionItems(saved.getId(), request.getItems());
        }

        return convertToDTO(saved);
    }

    /**
     * Save transaction items and their images.
     * IMPORTANT: Images that are not already Cloudinary URLs will be uploaded to Cloudinary.
     * If any image upload fails, the entire transaction creation fails (fail-fast semantics).
     */
    private void saveTransactionItems(UUID transactionId, List<ItemDetailDTO> itemsDTO) {
        for (int i = 0; i < itemsDTO.size(); i++) {
            ItemDetailDTO itemDTO = itemsDTO.get(i);

            // Create item
            PawnTransactionItem item = PawnTransactionItem.builder()
                    .transactionId(transactionId)
                    .description(itemDTO.getDescription())
                    .content(itemDTO.getContent())
                    .condition(itemDTO.getCondition() != null ? itemDTO.getCondition() : "Good")
                    .weightGrams(itemDTO.getWeightGrams())
                    .karat(itemDTO.getKarat() != null ? itemDTO.getKarat() : "N/A") // String karat with N/A default
                    .appraisedValue(itemDTO.getAppraisedValue())
                    .marketValue(itemDTO.getMarketValue()) // New market value field
                    .itemOrder(i)
                    .build();

            PawnTransactionItem savedItem = itemRepository.save(item);
            log.info("Saved item {} with ID: {}", i + 1, savedItem.getId());

            // Save images for this item - FAIL FAST if any upload fails
            if (itemDTO.getImages() != null && !itemDTO.getImages().isEmpty()) {
                for (int j = 0; j < itemDTO.getImages().size(); j++) {
                    String imageInput = itemDTO.getImages().get(j);
                    String finalImageUrl = imageInput;

                    // If image is Base64 or not a Cloudinary URL, upload it now
                    if (!imageUploadService.isCloudinaryUrl(imageInput)) {
                        try {
                            log.info("Image {} for item {} is not a Cloudinary URL. Uploading to Cloudinary...", j + 1, i + 1);
                            if (imageInput.startsWith("data:") || !imageInput.startsWith("http")) {
                                // It's Base64 or a local path - upload it
                                finalImageUrl = imageUploadService.uploadBase64Image(imageInput, transactionId.toString());
                                log.info("✅ Image {} for item {} uploaded to Cloudinary: {}", j + 1, i + 1, finalImageUrl);
                            }
                        } catch (Exception e) {
                            // FAIL FAST - propagate the exception to abort transaction
                            log.error("❌ FAILED to upload image {} for item {}: {}", j + 1, i + 1, e.getMessage(), e);
                            throw new RuntimeException(
                                    String.format("Image upload failed for item %d, image %d: %s", i + 1, j + 1, e.getMessage()),
                                    e
                            );
                        }
                    }

                    PawnTransactionItemImage image = PawnTransactionItemImage.builder()
                            .itemId(savedItem.getId())
                            .transactionId(transactionId)
                            .imageUrl(finalImageUrl)
                            .imageOrder(j)
                            .build();
                    itemImageRepository.save(image);
                }
                log.info("Saved {} images for item {}", itemDTO.getImages().size(), savedItem.getId());
            }
        }
    }

    /**
     * Create or update customer based on NIC
     */
    private Customer createOrUpdateCustomer(CreatePawnTransactionRequest request) {
        // Check if customer exists by NIC
        Optional<Customer> existingCustomer = customerRepository.findByNic(request.getCustomerNic());

        if (existingCustomer.isPresent()) {
            // Update existing customer
            Customer customer = existingCustomer.get();
            customer.setFullName(request.getCustomerName().trim());
            customer.setPhone(request.getCustomerPhone());
            customer.setAddress(request.getCustomerAddress());
            customer.setCustomerType(request.getCustomerType() != null ? request.getCustomerType() : "Regular");
            customer.setIsActive(true);
            // Update gender if provided
            if (request.getGender() != null && !request.getGender().trim().isEmpty()) {
                customer.setGender(request.getGender());
            }
            log.info("Updated existing customer with NIC: {}", request.getCustomerNic());
            return customerRepository.save(customer);
        } else {
            // Create new customer
            Customer newCustomer = Customer.builder()
                    .fullName(request.getCustomerName().trim())
                    .nic(request.getCustomerNic().trim())
                    .phone(request.getCustomerPhone())
                    .address(request.getCustomerAddress())
                    .gender(request.getGender())  // ADD GENDER FIELD
                    .customerType(request.getCustomerType() != null ? request.getCustomerType() : "Regular")
                    .isActive(true)
                    .build();
            log.info("Created new customer with NIC: {} and gender: {}", request.getCustomerNic(), request.getGender());
            return customerRepository.save(newCustomer);
        }
    }

    /**
     * Update transaction status
     */
    public PawnTransactionDTO updateTransactionStatus(UUID id, String status, UUID editedBy, String editedByName) {
        PawnTransaction transaction = pawnTransactionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Transaction not found with id: " + id));

        String previousStatus = transaction.getStatus();
        transaction.setStatus(status);
        PawnTransaction updated = pawnTransactionRepository.save(transaction);

        // Log edit history
        logEditHistory(transaction, "STATUS", previousStatus, status, null, editedBy, editedByName);

        return convertToDTO(updated);
    }

    /**
     * Update transaction remarks
     */
    public PawnTransactionDTO updateTransactionRemarks(UUID id, String remarks, UUID editedBy, String editedByName) {
        PawnTransaction transaction = pawnTransactionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Transaction not found with id: " + id));

        String previousRemarks = transaction.getRemarks();
        transaction.setRemarks(remarks);
        PawnTransaction updated = pawnTransactionRepository.save(transaction);

        // Merge remarks into the latest DETAILS history record if possible
        mergeRemarksIntoLatestDetailsHistory(transaction, previousRemarks, editedBy, editedByName);

        return convertToDTO(updated);
    }

    private void mergeRemarksIntoLatestDetailsHistory(PawnTransaction transaction, String previousRemarks,
                                                     UUID editedBy, String editedByName) {
        editHistoryRepository.findTopByTransactionIdOrderByCreatedAtDesc(transaction.getId())
                .filter(history -> "DETAILS".equalsIgnoreCase(history.getEditType()))
                .ifPresentOrElse(history -> {
                    if (history.getPreviousRemarks() == null) {
                        history.setPreviousRemarks(previousRemarks);
                    }
                    history.setNewRemarks(transaction.getRemarks());
                    if (editedBy != null && history.getEditedBy() == null) {
                        history.setEditedBy(editedBy);
                    }
                    if (editedByName != null && (history.getEditedByName() == null || history.getEditedByName().isEmpty())) {
                        history.setEditedByName(editedByName);
                    }
                    editHistoryRepository.save(history);
                }, () -> {
                    TransactionEditHistory history = TransactionEditHistory.builder()
                            .transactionId(transaction.getId())
                            .pawnId(transaction.getPawnId())
                            .editedBy(editedBy != null ? editedBy : transaction.getCreatedBy())
                            .editedByName(editedByName)
                            .editType("DETAILS")
                            .previousRemarks(previousRemarks)
                            .newRemarks(transaction.getRemarks())
                            .build();
                    editHistoryRepository.save(history);
                });
    }

    /**
     * Update transaction block reason and automatically add customer to blacklist with optional police report
     */
    public PawnTransactionDTO updateBlockReason(UUID id, String blockReason, String policeReportNumber,
                                                 String policeReportDate, UUID branchId, UUID userId, String editedByName) {
        PawnTransaction transaction = pawnTransactionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Transaction not found with id: " + id));

        String previousStatus = transaction.getStatus();
        transaction.setStatus("Blocked");
        PawnTransaction updated = pawnTransactionRepository.save(transaction);
        log.info("Transaction {} blocked with reason: {}", id, blockReason);

        // Log edit history with block details
        TransactionEditHistory history = TransactionEditHistory.builder()
                .transactionId(transaction.getId())
                .pawnId(transaction.getPawnId())
                .editedBy(userId)
                .editedByName(editedByName)
                .editType("BLOCK")
                .previousStatus(previousStatus)
                .newStatus("Blocked")
                .blockReason(blockReason)
                .policeReportNumber(policeReportNumber)
                .policeReportDate(policeReportDate != null && !policeReportDate.trim().isEmpty()
                    ? java.time.LocalDate.parse(policeReportDate)
                    : null)
                .build();
        editHistoryRepository.save(history);

        // Automatically add customer to blacklist with police report details
        try {
            // Get customer details from customer relationship
            Customer customer = transaction.getCustomer();

            BlacklistDTO blacklistEntry = new BlacklistDTO();
            blacklistEntry.setCustomerName(customer.getFullName());
            blacklistEntry.setCustomerNic(customer.getNic());
            blacklistEntry.setReason(blockReason);
            blacklistEntry.setPoliceReportNumber(policeReportNumber);

            // Convert policeReportDate string to LocalDate if provided
            if (policeReportDate != null && !policeReportDate.trim().isEmpty()) {
                try {
                    blacklistEntry.setPoliceReportDate(java.time.LocalDate.parse(policeReportDate));
                } catch (Exception e) {
                    log.warn("Failed to parse police report date: {}", policeReportDate);
                }
            }

            blacklistEntry.setBranchId(branchId);
            blacklistEntry.setAddedBy(userId);
            blacklistEntry.setIsActive(true);

            blacklistService.addToBlacklist(blacklistEntry);
            log.info("Customer {} added to blacklist with reason: {}, police report: {}",
                    customer.getNic(), blockReason, policeReportNumber);
        } catch (Exception e) {
            log.error("Failed to add customer to blacklist: {}", e.getMessage());
            // Continue even if blacklist fails - transaction is still blocked
        }

        return convertToDTO(updated);
    }

    /**
     * Update transaction details
     * - Editable fields: loanAmount, interestRateId, periodMonths, maturityDate
     * - Customer address and phone are synced to the customer record
     */
    public PawnTransactionDTO updateTransactionDetails(UUID id, UpdatePawnTransactionDetailsRequest request,
                                                      UUID editedBy, String editedByName) {
        PawnTransaction transaction = pawnTransactionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Transaction not found with id: " + id));

        // Store previous values for audit
        String previousAddress = transaction.getCustomer() != null ? transaction.getCustomer().getAddress() : null;
        String previousPhone = transaction.getCustomer() != null ? transaction.getCustomer().getPhone() : null;
        BigDecimal previousLoanAmount = transaction.getLoanAmount();
        UUID previousInterestRateId = transaction.getInterestRateId();
        Integer previousPeriodMonths = transaction.getPeriodMonths();
        java.time.LocalDate previousMaturityDate = transaction.getMaturityDate();

        if (transaction.getCustomer() != null) {
            boolean customerChanged = false;

            if (request.getCustomerAddress() != null) {
                transaction.getCustomer().setAddress(request.getCustomerAddress());
                customerChanged = true;
            }

            if (request.getCustomerPhone() != null) {
                transaction.getCustomer().setPhone(request.getCustomerPhone());
                customerChanged = true;
            }

            if (customerChanged) {
                customerRepository.save(transaction.getCustomer());
            }
        }

        if (request.getLoanAmount() != null) {
            transaction.setLoanAmount(request.getLoanAmount());
        }

        if (request.getInterestRatePercent() != null) {
            // Find or create interest rate for the given percentage
            Optional<InterestRate> existingRate = interestRateRepository.findAll().stream()
                    .filter(r -> r.getRatePercent().compareTo(request.getInterestRatePercent()) == 0)
                    .findFirst();

            InterestRate rate;
            if (existingRate.isPresent()) {
                rate = existingRate.get();
            } else {
                // Create new rate if it doesn't exist
                rate = InterestRate.builder()
                        .name("Custom Rate - " + request.getInterestRatePercent() + "%")
                        .ratePercent(request.getInterestRatePercent())
                        .isDefault(false)
                        .build();
                rate = interestRateRepository.save(rate);
                log.info("Created new interest rate with percentage: {}", request.getInterestRatePercent());
            }

            transaction.setInterestRateId(rate.getId());
            transaction.setInterestRatePercent(rate.getRatePercent());
        }

        if (request.getPeriodMonths() != null) {
            transaction.setPeriodMonths(request.getPeriodMonths());
        }

        if (request.getMaturityDate() != null) {
            transaction.setMaturityDate(request.getMaturityDate());
        }

        PawnTransaction updated = pawnTransactionRepository.save(transaction);

        // Get updated address from customer
        String newAddress = transaction.getCustomer() != null ? transaction.getCustomer().getAddress() : null;
        String newPhone = transaction.getCustomer() != null ? transaction.getCustomer().getPhone() : null;

        // Log edit history for details
        TransactionEditHistory history = TransactionEditHistory.builder()
                .transactionId(transaction.getId())
                .pawnId(transaction.getPawnId())
                .editedBy(editedBy != null ? editedBy : transaction.getCreatedBy())
                .editedByName(editedByName)
                .editType("DETAILS")
                .previousAddress(previousAddress)
                .newAddress(newAddress)
                .previousPhone(previousPhone)
                .newPhone(newPhone)
                .previousLoanAmount(previousLoanAmount)
                .newLoanAmount(transaction.getLoanAmount())
                .previousInterestRateId(previousInterestRateId)
                .newInterestRateId(transaction.getInterestRateId())
                .previousPeriodMonths(previousPeriodMonths)
                .newPeriodMonths(transaction.getPeriodMonths())
                .previousMaturityDate(previousMaturityDate)
                .newMaturityDate(transaction.getMaturityDate())
                .build();
        editHistoryRepository.save(history);

        return convertToDTO(updated);
    }

    private void logEditHistory(PawnTransaction transaction, String editType,
                                 String previousStatus, String newStatus, String previousRemarks,
                                 UUID editedBy, String editedByName) {
        TransactionEditHistory history = TransactionEditHistory.builder()
                .transactionId(transaction.getId())
                .pawnId(transaction.getPawnId())
                .editedBy(editedBy != null ? editedBy : transaction.getCreatedBy())
                .editedByName(editedByName)
                .editType(editType)
                .previousStatus(previousStatus)
                .newStatus(newStatus)
                .previousRemarks(previousRemarks)
                .newRemarks(transaction.getRemarks())
                .build();
        editHistoryRepository.save(history);
    }

    public List<TransactionEditHistoryDTO> getTransactionHistory(UUID transactionId, int limit) {
        return editHistoryRepository.findByTransactionIdOrderByCreatedAtDesc(
                        transactionId, PageRequest.of(0, limit))
                .stream()
                .map(this::toHistoryDTO)
                .toList();
    }

    private TransactionEditHistoryDTO toHistoryDTO(TransactionEditHistory history) {
        return TransactionEditHistoryDTO.builder()
                .id(history.getId())
                .transactionId(history.getTransactionId())
                .pawnId(history.getPawnId())
                .editedBy(history.getEditedBy())
                .editedByName(history.getEditedByName())
                .editType(history.getEditType())
                .previousStatus(history.getPreviousStatus())
                .previousAddress(history.getPreviousAddress())
                .previousPhone(history.getPreviousPhone())
                .previousLoanAmount(history.getPreviousLoanAmount())
                .previousInterestRateId(history.getPreviousInterestRateId())
                .previousPeriodMonths(history.getPreviousPeriodMonths())
                .previousMaturityDate(history.getPreviousMaturityDate())
                .previousRemarks(history.getPreviousRemarks())
                .newStatus(history.getNewStatus())
                .newAddress(history.getNewAddress())
                .newPhone(history.getNewPhone())
                .newLoanAmount(history.getNewLoanAmount())
                .newInterestRateId(history.getNewInterestRateId())
                .newPeriodMonths(history.getNewPeriodMonths())
                .newMaturityDate(history.getNewMaturityDate())
                .newRemarks(history.getNewRemarks())
                .blockReason(history.getBlockReason())
                .policeReportNumber(history.getPoliceReportNumber())
                .policeReportDate(history.getPoliceReportDate())
                .createdAt(history.getCreatedAt())
                .build();
    }

    /**
     * Generate unique pawn ID
     */
    private synchronized String generatePawnId() {
        // Get the highest pawn ID number from database
        List<PawnTransaction> allTransactions = pawnTransactionRepository.findAll();
        int maxNumber = 0;

        for (PawnTransaction t : allTransactions) {
            if (t.getPawnId() != null && t.getPawnId().startsWith("PW")) {
                try {
                    String numberPart = t.getPawnId().substring(2);
                    int number = Integer.parseInt(numberPart);
                    if (number > maxNumber) {
                        maxNumber = number;
                    }
                } catch (Exception e) {
                    log.warn("Could not parse pawn ID: {}", t.getPawnId());
                }
            }
        }

        int nextNumber = maxNumber + 1;
        return String.format("PW%04d", nextNumber);
    }

    /**
     * Convert entity to DTO
     */
    private PawnTransactionDTO convertToDTO(PawnTransaction transaction) {

        // Get branch name
        String branchName = branchRepository.findById(transaction.getBranchId())
                .map(Branch::getName)
                .orElse(null);

        // Get creator name
        String createdByName = userRepository.findById(transaction.getCreatedBy())
                .map(User::getFullName)
                .orElse(null);

        // Get interest rate name
        String interestRateName = null;
        if (transaction.getInterestRateId() != null) {
            interestRateName = interestRateRepository.findById(transaction.getInterestRateId())
                    .map(InterestRate::getName)
                    .orElse(null);
        }

        // Convert items to ItemDetailDTOs
        List<ItemDetailDTO> itemDetails = new java.util.ArrayList<>();
        if (transaction.getItems() != null) {
            for (PawnTransactionItem item : transaction.getItems()) {
                ItemDetailDTO itemDTO = ItemDetailDTO.builder()
                        .description(item.getDescription())
                        .content(item.getContent())
                        .condition(item.getCondition())
                        .weightGrams(item.getWeightGrams())
                        .karat(item.getKarat())
                        .appraisedValue(item.getAppraisedValue())
                        .build();

                // Get images for this item
                if (item.getImages() != null) {
                    List<String> imageUrls = item.getImages().stream()
                            .map(PawnTransactionItemImage::getImageUrl)
                            .toList();
                    itemDTO.setImages(imageUrls);
                }

                itemDetails.add(itemDTO);
            }
        }

        // Calculate remaining balance from database or use loan amount if not set
        BigDecimal remainingBalance = transaction.getRemainingBalance();
        if (remainingBalance == null) {
            remainingBalance = transaction.getLoanAmount();
        }

        // Get customer details from relationship
        Customer customer = transaction.getCustomer();
        String customerName = customer != null ? customer.getFullName() : null;
        String customerNic = customer != null ? customer.getNic() : null;
        String customerAddress = customer != null ? customer.getAddress() : null;
        String customerPhone = customer != null ? customer.getPhone() : null;
        String customerType = customer != null ? customer.getCustomerType() : null;
        String gender = customer != null ? customer.getGender() : null;

        return PawnTransactionDTO.builder()
                .id(transaction.getId())
                .pawnId(transaction.getPawnId())
                .branchId(transaction.getBranchId())
                .branchName(branchName)
                .customerName(customerName)
                .customerNic(customerNic)
                .idType(transaction.getIdType())
                .gender(gender)
                .customerAddress(customerAddress)
                .customerPhone(customerPhone)
                .customerType(customerType)
                .patternMode(transaction.getPatternMode())
                .loanAmount(transaction.getLoanAmount())
                .remainingBalance(remainingBalance)
                .interestRateId(transaction.getInterestRateId())
                .interestRateName(interestRateName)
                .interestRatePercent(transaction.getInterestRatePercent())
                .firstMonthInterestRatePercent(transaction.getFirstMonthInterestRatePercent())
                .periodMonths(transaction.getPeriodMonths())
                .pawnDate(transaction.getPawnDate())
                .maturityDate(transaction.getMaturityDate())
                .status(transaction.getStatus())
                .remarks(transaction.getRemarks())
                .itemDetails(itemDetails)
                .createdBy(transaction.getCreatedBy())
                .createdByName(createdByName)
                .createdAt(transaction.getCreatedAt())
                .updatedAt(transaction.getUpdatedAt())
                .build();
    }
}

