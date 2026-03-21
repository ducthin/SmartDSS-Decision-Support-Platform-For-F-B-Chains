package C2SE._1.Capstone2.mapper;

import C2SE._1.Capstone2.dto.OrderDTO;
import C2SE._1.Capstone2.dto.OrderItemDTO;
import C2SE._1.Capstone2.entity.Order;
import C2SE._1.Capstone2.entity.OrderItem;
import C2SE._1.Capstone2.util.DrinkOptionsJsonMapper;
import org.mapstruct.*;

import java.util.List;

@Mapper(componentModel = "spring", uses = DrinkOptionsJsonMapper.class)
public interface OrderMapper {

    @Mapping(target = "createdById", expression = "java(order.getCreatedBy() != null ? order.getCreatedBy().getId() : null)")
    @Mapping(target = "createdByName", expression = "java(order.getCreatedBy() != null ? order.getCreatedBy().getFullName() : null)")
    @Mapping(source = "status", target = "status")
    @Mapping(source = "tableNumber", target = "tableNumber")
    OrderDTO toDTO(Order order);

    List<OrderDTO> toDTOList(List<Order> orders);

    @Mapping(source = "menuItem.id", target = "menuItemId")
    @Mapping(source = "menuItem.name", target = "menuItemName")
    @Mapping(source = "selectedToppingsJson", target = "selectedToppings", qualifiedByName = "toppingSnapshotJsonToList")
    @Mapping(target = "selectedToppingCodes", ignore = true)
    OrderItemDTO orderItemToDTO(OrderItem orderItem);

    List<OrderItemDTO> orderItemsToDTOList(List<OrderItem> orderItems);
}
