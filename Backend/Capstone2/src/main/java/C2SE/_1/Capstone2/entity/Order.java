package C2SE._1.Capstone2.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "orders")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class Order extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private OrderStatus status;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal totalAmount;

    @Column(precision = 12, scale = 2)
    private BigDecimal subtotalAmount;

    @Builder.Default
    @Column(precision = 12, scale = 2)
    private BigDecimal discountAmount = BigDecimal.ZERO;

    @Column(length = 500)
    private String note;

    @Column(length = 50)
    private String tableNumber;

    @Column(name = "customer_phone", length = 20)
    private String customerPhone;

    @Column(name = "voucher_code", length = 64)
    private String voucherCode;

    @Column(name = "promotion_note", length = 255)
    private String promotionNote;

    @Builder.Default
    @Column(name = "loyalty_points_earned")
    private Integer loyaltyPointsEarned = 0;

    /**
     * Phiên khách quét QR (UUID từ trình duyệt). Đơn POS thường để null.
     * Dùng để tab "Đơn của tôi" chỉ hiện đơn của đúng người/điện thoại đặt.
     */
    @Column(name = "qr_client_session_id", length = 64)
    private String qrClientSessionId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    private User createdBy;

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<OrderItem> orderItems = new ArrayList<>();
}
