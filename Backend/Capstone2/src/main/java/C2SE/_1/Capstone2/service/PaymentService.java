package C2SE._1.Capstone2.service;

import C2SE._1.Capstone2.dto.PaymentInitDTO;
import C2SE._1.Capstone2.dto.PaymentStatusDTO;
import C2SE._1.Capstone2.dto.TableCashSettlementResultDTO;
import C2SE._1.Capstone2.dto.TableSettlementDetailDTO;
import C2SE._1.Capstone2.dto.TableQrInitDTO;
import C2SE._1.Capstone2.dto.TableSettlementSummaryDTO;
import C2SE._1.Capstone2.dto.PaymentWebhookDTO;

import java.util.List;

public interface PaymentService {
    PaymentInitDTO initQrPayment(Long orderId);

    TableQrInitDTO initTableQrPayment(String tableNumber);

    PaymentStatusDTO markCashPaid(Long orderId);

    PaymentStatusDTO getOrderPaymentStatus(Long orderId);

    List<PaymentStatusDTO> getOrderPaymentStatuses(List<Long> orderIds);

    TableCashSettlementResultDTO markTableCashPaid(String tableNumber);

    List<TableSettlementSummaryDTO> getTableSettlementSummary();

    TableSettlementDetailDTO getTableSettlementDetail(String tableNumber);

    PaymentStatusDTO handleWebhook(PaymentWebhookDTO webhookDTO, String webhookSecretHeader);

    PaymentStatusDTO handleProviderWebhook(PaymentWebhookDTO webhookDTO);
}
