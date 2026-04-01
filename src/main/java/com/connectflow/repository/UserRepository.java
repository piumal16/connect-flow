package com.connectflow.repository;

import com.connectflow.model.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserRepository extends JpaRepository<User, UUID> {
    Optional<User> findByEmail(String email);
    boolean existsByEmail(String email);
    Optional<User> findByEmailAndPassword(String email, String password);

    /**
     * Filter users by optional criteria: name, email, role, and branch
     * All parameters are optional - only applied if not null
     * Follows the same pattern as CustomerRepository and BlacklistRepository
     * Note: Role and branchId are stored in user_roles table, so we join with it
     */
    @Query("SELECT DISTINCT u FROM User u LEFT JOIN UserRole ur ON u.id = ur.userId WHERE " +
           "(:name IS NULL OR LOWER(u.fullName) LIKE LOWER(CONCAT('%', CAST(:name AS string), '%'))) AND " +
           "(:email IS NULL OR LOWER(u.email) LIKE LOWER(CONCAT('%', CAST(:email AS string), '%'))) AND " +
           "(:role IS NULL OR ur.role = :role) AND " +
           "(:branchId IS NULL OR ur.branchId = :branchId)")
    Page<User> filterUsers(
            @Param("name") String name,
            @Param("email") String email,
            @Param("role") String role,
            @Param("branchId") UUID branchId,
            Pageable pageable);
}
