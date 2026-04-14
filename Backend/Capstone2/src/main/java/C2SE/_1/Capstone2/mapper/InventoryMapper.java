package C2SE._1.Capstone2.mapper;

import C2SE._1.Capstone2.dto.InventoryDTO;
import C2SE._1.Capstone2.entity.Inventory;
import org.mapstruct.*;

import java.util.List;

@Mapper(componentModel = "spring")
public interface InventoryMapper {

    @Mapping(source = "ingredient.id", target = "ingredientId")
    @Mapping(source = "ingredient.name", target = "ingredientName")
    @Mapping(source = "ingredient.unit", target = "unit")
    InventoryDTO toDTO(Inventory inventory);

    List<InventoryDTO> toDTOList(List<Inventory> inventories);
}
