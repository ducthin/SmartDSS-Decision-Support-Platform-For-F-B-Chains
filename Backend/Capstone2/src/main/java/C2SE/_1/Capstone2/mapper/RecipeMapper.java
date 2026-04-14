package C2SE._1.Capstone2.mapper;

import C2SE._1.Capstone2.dto.RecipeDTO;
import C2SE._1.Capstone2.entity.Recipe;
import org.mapstruct.*;

import java.util.List;

@Mapper(componentModel = "spring")
public interface RecipeMapper {

    @Mapping(source = "menuItem.id", target = "menuItemId")
    @Mapping(source = "menuItem.name", target = "menuItemName")
    @Mapping(source = "ingredient.id", target = "ingredientId")
    @Mapping(source = "ingredient.name", target = "ingredientName")
    @Mapping(source = "ingredient.unit", target = "ingredientUnit")
    RecipeDTO toDTO(Recipe recipe);

    List<RecipeDTO> toDTOList(List<Recipe> recipes);

    @Mapping(target = "menuItem", ignore = true)
    @Mapping(target = "ingredient", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    Recipe toEntity(RecipeDTO recipeDTO);
}
