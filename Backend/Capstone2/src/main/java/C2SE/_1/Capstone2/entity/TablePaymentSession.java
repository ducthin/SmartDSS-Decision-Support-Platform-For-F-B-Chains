package C2SE._1.Capstone2.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Lob;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "table_payment_sessions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class TablePaymentSession extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 64, unique = true)
    private String sessionKey;

    @Column(nullable = false, length = 50)
    private String tableNumber;

    @Column(nullable = false)
    private Long representativeOrderId;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal expectedAmount;

    @Column(nullable = false, length = 20)
    private String provider;

    @Column(length = 100)
    private Long providerOrderCode;

    @Column(length = 100)
    private String providerTransactionId;

    @Column(nullable = false, length = 30)
    private String status;

    @Column(length = 80)
    private String transferContent;

    private LocalDateTime expiresAt;

    private LocalDateTime paidAt;

    @Lob
    @Column(columnDefinition = "TEXT")
    private String includedOrderIds;
}
