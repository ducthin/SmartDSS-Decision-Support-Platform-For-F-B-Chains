package C2SE._1.Capstone2.repository;

import C2SE._1.Capstone2.entity.HolidayCalendar;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface HolidayCalendarRepository extends JpaRepository<HolidayCalendar, Long> {

    List<HolidayCalendar> findByHolidayDateBetweenOrderByHolidayDateAsc(LocalDate from, LocalDate to);

    Optional<HolidayCalendar> findByHolidayDate(LocalDate date);

    @Query("SELECT h FROM HolidayCalendar h WHERE h.holidayDate >= :today ORDER BY h.holidayDate ASC")
    List<HolidayCalendar> findUpcoming(@Param("today") LocalDate today);

    @Query("SELECT h FROM HolidayCalendar h WHERE MONTH(h.holidayDate) = :month AND YEAR(h.holidayDate) = :year ORDER BY h.holidayDate ASC")
    List<HolidayCalendar> findByMonth(@Param("month") int month, @Param("year") int year);

    @Query("SELECT h FROM HolidayCalendar h WHERE YEAR(h.holidayDate) = :year ORDER BY h.holidayDate ASC")
    List<HolidayCalendar> findByYear(@Param("year") int year);

    List<HolidayCalendar> findByHolidayTypeOrderByHolidayDateAsc(String holidayType);

    boolean existsByHolidayDateAndName(LocalDate holidayDate, String name);

    /** Có ít nhất một ngày lễ trong lịch hệ thống trùng {@code date} (cho AI dự báo). */
    boolean existsByHolidayDate(LocalDate holidayDate);

    /**
     * Find all holidays marked as recurring (for auto-generation)
     */
    List<HolidayCalendar> findByRecurringTrue();
}
