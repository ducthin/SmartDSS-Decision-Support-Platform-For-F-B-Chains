package C2SE._1.Capstone2.mapper;

import C2SE._1.Capstone2.dto.DiningTableDTO;
import C2SE._1.Capstone2.entity.DiningTable;
import org.mapstruct.*;

import java.util.List;

@Mapper(componentModel = "spring")
public interface DiningTableMapper {

    DiningTableDTO toDTO(DiningTable entity);

    List<DiningTableDTO> toDTOList(List<DiningTable> entities);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "qrToken", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    DiningTable toEntity(DiningTableDTO dto);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "qrToken", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    void updateEntityFromDTO(DiningTableDTO dto, @MappingTarget DiningTable entity);
}
