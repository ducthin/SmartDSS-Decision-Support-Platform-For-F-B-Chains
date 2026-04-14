package C2SE._1.Capstone2.mapper;

import C2SE._1.Capstone2.dto.MenuItemDTO;
import C2SE._1.Capstone2.entity.MenuItem;
import org.mapstruct.*;

import java.util.List;

@Mapper(componentModel = "spring", uses = {RecipeMapper.class})
public interface MenuItemMapper {

    @Mapping(source = "category.id", target = "categoryId")
    @Mapping(source = "category.name", target = "categoryName")
    @Mapping(target = "drinkSizes", ignore = true)
    @Mapping(target = "drinkToppings", ignore = true)
    MenuItemDTO toDTO(MenuItem menuItem);

    List<MenuItemDTO> toDTOList(List<MenuItem> menuItems);

    @Mapping(target = "category", ignore = true)
    @Mapping(target = "recipes", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "drinkSizesJson", ignore = true)
    @Mapping(target = "drinkToppingsJson", ignore = true)
    @Mapping(target = "drink", source = "drink", defaultExpression = "java(Boolean.FALSE)")
    @Mapping(target = "badgeNew", source = "badgeNew", defaultExpression = "java(Boolean.FALSE)")
    @Mapping(target = "badgeBestSeller", source = "badgeBestSeller", defaultExpression = "java(Boolean.FALSE)")
    MenuItem toEntity(MenuItemDTO menuItemDTO);

    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    @Mapping(target = "category", ignore = true)
    @Mapping(target = "recipes", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "drinkSizesJson", ignore = true)
    @Mapping(target = "drinkToppingsJson", ignore = true)
    void updateEntityFromDTO(MenuItemDTO dto, @MappingTarget MenuItem menuItem);
}
