package C2SE._1.Capstone2.service.impl;

import C2SE._1.Capstone2.dto.EventDTO;
import C2SE._1.Capstone2.dto.PageResponse;
import C2SE._1.Capstone2.entity.Event;
import C2SE._1.Capstone2.exception.ResourceNotFoundException;
import C2SE._1.Capstone2.mapper.EventMapper;
import C2SE._1.Capstone2.repository.EventRepository;
import C2SE._1.Capstone2.service.EventService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class EventServiceImpl implements EventService {

    private final EventRepository eventRepository;
    private final EventMapper eventMapper;

    @Override
    @Transactional(readOnly = true)
    public PageResponse<EventDTO> getAllEvents(Pageable pageable) {
        Page<Event> page = eventRepository.findAll(pageable);
        return PageResponse.of(page, eventMapper.toDTOList(page.getContent()));
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<EventDTO> searchEvents(String keyword, String eventType, Pageable pageable) {
        Event.EventType type = eventType != null ? Event.EventType.valueOf(eventType) : null;
        Page<Event> page = eventRepository.search(keyword, type, pageable);
        return PageResponse.of(page, eventMapper.toDTOList(page.getContent()));
    }

    @Override
    @Transactional(readOnly = true)
    public EventDTO getEventById(Long id) {
        Event event = eventRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Event", "id", id));
        return eventMapper.toDTO(event);
    }

    @Override
    @Transactional(readOnly = true)
    public List<EventDTO> getEventsByDateRange(LocalDate from, LocalDate to) {
        return eventMapper.toDTOList(eventRepository.findByStartDateBetweenOrderByStartDateAsc(from, to));
    }

    @Override
    @Transactional(readOnly = true)
    public List<EventDTO> getActiveEventsByDate(LocalDate date) {
        return eventMapper.toDTOList(eventRepository.findActiveByDate(date));
    }

    @Override
    @Transactional(readOnly = true)
    public List<EventDTO> getUpcomingEvents() {
        return eventMapper.toDTOList(eventRepository.findUpcoming(LocalDate.now()));
    }

    @Override
    public EventDTO createEvent(EventDTO dto) {
        Event event = eventMapper.toEntity(dto);
        if (event.getActive() == null) event.setActive(true);
        if (event.getExpectedImpact() == null) event.setExpectedImpact(Event.ImpactLevel.MEDIUM);
        return eventMapper.toDTO(eventRepository.save(event));
    }

    @Override
    public EventDTO updateEvent(Long id, EventDTO dto) {
        Event event = eventRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Event", "id", id));
        eventMapper.updateEntityFromDTO(dto, event);
        return eventMapper.toDTO(eventRepository.save(event));
    }

    @Override
    public void deleteEvent(Long id) {
        if (!eventRepository.existsById(id)) {
            throw new ResourceNotFoundException("Event", "id", id);
        }
        eventRepository.deleteById(id);
    }
}
