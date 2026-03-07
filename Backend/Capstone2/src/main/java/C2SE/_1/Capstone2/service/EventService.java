package C2SE._1.Capstone2.service;

import C2SE._1.Capstone2.dto.EventDTO;
import C2SE._1.Capstone2.dto.PageResponse;
import org.springframework.data.domain.Pageable;

import java.time.LocalDate;
import java.util.List;

public interface EventService {

    PageResponse<EventDTO> getAllEvents(Pageable pageable);

    PageResponse<EventDTO> searchEvents(String keyword, String eventType, Pageable pageable);

    EventDTO getEventById(Long id);

    List<EventDTO> getEventsByDateRange(LocalDate from, LocalDate to);

    List<EventDTO> getActiveEventsByDate(LocalDate date);

    List<EventDTO> getUpcomingEvents();

    EventDTO createEvent(EventDTO dto);

    EventDTO updateEvent(Long id, EventDTO dto);

    void deleteEvent(Long id);
}
