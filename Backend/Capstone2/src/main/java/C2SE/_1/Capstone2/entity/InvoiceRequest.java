package C2SE._1.Capstone2.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

@Entity
@Table(name = "invoice_requests")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class InvoiceRequest extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id", nullable = false)
    private Order order;

    @Column(name = "qr_token", nullable = false, length = 80)
    private String qrToken;

    @Column(name = "client_session_id", nullable = false, length = 80)
    private String clientSessionId;

    @Enumerated(EnumType.STRING)
    @Column(name = "delivery_method", nullable = false, length = 20)
    private DeliveryMethod deliveryMethod;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    @Column(nullable = false, length = 20)
    private Status status = Status.REQUESTED;

    @Column(name = "tax_code", nullable = false, length = 50)
    private String taxCode;

    @Column(name = "company_name", nullable = false, length = 255)
    private String companyName;

    @Column(nullable = false, length = 500)
    private String address;

    @Column(nullable = false, length = 160)
    private String email;

    @Column(nullable = false, length = 20)
    private String phone;

    @Column(name = "invoice_html", columnDefinition = "TEXT")
    private String invoiceHtml;

    public enum DeliveryMethod {
        EMAIL,
        DIRECT,
        COUNTER
    }

    public enum Status {
        REQUESTED,
        READY,
        SENT
    }
}
