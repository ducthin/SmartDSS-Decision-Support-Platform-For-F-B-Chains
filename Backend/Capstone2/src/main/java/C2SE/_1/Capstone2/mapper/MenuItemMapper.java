package C2SE._1.Capstone2.mapper;

import C2SE._1.Capstone2.dto.MenuItemDTO;
import C2SE._1.Capstone2.entity.MenuItem;
import org.mapstruct.*;

import java.util.List;

@Mapper(componentModel = "spring", uses = {RecipeMapper.class})
public interface MenuItemMapper {

    @Mapping(source = "category.id", target = "categoryId")
    @Mapping(source = "category.name", target = "categoryName")
    MenuItemDTO toDTO(MenuItem menuItem);

    List<MenuItemDTO> toDTOList(List<MenuItem> menuItems);

    @Mapping(target = "category", ignore = true)
    @Mapping(target = "recipes", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    MenuItem toEntity(MenuItemDTO menuItemDTO);

    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    @Mapping(target = "category", ignore = true)
    @Mapping(target = "recipes", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    void updateEntityFromDTO(MenuItemDTO dto, @MappingTarget MenuItem menuItem);
}
