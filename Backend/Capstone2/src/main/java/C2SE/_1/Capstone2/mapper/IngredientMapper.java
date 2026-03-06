package C2SE._1.Capstone2.mapper;

import C2SE._1.Capstone2.dto.IngredientDTO;
import C2SE._1.Capstone2.entity.Ingredient;
import org.mapstruct.*;

import java.util.List;

@Mapper(componentModel = "spring")
public interface IngredientMapper {

    IngredientDTO toDTO(Ingredient ingredient);

    List<IngredientDTO> toDTOList(List<Ingredient> ingredients);

    @Mapping(target = "recipes", ignore = true)
    @Mapping(target = "inventory", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    Ingredient toEntity(IngredientDTO ingredientDTO);

    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    @Mapping(target = "recipes", ignore = true)
    @Mapping(target = "inventory", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    void updateEntityFromDTO(IngredientDTO dto, @MappingTarget Ingredient ingredient);
}
