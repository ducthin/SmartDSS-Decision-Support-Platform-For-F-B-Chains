package C2SE._1.Capstone2.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "sales_transactions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class SalesTransaction extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id", nullable = false, unique = true)
    private Order order;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal totalAmount;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal netAmount;

    @Column(nullable = false, precision = 5, scale = 2)
    private BigDecimal vatRate;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal vatAmount;

    @Column(length = 30)
    private String paymentMethod;

    @Column(length = 100)
    private String providerTransactionId;

    private LocalDateTime paidAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cashier_id")
    private User cashier;

    @OneToMany(mappedBy = "salesTransaction", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<SalesItem> salesItems = new ArrayList<>();
}
