package com.connectflow.repository;

import com.connectflow.model.Branch;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.UUID;

@Repository
public interface BranchRepository extends JpaRepository<Branch, UUID> {
    List<Branch> findByIsActiveTrueOrderByName();
    List<Branch> findByManagerId(UUID managerId);
    long countByIsActiveTrue();
}

