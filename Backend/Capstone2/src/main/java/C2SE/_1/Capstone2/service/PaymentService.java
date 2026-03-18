package C2SE._1.Capstone2.service;

import C2SE._1.Capstone2.dto.PaymentInitDTO;
import C2SE._1.Capstone2.dto.PaymentStatusDTO;
import C2SE._1.Capstone2.dto.PaymentWebhookDTO;

import java.util.List;

public interface PaymentService {
    PaymentInitDTO initQrPayment(Long orderId);

    PaymentStatusDTO markCashPaid(Long orderId);

    PaymentStatusDTO getOrderPaymentStatus(Long orderId);

    List<PaymentStatusDTO> getOrderPaymentStatuses(List<Long> orderIds);

    PaymentStatusDTO handleWebhook(PaymentWebhookDTO webhookDTO, String webhookSecretHeader);

    PaymentStatusDTO handleProviderWebhook(PaymentWebhookDTO webhookDTO);
}
