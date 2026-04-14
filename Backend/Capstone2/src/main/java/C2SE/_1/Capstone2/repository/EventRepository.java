package C2SE._1.Capstone2.repository;

import C2SE._1.Capstone2.entity.Event;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface EventRepository extends JpaRepository<Event, Long> {

    List<Event> findByStartDateBetweenOrderByStartDateAsc(LocalDate from, LocalDate to);

    @Query("SELECT e FROM Event e WHERE e.active = true AND e.startDate <= :date AND e.endDate >= :date")
    List<Event> findActiveByDate(@Param("date") LocalDate date);

     @Query("SELECT e FROM Event e WHERE e.active = true AND e.startDate <= :toDate AND e.endDate >= :fromDate")
     List<Event> findActiveOverlappingDateRange(@Param("fromDate") LocalDate fromDate,
                                                          @Param("toDate") LocalDate toDate);

    @Query("SELECT e FROM Event e WHERE e.active = true AND e.endDate >= :today ORDER BY e.startDate ASC")
    List<Event> findUpcoming(@Param("today") LocalDate today);

    @Query("SELECT e FROM Event e WHERE "
         + "(:keyword IS NULL OR LOWER(e.name) LIKE LOWER(CONCAT('%', :keyword, '%'))) "
         + "AND (:eventType IS NULL OR e.eventType = :eventType)")
    Page<Event> search(@Param("keyword") String keyword,
                       @Param("eventType") Event.EventType eventType,
                       Pageable pageable);
}
