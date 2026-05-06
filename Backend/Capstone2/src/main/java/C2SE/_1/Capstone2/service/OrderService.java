package C2SE._1.Capstone2.service;

import C2SE._1.Capstone2.dto.OrderDTO;
import C2SE._1.Capstone2.dto.PageResponse;
import C2SE._1.Capstone2.dto.QrDiscountPreviewDTO;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface OrderService {

    List<OrderDTO> getAllOrders();

    PageResponse<OrderDTO> getAllOrders(Pageable pageable);

    PageResponse<OrderDTO> getAllOrders(Pageable pageable, String keyword);

    PageResponse<OrderDTO> getOrdersByStatus(String status, Pageable pageable);

    PageResponse<OrderDTO> getOrdersByStatus(String status, Pageable pageable, String keyword);

    OrderDTO getOrderById(Long id);

    OrderDTO createOrder(OrderDTO orderDTO);

    QrDiscountPreviewDTO previewDiscount(java.math.BigDecimal subtotal, String voucherCode, String customerPhone);

    OrderDTO updateOrderStatus(Long id, String status);
}
