package com.connectflow.repository;

import com.connectflow.model.PawnTransaction;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PawnTransactionRepository extends JpaRepository<PawnTransaction, UUID> {

    // Find by pawn ID
    Optional<PawnTransaction> findByPawnId(String pawnId);

    // Find by customer ID
    List<PawnTransaction> findByCustomerId(UUID customerId);
    Page<PawnTransaction> findByCustomerId(UUID customerId, Pageable pageable);

    // Find by branch
    List<PawnTransaction> findByBranchId(UUID branchId);
    Page<PawnTransaction> findByBranchId(UUID branchId, Pageable pageable);

    // Find by status
    List<PawnTransaction> findByStatus(String status);
    Page<PawnTransaction> findByStatus(String status, Pageable pageable);

    // Find by branch and status
    Page<PawnTransaction> findByBranchIdAndStatus(UUID branchId, String status, Pageable pageable);

    // Search by customer name, NIC or pawn ID (via customer relationship)
    @Query("SELECT p FROM PawnTransaction p WHERE " +
           "LOWER(p.customer.fullName) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(p.customer.nic) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(p.pawnId) LIKE LOWER(CONCAT('%', :search, '%'))")
    Page<PawnTransaction> searchTransactions(@Param("search") String search, Pageable pageable);

    // Search within a branch (via customer relationship)
    @Query("SELECT p FROM PawnTransaction p WHERE p.branchId = :branchId AND " +
           "(LOWER(p.customer.fullName) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(p.customer.nic) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(p.pawnId) LIKE LOWER(CONCAT('%', :search, '%')))")
    Page<PawnTransaction> searchTransactionsByBranch(@Param("branchId") UUID branchId,
                                                      @Param("search") String search,
                                                      Pageable pageable);

    // Find active transactions past maturity date for overdue scheduling
    @Query("SELECT p FROM PawnTransaction p WHERE p.status = 'Active' AND p.maturityDate < :today")
    List<PawnTransaction> findActiveOverdue(@Param("today") java.time.LocalDate today);

    // Advanced search with optional filters and optional branch scope (via customer relationship)
    @Query("SELECT p FROM PawnTransaction p WHERE " +
           "(:branchId IS NULL OR p.branchId = :branchId) AND " +
           "(:pawnId IS NULL OR LOWER(p.pawnId) LIKE LOWER(CONCAT('%', CAST(:pawnId AS string), '%'))) AND " +
           "(:customerNic IS NULL OR LOWER(p.customer.nic) LIKE LOWER(CONCAT('%', CAST(:customerNic AS string), '%'))) AND " +
           "(:status IS NULL OR p.status = :status) AND " +
           "(:minAmount IS NULL OR p.loanAmount >= :minAmount) AND " +
           "(:maxAmount IS NULL OR p.loanAmount <= :maxAmount) AND " +
           "(:patternMode IS NULL OR p.patternMode = :patternMode) AND " +
           "(:startDate IS NULL OR p.pawnDate >= :startDate) AND " +
           "(:endDate IS NULL OR p.pawnDate <= :endDate)")
    Page<PawnTransaction> searchTransactionsAdvanced(@Param("branchId") UUID branchId,
                                                     @Param("pawnId") String pawnId,
                                                     @Param("customerNic") String customerNic,
                                                     @Param("status") String status,
                                                     @Param("minAmount") java.math.BigDecimal minAmount,
                                                     @Param("maxAmount") java.math.BigDecimal maxAmount,
                                                     @Param("patternMode") String patternMode,
                                                     @Param("startDate") java.time.LocalDate startDate,
                                                     @Param("endDate") java.time.LocalDate endDate,
                                                     Pageable pageable);
}
