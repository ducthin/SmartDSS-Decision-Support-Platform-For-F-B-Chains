package C2SE._1.Capstone2.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "cash_closings")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class CashClosing extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private LocalDate businessDate;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal openingBalance;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal totalInflow;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal totalOutflow;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal expectedBalance;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal actualBalance;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal variance;

    @Column(length = 255)
    private String note;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "closed_by")
    private User closedBy;

    private LocalDateTime closedAt;
}
