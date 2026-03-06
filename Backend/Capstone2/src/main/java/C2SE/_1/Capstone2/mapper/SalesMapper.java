package C2SE._1.Capstone2.mapper;

import C2SE._1.Capstone2.dto.SalesDTO;
import C2SE._1.Capstone2.dto.SalesItemDTO;
import C2SE._1.Capstone2.entity.SalesItem;
import C2SE._1.Capstone2.entity.SalesTransaction;
import org.mapstruct.*;

import java.util.List;

@Mapper(componentModel = "spring")
public interface SalesMapper {

    @Mapping(source = "order.id", target = "orderId")
    @Mapping(source = "cashier.id", target = "cashierId")
    @Mapping(source = "cashier.fullName", target = "cashierName")
    SalesDTO toDTO(SalesTransaction salesTransaction);

    List<SalesDTO> toDTOList(List<SalesTransaction> salesTransactions);

    @Mapping(source = "menuItem.id", target = "menuItemId")
    @Mapping(source = "menuItem.name", target = "menuItemName")
    SalesItemDTO salesItemToDTO(SalesItem salesItem);

    List<SalesItemDTO> salesItemsToDTOList(List<SalesItem> salesItems);
}
