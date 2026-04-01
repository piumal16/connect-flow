package com.connectflow.repository;

import com.connectflow.model.ItemType;
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
public interface ItemTypeRepository extends JpaRepository<ItemType, UUID> {

    /**
     * Find all active item types
     */
    List<ItemType> findByIsActiveTrueOrderByNameAsc();

    /**
     * Find all item types ordered by name
     */
    List<ItemType> findAllByOrderByNameAsc();

    /**
     * Check if an item type with the given name already exists (case-insensitive)
     */
    Optional<ItemType> findByNameIgnoreCase(String name);

    /**
     * Check if an item type exists by name, excluding a specific ID
     */
    boolean existsByNameIgnoreCaseAndIdNot(String name, UUID id);

    /**
     * Advanced search with optional filters for name and isActive status
     * All parameters are optional - only applied if not null
     * Follows the same pattern as UserRepository and CustomerRepository
     * Uses LIKE for case-insensitive partial matching on name
     */
    @Query("SELECT DISTINCT it FROM ItemType it WHERE " +
           "(:name IS NULL OR LOWER(it.name) LIKE LOWER(CONCAT('%', CAST(:name AS string), '%'))) AND " +
           "(:description IS NULL OR LOWER(it.description) LIKE LOWER(CONCAT('%', CAST(:description AS string), '%'))) AND " +
           "(:isActive IS NULL OR it.isActive = :isActive)")
    Page<ItemType> advancedSearch(
            @Param("name") String name,
            @Param("description") String description,
            @Param("isActive") Boolean isActive,
            Pageable pageable);
}

