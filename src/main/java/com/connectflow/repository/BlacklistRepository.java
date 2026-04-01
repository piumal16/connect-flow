package com.connectflow.repository;

import com.connectflow.model.Blacklist;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.UUID;

@Repository
public interface BlacklistRepository extends JpaRepository<Blacklist, UUID> {
    List<Blacklist> findByIsActiveTrue();
    List<Blacklist> findByBranchId(UUID branchId);
    List<Blacklist> findByCustomerNic(String customerNic);
    List<Blacklist> findByCustomerNicAndIsActiveTrue(String customerNic);

    // For partial NIC matching during auto-search
    List<Blacklist> findByCustomerNicStartsWithAndIsActiveTrue(String nicPrefix);

    // Advanced search method
    Page<Blacklist> findByCustomerNicContainingIgnoreCase(String nic, Pageable pageable);

    /**
     * Filter blacklist entries by optional criteria: NIC, police report number, and status
     * All parameters are optional - only applied if not null
     * Follows the same pattern as CustomerRepository.filterCustomers()
     */
    @Query("SELECT b FROM Blacklist b WHERE " +
           "(:nic IS NULL OR LOWER(b.customerNic) LIKE LOWER(CONCAT('%', CAST(:nic AS string), '%'))) AND " +
           "(:policeReport IS NULL OR LOWER(b.policeReportNumber) LIKE LOWER(CONCAT('%', CAST(:policeReport AS string), '%'))) AND " +
           "(:isActive IS NULL OR b.isActive = :isActive)")
    Page<Blacklist> filterBlacklist(
            @Param("nic") String nic,
            @Param("policeReport") String policeReport,
            @Param("isActive") Boolean isActive,
            Pageable pageable);
}

