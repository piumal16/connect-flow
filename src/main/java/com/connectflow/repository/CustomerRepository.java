package com.connectflow.repository;

import com.connectflow.model.Customer;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.Optional;
import java.util.UUID;
import java.util.List;

@Repository
public interface CustomerRepository extends JpaRepository<Customer, UUID> {
    Optional<Customer> findByNic(String nic);
    boolean existsByNic(String nic);
    List<Customer> findByIsActiveTrue();
    Page<Customer> findByIsActiveTrue(Pageable pageable);
    List<Customer> findByCustomerType(String customerType);
    Page<Customer> findByCustomerType(String customerType, Pageable pageable);
    List<Customer> findByFullNameContainingIgnoreCase(String name);
    Page<Customer> findByFullNameContainingIgnoreCase(String name, Pageable pageable);

    // Advanced search methods
    Page<Customer> findByNicContainingIgnoreCase(String nic, Pageable pageable);
    Page<Customer> findByPhoneContainingIgnoreCase(String phone, Pageable pageable);
    Page<Customer> findByNicContainingIgnoreCaseAndPhoneContainingIgnoreCase(String nic, String phone, Pageable pageable);

    /**
     * Filter customers by optional criteria: NIC, phone, name, customerType, and status
     * All parameters are optional - only applied if not null
     */
    @Query("SELECT c FROM Customer c WHERE " +
           "(:nic IS NULL OR LOWER(c.nic) LIKE LOWER(CONCAT('%', CAST(:nic AS string), '%'))) AND " +
           "(:phone IS NULL OR LOWER(c.phone) LIKE LOWER(CONCAT('%', CAST(:phone AS string), '%'))) AND " +
           "(:name IS NULL OR LOWER(c.fullName) LIKE LOWER(CONCAT('%', CAST(:name AS string), '%'))) AND " +
           "(:customerType IS NULL OR LOWER(c.customerType) = LOWER(CAST(:customerType AS string))) AND " +
           "(:isActive IS NULL OR c.isActive = :isActive)")
    Page<Customer> searchAdvanced(
            @Param("nic") String nic,
            @Param("phone") String phone,
            @Param("name") String name,
            @Param("customerType") String customerType,
            @Param("isActive") Boolean isActive,
            Pageable pageable);

    /**
     * Filter customers by NIC, phone, and status (basic filter)
     * All parameters are optional - only applied if not null
     */
    @Query("SELECT c FROM Customer c WHERE " +
           "(:nic IS NULL OR LOWER(c.nic) LIKE LOWER(CONCAT('%', CAST(:nic AS string), '%'))) AND " +
           "(:phone IS NULL OR LOWER(c.phone) LIKE LOWER(CONCAT('%', CAST(:phone AS string), '%'))) AND " +
           "(:isActive IS NULL OR c.isActive = :isActive)")
    Page<Customer> filterCustomers(
            @Param("nic") String nic,
            @Param("phone") String phone,
            @Param("isActive") Boolean isActive,
            Pageable pageable);
}

