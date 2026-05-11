package C2SE._1.Capstone2.service.impl;

import C2SE._1.Capstone2.dto.HolidayCalendarDTO;
import C2SE._1.Capstone2.entity.HolidayCalendar;
import C2SE._1.Capstone2.exception.ResourceNotFoundException;
import C2SE._1.Capstone2.mapper.HolidayCalendarMapper;
import C2SE._1.Capstone2.repository.HolidayCalendarRepository;
import C2SE._1.Capstone2.service.CustomerNotificationService;
import C2SE._1.Capstone2.service.HolidayCalendarService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
@Slf4j
public class HolidayCalendarServiceImpl implements HolidayCalendarService {

    private final HolidayCalendarRepository holidayCalendarRepository;
    private final HolidayCalendarMapper holidayCalendarMapper;
    private final CustomerNotificationService customerNotificationService;

    @Value("${calendarific.api.key}")
    private String calendarificApiKey;

    @Override
    @Transactional(readOnly = true)
    public List<HolidayCalendarDTO> getAllHolidays() {
        return holidayCalendarMapper.toDTOList(holidayCalendarRepository.findAll());
    }

    @Override
    @Transactional(readOnly = true)
    public HolidayCalendarDTO getHolidayById(Long id) {
        HolidayCalendar holiday = holidayCalendarRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("HolidayCalendar", "id", id));
        return holidayCalendarMapper.toDTO(holiday);
    }

    @Override
    @Transactional(readOnly = true)
    public List<HolidayCalendarDTO> getHolidaysByDateRange(LocalDate from, LocalDate to) {
        return holidayCalendarMapper.toDTOList(
                holidayCalendarRepository.findByHolidayDateBetweenOrderByHolidayDateAsc(from, to));
    }

    @Override
    @Transactional(readOnly = true)
    public List<HolidayCalendarDTO> getHolidaysByMonth(int month, int year) {
        return holidayCalendarMapper.toDTOList(holidayCalendarRepository.findByMonth(month, year));
    }

    @Override
    @Transactional(readOnly = true)
    public List<HolidayCalendarDTO> getUpcomingHolidays() {
        return holidayCalendarMapper.toDTOList(holidayCalendarRepository.findUpcoming(LocalDate.now()));
    }

    @Override
    @Transactional(readOnly = true)
    public List<HolidayCalendarDTO> getHolidaysByType(String holidayType) {
        return holidayCalendarMapper.toDTOList(
                holidayCalendarRepository.findByHolidayTypeOrderByHolidayDateAsc(holidayType));
    }

    @Override
    @Transactional(readOnly = true)
    public List<HolidayCalendarDTO> getHolidaysByYear(int year) {
        return holidayCalendarMapper.toDTOList(holidayCalendarRepository.findByYear(year));
    }

    @Override
    @Transactional(readOnly = true)
    public HolidayCalendarDTO getHolidayByDate(LocalDate date) {
        return holidayCalendarRepository.findByHolidayDate(date)
                .map(holidayCalendarMapper::toDTO)
                .orElse(null);
    }

    @Override
    public HolidayCalendarDTO createHoliday(HolidayCalendarDTO dto) {
        HolidayCalendar holiday = holidayCalendarMapper.toEntity(dto);
        if (holiday.getRecurring() == null) holiday.setRecurring(false);
        if (holiday.getDiscountPercent() == null) holiday.setDiscountPercent(BigDecimal.ZERO);
        HolidayCalendar savedHoliday = holidayCalendarRepository.save(holiday);
        customerNotificationService.notifyHolidayPromotion(savedHoliday);
        return holidayCalendarMapper.toDTO(savedHoliday);
    }

    @Override
    public HolidayCalendarDTO updateHoliday(Long id, HolidayCalendarDTO dto) {
        HolidayCalendar holiday = holidayCalendarRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("HolidayCalendar", "id", id));
        holidayCalendarMapper.updateEntityFromDTO(dto, holiday);
        HolidayCalendar savedHoliday = holidayCalendarRepository.save(holiday);
        customerNotificationService.notifyHolidayPromotion(savedHoliday);
        return holidayCalendarMapper.toDTO(savedHoliday);
    }

    @Override
    public void deleteHoliday(Long id) {
        if (!holidayCalendarRepository.existsById(id)) {
            throw new ResourceNotFoundException("HolidayCalendar", "id", id);
        }
        holidayCalendarRepository.deleteById(id);
    }

    @Override
    public int syncFromCalendarific(int year) {
        try {
            String url = "https://calendarific.com/api/v2/holidays?api_key=" + calendarificApiKey
                    + "&country=VN&year=" + year;

            String json = RestClient.create()
                    .get()
                    .uri(java.net.URI.create(url))
                    .retrieve()
                    .body(String.class);

            ObjectMapper objectMapper = new ObjectMapper();
            JsonNode root = objectMapper.readTree(json);
            JsonNode holidays = root.path("response").path("holidays");

            int count = 0;
            for (JsonNode node : holidays) {
                String name = node.path("name").asText("");
                if (name.isBlank()) continue;

                JsonNode dateNode = node.path("date").path("iso");
                String isoDate = dateNode.asText("");
                if (isoDate.length() < 10) continue;
                LocalDate date = LocalDate.parse(isoDate.substring(0, 10));

                if (holidayCalendarRepository.existsByHolidayDateAndName(date, name)) {
                    continue;
                }

                String description = node.path("description").asText("");

                // Lấy type từ Calendarific (mảng type[])
                JsonNode typeArray = node.path("type");
                HolidayCalendar.HolidayType holidayType = classifyFromCalendarific(typeArray);

                HolidayCalendar holiday = HolidayCalendar.builder()
                        .name(name)
                        .holidayDate(date)
                        .holidayType(holidayType)
                        .recurring(true)
                        .description(description.isBlank() ? "Ngày lễ" : description)
                    .discountPercent(BigDecimal.ZERO)
                        .build();
                holidayCalendarRepository.save(holiday);
                count++;
            }

            log.info("Synced {} new holidays from Calendarific for year {}", count, year);
            return count;
        } catch (Exception e) {
            log.error("Failed to sync holidays from Calendarific: {}", e.getMessage());
            throw new RuntimeException("Không thể đồng bộ ngày lễ từ Calendarific: " + e.getMessage());
        }
    }

    private HolidayCalendar.HolidayType classifyFromCalendarific(JsonNode typeArray) {
        if (typeArray != null && typeArray.isArray()) {
            for (JsonNode t : typeArray) {
                String val = t.asText("").toLowerCase();
                if (val.contains("national")) return HolidayCalendar.HolidayType.PUBLIC_HOLIDAY;
            }
            for (JsonNode t : typeArray) {
                String val = t.asText("").toLowerCase();
                if (val.contains("religious")) return HolidayCalendar.HolidayType.RELIGIOUS;
            }
        }
        return HolidayCalendar.HolidayType.CULTURAL;
    }

    @Override
    public int generateRecurringHolidays(int years) {
        int currentYear = LocalDate.now().getYear();
        int count = 0;

        // Get all recurring holidays with non-null dates
        List<HolidayCalendar> recurringHolidays = holidayCalendarRepository.findByRecurringTrue();

        for (HolidayCalendar original : recurringHolidays) {
            if (original.getHolidayDate() == null) {
                continue;
            }

            LocalDate originalDate = original.getHolidayDate();
            int dayOfMonth = originalDate.getDayOfMonth();
            int monthValue = originalDate.getMonthValue();

            // Generate for the next N years
            for (int year = currentYear + 1; year <= currentYear + years; year++) {
                LocalDate newDate;
                try {
                    // Try to create date on same month/day
                    newDate = LocalDate.of(year, monthValue, dayOfMonth);
                } catch (Exception e) {
                    // Handle edge cases (e.g., Feb 29 in non-leap years)
                    log.warn("Cannot create recurring holiday {} for year {} on {}/{}", 
                            original.getName(), year, monthValue, dayOfMonth);
                    continue;
                }

                // Skip if this holiday already exists
                if (holidayCalendarRepository.existsByHolidayDateAndName(newDate, original.getName())) {
                    continue;
                }

                // Create new holiday instance from original
                HolidayCalendar newHoliday = HolidayCalendar.builder()
                        .name(original.getName())
                        .holidayDate(newDate)
                        .holidayType(original.getHolidayType())
                        .recurring(true)
                        .description(original.getDescription())
                        .discountPercent(original.getDiscountPercent() != null ? original.getDiscountPercent() : BigDecimal.ZERO)
                        .openOnHoliday(original.getOpenOnHoliday())
                        .overrideStartTime(original.getOverrideStartTime())
                        .overrideEndTime(original.getOverrideEndTime())
                        .specialNotes(original.getSpecialNotes())
                        .build();

                holidayCalendarRepository.save(newHoliday);
                count++;
                log.debug("Generated recurring holiday: {} on {}", original.getName(), newDate);
            }
        }

        log.info("Generated {} new recurring holiday instances for {} years", count, years);
        return count;
    }
}

