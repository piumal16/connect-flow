package com.connectflow.repository;

import com.connectflow.model.ActivityLogEntry;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.UUID;

public interface ActivityLogRepository extends JpaRepository<ActivityLogEntry, UUID> {

    @Query("SELECT a FROM ActivityLogEntry a WHERE " +
           "(:userName IS NULL OR LOWER(a.userName) LIKE LOWER(CONCAT('%', CAST(:userName AS string), '%'))) AND " +
           "(:action   IS NULL OR LOWER(a.action)   LIKE LOWER(CONCAT('%', CAST(:action AS string),   '%'))) " +
           "ORDER BY a.createdAt DESC")
    Page<ActivityLogEntry> search(
            @Param("userName") String userName,
            @Param("action")   String action,
            Pageable pageable
    );
}

