package com.connectflow.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "pawn_transactions")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PawnTransaction {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @JdbcTypeCode(SqlTypes.CHAR)
    @Column(columnDefinition = "CHAR(36)")
    private UUID id;

    @Column(name = "pawn_id", nullable = false, unique = true)
    private String pawnId;

    @JdbcTypeCode(SqlTypes.CHAR)
    @Column(name = "branch_id", nullable = false, columnDefinition = "CHAR(36)")
    private UUID branchId;

    @JdbcTypeCode(SqlTypes.CHAR)
    @Column(name = "customer_id", nullable = false, columnDefinition = "CHAR(36)")
    private UUID customerId;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "customer_id", insertable = false, updatable = false)
    private Customer customer;

    @Column(name = "id_type")
    private String idType = "NIC";


    @Column(name = "pattern_mode", nullable = false, length = 1)
    private String patternMode = "A";

    @Column(name = "loan_amount", nullable = false, precision = 18, scale = 2)
    private BigDecimal loanAmount;

    @Column(name = "remaining_balance", precision = 18, scale = 2)
    private BigDecimal remainingBalance;

    @JdbcTypeCode(SqlTypes.CHAR)
    @Column(name = "interest_rate_id", columnDefinition = "CHAR(36)")
    private UUID interestRateId;

    @Column(name = "interest_rate_percent", nullable = false, precision = 5, scale = 2)
    private BigDecimal interestRatePercent;

    @Column(name = "first_month_interest_rate_percent", nullable = false, precision = 5, scale = 2)
    private BigDecimal firstMonthInterestRatePercent;

    @Column(name = "period_months", nullable = false)
    private Integer periodMonths = 6;

    @Column(name = "pawn_date", nullable = false)
    private LocalDate pawnDate;

    @Column(name = "maturity_date", nullable = false)
    private LocalDate maturityDate;

    @Column(name = "last_redemption_date")
    private LocalDate lastRedemptionDate;

    @Column(nullable = false)
    private String status = "Active";

    @Column(columnDefinition = "TEXT")
    private String remarks;

    // Multiple items relationship (stores all item details)
    @OneToMany(mappedBy = "transaction", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private List<PawnTransactionItem> items = new ArrayList<>();

    @JdbcTypeCode(SqlTypes.CHAR)
    @Column(name = "created_by", nullable = false, columnDefinition = "CHAR(36)")
    private UUID createdBy;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (pawnDate == null) {
            pawnDate = LocalDate.now();
        }
        if (firstMonthInterestRatePercent == null && interestRatePercent != null) {
            firstMonthInterestRatePercent = interestRatePercent.divide(new BigDecimal("12"), 2, RoundingMode.HALF_UP);
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
        if (firstMonthInterestRatePercent == null && interestRatePercent != null) {
            firstMonthInterestRatePercent = interestRatePercent.divide(new BigDecimal("12"), 2, RoundingMode.HALF_UP);
        }
    }
}
