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

    HolidayCalendarDTO createHoliday(HolidayCalendarDTO dto);

    HolidayCalendarDTO updateHoliday(Long id, HolidayCalendarDTO dto);

    void deleteHoliday(Long id);

    int syncFromNagerDate(int year);

    int seedVietnameseHolidays(int year);

    int syncFromGoogleCalendar(int year);
}
