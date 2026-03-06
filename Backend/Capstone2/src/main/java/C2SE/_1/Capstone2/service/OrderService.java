package C2SE._1.Capstone2.service;

import C2SE._1.Capstone2.dto.OrderDTO;

import java.util.List;

public interface OrderService {

    List<OrderDTO> getAllOrders();

    OrderDTO getOrderById(Long id);

    OrderDTO createOrder(OrderDTO orderDTO);

    OrderDTO updateOrderStatus(Long id, String status);
}
