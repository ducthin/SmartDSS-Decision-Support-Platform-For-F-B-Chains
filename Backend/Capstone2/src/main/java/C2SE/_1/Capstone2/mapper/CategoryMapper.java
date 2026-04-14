package C2SE._1.Capstone2.mapper;

import C2SE._1.Capstone2.dto.CategoryDTO;
import C2SE._1.Capstone2.entity.Category;
import org.mapstruct.*;

import java.util.List;

@Mapper(componentModel = "spring")
public interface CategoryMapper {

    CategoryDTO toDTO(Category category);

    List<CategoryDTO> toDTOList(List<Category> categories);

    @Mapping(target = "menuItems", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    Category toEntity(CategoryDTO categoryDTO);

    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    @Mapping(target = "menuItems", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    void updateEntityFromDTO(CategoryDTO dto, @MappingTarget Category category);
}
