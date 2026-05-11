package C2SE._1.Capstone2.service;

import C2SE._1.Capstone2.dto.HolidayCalendarDTO;

import java.time.LocalDate;
import java.util.List;

public interface HolidayCalendarService {

    List<HolidayCalendarDTO> getAllHolidays();

    HolidayCalendarDTO getHolidayById(Long id);

    List<HolidayCalendarDTO> getHolidaysByDateRange(LocalDate from, LocalDate to);

    List<HolidayCalendarDTO> getHolidaysByMonth(int month, int year);

    List<HolidayCalendarDTO> getUpcomingHolidays();

    /**
     * Get holidays by specific type
     * @param holidayType one of: PUBLIC_HOLIDAY, CULTURAL, RELIGIOUS, SCHOOL, COMPANY, OTHER
     */
    List<HolidayCalendarDTO> getHolidaysByType(String holidayType);

    /**
     * Get all holidays in a specific year
     */
    List<HolidayCalendarDTO> getHolidaysByYear(int year);

    /**
     * Get holiday information for a specific date
     * @return HolidayCalendarDTO if date is a holiday, null otherwise
     */
    HolidayCalendarDTO getHolidayByDate(LocalDate date);

    HolidayCalendarDTO createHoliday(HolidayCalendarDTO dto);

    HolidayCalendarDTO updateHoliday(Long id, HolidayCalendarDTO dto);

    void deleteHoliday(Long id);

    int syncFromCalendarific(int year);

    /**
     * Generate recurring holidays for the next N years
     * @param years number of years to generate (e.g., 5 means next 5 years)
     * @return count of newly created recurring holiday entries
     */
    int generateRecurringHolidays(int years);
}
