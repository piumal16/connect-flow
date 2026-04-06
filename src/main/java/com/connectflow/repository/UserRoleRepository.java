package com.connectflow.repository;

import com.connectflow.model.UserRole;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserRoleRepository extends JpaRepository<UserRole, UUID> {
    List<UserRole> findByUserId(UUID userId);
    Optional<UserRole> findByUserIdAndRole(UUID userId, UserRole.Role role);
    List<UserRole> findByBranchId(UUID branchId);
    List<UserRole> findByRole(UserRole.Role role);
    long countByRole(UserRole.Role role);
}

