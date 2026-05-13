package C2SE._1.Capstone2.service;

import C2SE._1.Capstone2.dto.OrderDTO;
import C2SE._1.Capstone2.dto.PublicOnlineOrderDTO;
import C2SE._1.Capstone2.dto.QrDiscountPreviewDTO;

import java.math.BigDecimal;

public interface PublicOnlineOrderService {
    OrderDTO createOnlineOrder(PublicOnlineOrderDTO dto);

    QrDiscountPreviewDTO previewDiscount(BigDecimal subtotal, String voucherCode, String customerPhone);
}
