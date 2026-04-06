package com.connectflow.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SuperAdminDashboardStatsDTO {
    private long totalBranches;
    private long pendingRequests;
    private long totalUsers;
    private long activeBranches;
}

