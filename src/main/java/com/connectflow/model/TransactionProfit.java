package com.connectflow.model;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;
@Entity
@Table(name = "transaction_profit")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TransactionProfit {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @JdbcTypeCode(SqlTypes.CHAR)
    @Column(columnDefinition = "CHAR(36)")

    private UUID id;
    @JdbcTypeCode(SqlTypes.CHAR)
    @Column(name = "transaction_id", nullable = false, columnDefinition = "CHAR(36)")
    private UUID transactionId;
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "transaction_id", insertable = false, updatable = false)
    private PawnTransaction transaction;
    @Column(name = "profit_amount", nullable = false, precision = 18, scale = 2)
    private BigDecimal profitAmount;
    @Column(name = "profit_notes", columnDefinition = "TEXT")
    private String profitNotes;
    @Column(name = "profit_recorded_date", nullable = false)
    private LocalDateTime profitRecordedDate;
    @JdbcTypeCode(SqlTypes.CHAR)
    @Column(name = "profit_recorded_by", nullable = false, columnDefinition = "CHAR(36)")
    private UUID profitRecordedBy;
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "profit_recorded_by", insertable = false, updatable = false)
    private User recordedByUser;
    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (profitRecordedDate == null) {
            profitRecordedDate = LocalDateTime.now();
        }
    }
    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
