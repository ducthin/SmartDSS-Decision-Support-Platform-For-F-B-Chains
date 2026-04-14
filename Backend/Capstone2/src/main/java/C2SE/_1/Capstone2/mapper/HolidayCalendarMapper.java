package C2SE._1.Capstone2.mapper;

import C2SE._1.Capstone2.dto.HolidayCalendarDTO;
import C2SE._1.Capstone2.entity.HolidayCalendar;
import org.mapstruct.*;

import java.util.List;

@Mapper(componentModel = "spring")
public interface HolidayCalendarMapper {

    @Mapping(source = "holidayType", target = "holidayType", qualifiedByName = "holidayTypeToString")
    HolidayCalendarDTO toDTO(HolidayCalendar holiday);

    List<HolidayCalendarDTO> toDTOList(List<HolidayCalendar> holidays);

    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(source = "holidayType", target = "holidayType", qualifiedByName = "stringToHolidayType")
    HolidayCalendar toEntity(HolidayCalendarDTO dto);

    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(source = "holidayType", target = "holidayType", qualifiedByName = "stringToHolidayType")
    void updateEntityFromDTO(HolidayCalendarDTO dto, @MappingTarget HolidayCalendar holiday);

    @Named("holidayTypeToString")
    default String holidayTypeToString(HolidayCalendar.HolidayType type) {
        return type == null ? null : type.name();
    }

    @Named("stringToHolidayType")
    default HolidayCalendar.HolidayType stringToHolidayType(String type) {
        return type == null ? null : HolidayCalendar.HolidayType.valueOf(type);
    }
}
