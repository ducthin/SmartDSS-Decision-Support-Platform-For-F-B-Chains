package C2SE._1.Capstone2.dto;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class QrInvoiceResponseDTO {
    private Long requestId;
    private Long orderId;
    private String deliveryMethod;
    private String status;
    private String companyName;
    private String email;
    private String phone;
    private String message;
    private String invoiceHtml;
    private String invoicePdfBase64;
    private LocalDateTime createdAt;
}
