package C2SE._1.Capstone2.mapper;

import C2SE._1.Capstone2.dto.EventDTO;
import C2SE._1.Capstone2.entity.Event;
import org.mapstruct.*;

import java.util.List;

@Mapper(componentModel = "spring")
public interface EventMapper {

    @Mapping(source = "eventType", target = "eventType", qualifiedByName = "eventTypeToString")
    @Mapping(source = "expectedImpact", target = "expectedImpact", qualifiedByName = "impactToString")
    EventDTO toDTO(Event event);

    List<EventDTO> toDTOList(List<Event> events);

    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(source = "eventType", target = "eventType", qualifiedByName = "stringToEventType")
    @Mapping(source = "expectedImpact", target = "expectedImpact", qualifiedByName = "stringToImpact")
    Event toEntity(EventDTO dto);

    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(source = "eventType", target = "eventType", qualifiedByName = "stringToEventType")
    @Mapping(source = "expectedImpact", target = "expectedImpact", qualifiedByName = "stringToImpact")
    void updateEntityFromDTO(EventDTO dto, @MappingTarget Event event);

    @Named("eventTypeToString")
    default String eventTypeToString(Event.EventType type) {
        return type == null ? null : type.name();
    }

    @Named("impactToString")
    default String impactToString(Event.ImpactLevel level) {
        return level == null ? null : level.name();
    }

    @Named("stringToEventType")
    default Event.EventType stringToEventType(String type) {
        return type == null ? null : Event.EventType.valueOf(type);
    }

    @Named("stringToImpact")
    default Event.ImpactLevel stringToImpact(String level) {
        return level == null ? null : Event.ImpactLevel.valueOf(level);
    }
}
