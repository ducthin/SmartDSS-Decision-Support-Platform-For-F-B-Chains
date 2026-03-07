package C2SE._1.Capstone2.service.impl;

import C2SE._1.Capstone2.dto.HolidayCalendarDTO;
import C2SE._1.Capstone2.entity.HolidayCalendar;
import C2SE._1.Capstone2.exception.ResourceNotFoundException;
import C2SE._1.Capstone2.mapper.HolidayCalendarMapper;
import C2SE._1.Capstone2.repository.HolidayCalendarRepository;
import C2SE._1.Capstone2.service.HolidayCalendarService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Transactional
@Slf4j
public class HolidayCalendarServiceImpl implements HolidayCalendarService {

    private final HolidayCalendarRepository holidayCalendarRepository;
    private final HolidayCalendarMapper holidayCalendarMapper;

    @Value("${google.calendar.api.key}")
    private String googleApiKey;

    @Value("${google.calendar.id:vi.vietnamese%23holiday%40group.v.calendar.google.com}")
    private String googleCalendarId;

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
    public HolidayCalendarDTO createHoliday(HolidayCalendarDTO dto) {
        HolidayCalendar holiday = holidayCalendarMapper.toEntity(dto);
        if (holiday.getRecurring() == null) holiday.setRecurring(false);
        return holidayCalendarMapper.toDTO(holidayCalendarRepository.save(holiday));
    }

    @Override
    public HolidayCalendarDTO updateHoliday(Long id, HolidayCalendarDTO dto) {
        HolidayCalendar holiday = holidayCalendarRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("HolidayCalendar", "id", id));
        holidayCalendarMapper.updateEntityFromDTO(dto, holiday);
        return holidayCalendarMapper.toDTO(holidayCalendarRepository.save(holiday));
    }

    @Override
    public void deleteHoliday(Long id) {
        if (!holidayCalendarRepository.existsById(id)) {
            throw new ResourceNotFoundException("HolidayCalendar", "id", id);
        }
        holidayCalendarRepository.deleteById(id);
    }

    @Override
    public int syncFromNagerDate(int year) {
        try {
            String url = "https://date.nager.at/api/v3/PublicHolidays/" + year + "/VN";

            String json = RestClient.create()
                    .get()
                    .uri(url)
                    .retrieve()
                    .body(String.class);

            ObjectMapper objectMapper = new ObjectMapper();
            JsonNode holidays = objectMapper.readTree(json);

            int count = 0;
            for (JsonNode node : holidays) {
                LocalDate date = LocalDate.parse(node.path("date").asText());
                String name = node.path("localName").asText();
                if (name.isBlank()) {
                    name = node.path("name").asText();
                }

                if (holidayCalendarRepository.existsByHolidayDateAndName(date, name)) {
                    continue;
                }

                HolidayCalendar holiday = HolidayCalendar.builder()
                        .name(name)
                        .holidayDate(date)
                        .holidayType(HolidayCalendar.HolidayType.PUBLIC_HOLIDAY)
                        .recurring(true)
                        .description(node.path("name").asText())
                        .build();
                holidayCalendarRepository.save(holiday);
                count++;
            }

            log.info("Synced {} new holidays from Nager.Date for year {}", count, year);
            return count;
        } catch (Exception e) {
            log.error("Failed to sync holidays from Nager.Date: {}", e.getMessage());
            throw new RuntimeException("Không thể đồng bộ ngày lễ từ Nager.Date: " + e.getMessage());
        }
    }

    @Override
    public int seedVietnameseHolidays(int year) {
        List<HolidayEntry> entries = new ArrayList<>();

        // ===== NGÀY LỄ CỐ ĐỊNH (Dương lịch) =====
        entries.add(new HolidayEntry(LocalDate.of(year, 1, 1), "Tết Dương lịch", HolidayCalendar.HolidayType.PUBLIC_HOLIDAY, "New Year's Day"));
        entries.add(new HolidayEntry(LocalDate.of(year, 2, 14), "Ngày lễ Tình nhân (Valentine)", HolidayCalendar.HolidayType.CULTURAL, "Ảnh hưởng lớn đến doanh thu F&B"));
        entries.add(new HolidayEntry(LocalDate.of(year, 3, 8), "Ngày Quốc tế Phụ nữ", HolidayCalendar.HolidayType.CULTURAL, "International Women's Day"));
        entries.add(new HolidayEntry(LocalDate.of(year, 4, 30), "Ngày Giải phóng miền Nam", HolidayCalendar.HolidayType.PUBLIC_HOLIDAY, "Reunification Day"));
        entries.add(new HolidayEntry(LocalDate.of(year, 5, 1), "Ngày Quốc tế Lao động", HolidayCalendar.HolidayType.PUBLIC_HOLIDAY, "International Labour Day"));
        entries.add(new HolidayEntry(LocalDate.of(year, 6, 1), "Ngày Quốc tế Thiếu nhi", HolidayCalendar.HolidayType.CULTURAL, "International Children's Day"));
        entries.add(new HolidayEntry(LocalDate.of(year, 6, 28), "Ngày Gia đình Việt Nam", HolidayCalendar.HolidayType.CULTURAL, "Vietnam Family Day"));
        entries.add(new HolidayEntry(LocalDate.of(year, 9, 2), "Quốc khánh Việt Nam", HolidayCalendar.HolidayType.PUBLIC_HOLIDAY, "Vietnam National Day"));
        entries.add(new HolidayEntry(LocalDate.of(year, 10, 20), "Ngày Phụ nữ Việt Nam", HolidayCalendar.HolidayType.CULTURAL, "Vietnamese Women's Day - Ảnh hưởng lớn đến doanh thu F&B"));
        entries.add(new HolidayEntry(LocalDate.of(year, 10, 31), "Halloween", HolidayCalendar.HolidayType.CULTURAL, "Xu hướng phổ biến tại quán café, nhà hàng"));
        entries.add(new HolidayEntry(LocalDate.of(year, 11, 20), "Ngày Nhà giáo Việt Nam", HolidayCalendar.HolidayType.CULTURAL, "Vietnamese Teachers' Day"));
        entries.add(new HolidayEntry(LocalDate.of(year, 12, 24), "Đêm Giáng sinh (Noel)", HolidayCalendar.HolidayType.CULTURAL, "Christmas Eve - Ảnh hưởng lớn đến F&B"));
        entries.add(new HolidayEntry(LocalDate.of(year, 12, 25), "Giáng sinh (Noel)", HolidayCalendar.HolidayType.CULTURAL, "Christmas Day"));
        entries.add(new HolidayEntry(LocalDate.of(year, 12, 31), "Giao thừa Dương lịch", HolidayCalendar.HolidayType.CULTURAL, "New Year's Eve - Ảnh hưởng lớn đến doanh thu F&B"));

        // ===== NGÀY LỄ ÂM LỊCH (pre-computed cho 2024–2028) =====
        Map<Integer, List<HolidayEntry>> lunarHolidays = Map.of(
            2024, List.of(
                new HolidayEntry(LocalDate.of(2024, 2, 10), "Tết Nguyên Đán", HolidayCalendar.HolidayType.PUBLIC_HOLIDAY, "Mùng 1 Tết Giáp Thìn"),
                new HolidayEntry(LocalDate.of(2024, 2, 11), "Mùng 2 Tết Nguyên Đán", HolidayCalendar.HolidayType.PUBLIC_HOLIDAY, "Mùng 2 Tết"),
                new HolidayEntry(LocalDate.of(2024, 2, 12), "Mùng 3 Tết Nguyên Đán", HolidayCalendar.HolidayType.PUBLIC_HOLIDAY, "Mùng 3 Tết"),
                new HolidayEntry(LocalDate.of(2024, 2, 24), "Rằm tháng Giêng", HolidayCalendar.HolidayType.CULTURAL, "Tết Nguyên tiêu - 15/1 Âm lịch"),
                new HolidayEntry(LocalDate.of(2024, 4, 18), "Giỗ Tổ Hùng Vương", HolidayCalendar.HolidayType.PUBLIC_HOLIDAY, "10/3 Âm lịch"),
                new HolidayEntry(LocalDate.of(2024, 6, 10), "Tết Đoan Ngọ", HolidayCalendar.HolidayType.CULTURAL, "5/5 Âm lịch - Diệt sâu bọ"),
                new HolidayEntry(LocalDate.of(2024, 8, 18), "Vu Lan", HolidayCalendar.HolidayType.RELIGIOUS, "15/7 Âm lịch - Lễ Vu Lan báo hiếu"),
                new HolidayEntry(LocalDate.of(2024, 9, 17), "Tết Trung Thu", HolidayCalendar.HolidayType.CULTURAL, "15/8 Âm lịch - Ảnh hưởng lớn đến doanh thu F&B")
            ),
            2025, List.of(
                new HolidayEntry(LocalDate.of(2025, 1, 29), "Tết Nguyên Đán", HolidayCalendar.HolidayType.PUBLIC_HOLIDAY, "Mùng 1 Tết Ất Tỵ"),
                new HolidayEntry(LocalDate.of(2025, 1, 30), "Mùng 2 Tết Nguyên Đán", HolidayCalendar.HolidayType.PUBLIC_HOLIDAY, "Mùng 2 Tết"),
                new HolidayEntry(LocalDate.of(2025, 1, 31), "Mùng 3 Tết Nguyên Đán", HolidayCalendar.HolidayType.PUBLIC_HOLIDAY, "Mùng 3 Tết"),
                new HolidayEntry(LocalDate.of(2025, 2, 12), "Rằm tháng Giêng", HolidayCalendar.HolidayType.CULTURAL, "Tết Nguyên tiêu - 15/1 Âm lịch"),
                new HolidayEntry(LocalDate.of(2025, 4, 7), "Giỗ Tổ Hùng Vương", HolidayCalendar.HolidayType.PUBLIC_HOLIDAY, "10/3 Âm lịch"),
                new HolidayEntry(LocalDate.of(2025, 5, 31), "Tết Đoan Ngọ", HolidayCalendar.HolidayType.CULTURAL, "5/5 Âm lịch - Diệt sâu bọ"),
                new HolidayEntry(LocalDate.of(2025, 8, 10), "Vu Lan", HolidayCalendar.HolidayType.RELIGIOUS, "15/7 Âm lịch - Lễ Vu Lan báo hiếu"),
                new HolidayEntry(LocalDate.of(2025, 10, 6), "Tết Trung Thu", HolidayCalendar.HolidayType.CULTURAL, "15/8 Âm lịch - Ảnh hưởng lớn đến doanh thu F&B")
            ),
            2026, List.of(
                new HolidayEntry(LocalDate.of(2026, 2, 17), "Tết Nguyên Đán", HolidayCalendar.HolidayType.PUBLIC_HOLIDAY, "Mùng 1 Tết Bính Ngọ"),
                new HolidayEntry(LocalDate.of(2026, 2, 18), "Mùng 2 Tết Nguyên Đán", HolidayCalendar.HolidayType.PUBLIC_HOLIDAY, "Mùng 2 Tết"),
                new HolidayEntry(LocalDate.of(2026, 2, 19), "Mùng 3 Tết Nguyên Đán", HolidayCalendar.HolidayType.PUBLIC_HOLIDAY, "Mùng 3 Tết"),
                new HolidayEntry(LocalDate.of(2026, 3, 3), "Rằm tháng Giêng", HolidayCalendar.HolidayType.CULTURAL, "Tết Nguyên tiêu - 15/1 Âm lịch"),
                new HolidayEntry(LocalDate.of(2026, 4, 26), "Giỗ Tổ Hùng Vương", HolidayCalendar.HolidayType.PUBLIC_HOLIDAY, "10/3 Âm lịch"),
                new HolidayEntry(LocalDate.of(2026, 6, 19), "Tết Đoan Ngọ", HolidayCalendar.HolidayType.CULTURAL, "5/5 Âm lịch - Diệt sâu bọ"),
                new HolidayEntry(LocalDate.of(2026, 8, 28), "Vu Lan", HolidayCalendar.HolidayType.RELIGIOUS, "15/7 Âm lịch - Lễ Vu Lan báo hiếu"),
                new HolidayEntry(LocalDate.of(2026, 9, 27), "Tết Trung Thu", HolidayCalendar.HolidayType.CULTURAL, "15/8 Âm lịch - Ảnh hưởng lớn đến doanh thu F&B")
            ),
            2027, List.of(
                new HolidayEntry(LocalDate.of(2027, 2, 6), "Tết Nguyên Đán", HolidayCalendar.HolidayType.PUBLIC_HOLIDAY, "Mùng 1 Tết Đinh Mùi"),
                new HolidayEntry(LocalDate.of(2027, 2, 7), "Mùng 2 Tết Nguyên Đán", HolidayCalendar.HolidayType.PUBLIC_HOLIDAY, "Mùng 2 Tết"),
                new HolidayEntry(LocalDate.of(2027, 2, 8), "Mùng 3 Tết Nguyên Đán", HolidayCalendar.HolidayType.PUBLIC_HOLIDAY, "Mùng 3 Tết"),
                new HolidayEntry(LocalDate.of(2027, 2, 20), "Rằm tháng Giêng", HolidayCalendar.HolidayType.CULTURAL, "Tết Nguyên tiêu - 15/1 Âm lịch"),
                new HolidayEntry(LocalDate.of(2027, 4, 15), "Giỗ Tổ Hùng Vương", HolidayCalendar.HolidayType.PUBLIC_HOLIDAY, "10/3 Âm lịch"),
                new HolidayEntry(LocalDate.of(2027, 6, 8), "Tết Đoan Ngọ", HolidayCalendar.HolidayType.CULTURAL, "5/5 Âm lịch - Diệt sâu bọ"),
                new HolidayEntry(LocalDate.of(2027, 8, 17), "Vu Lan", HolidayCalendar.HolidayType.RELIGIOUS, "15/7 Âm lịch - Lễ Vu Lan báo hiếu"),
                new HolidayEntry(LocalDate.of(2027, 10, 15), "Tết Trung Thu", HolidayCalendar.HolidayType.CULTURAL, "15/8 Âm lịch - Ảnh hưởng lớn đến doanh thu F&B")
            ),
            2028, List.of(
                new HolidayEntry(LocalDate.of(2028, 1, 26), "Tết Nguyên Đán", HolidayCalendar.HolidayType.PUBLIC_HOLIDAY, "Mùng 1 Tết Mậu Thân"),
                new HolidayEntry(LocalDate.of(2028, 1, 27), "Mùng 2 Tết Nguyên Đán", HolidayCalendar.HolidayType.PUBLIC_HOLIDAY, "Mùng 2 Tết"),
                new HolidayEntry(LocalDate.of(2028, 1, 28), "Mùng 3 Tết Nguyên Đán", HolidayCalendar.HolidayType.PUBLIC_HOLIDAY, "Mùng 3 Tết"),
                new HolidayEntry(LocalDate.of(2028, 2, 9), "Rằm tháng Giêng", HolidayCalendar.HolidayType.CULTURAL, "Tết Nguyên tiêu - 15/1 Âm lịch"),
                new HolidayEntry(LocalDate.of(2028, 4, 4), "Giỗ Tổ Hùng Vương", HolidayCalendar.HolidayType.PUBLIC_HOLIDAY, "10/3 Âm lịch"),
                new HolidayEntry(LocalDate.of(2028, 5, 28), "Tết Đoan Ngọ", HolidayCalendar.HolidayType.CULTURAL, "5/5 Âm lịch - Diệt sâu bọ"),
                new HolidayEntry(LocalDate.of(2028, 8, 5), "Vu Lan", HolidayCalendar.HolidayType.RELIGIOUS, "15/7 Âm lịch - Lễ Vu Lan báo hiếu"),
                new HolidayEntry(LocalDate.of(2028, 10, 3), "Tết Trung Thu", HolidayCalendar.HolidayType.CULTURAL, "15/8 Âm lịch - Ảnh hưởng lớn đến doanh thu F&B")
            )
        );

        // Thêm ngày lễ âm lịch nếu có dữ liệu cho năm này
        if (lunarHolidays.containsKey(year)) {
            entries.addAll(lunarHolidays.get(year));
        } else {
            log.warn("Không có dữ liệu ngày lễ âm lịch cho năm {}. Chỉ seed ngày lễ dương lịch.", year);
        }

        int count = 0;
        for (HolidayEntry entry : entries) {
            if (holidayCalendarRepository.existsByHolidayDateAndName(entry.date, entry.name)) {
                continue;
            }
            HolidayCalendar holiday = HolidayCalendar.builder()
                    .name(entry.name)
                    .holidayDate(entry.date)
                    .holidayType(entry.type)
                    .recurring(true)
                    .description(entry.description)
                    .build();
            holidayCalendarRepository.save(holiday);
            count++;
        }

        log.info("Seeded {} new Vietnamese holidays for year {}", count, year);
        return count;
    }

    @Override
    public int syncFromGoogleCalendar(int year) {
        try {
            String timeMin = year + "-01-01T00:00:00Z";
            String timeMax = year + "-12-31T23:59:59Z";

            String url = "https://www.googleapis.com/calendar/v3/calendars/" + googleCalendarId
                    + "/events?key=" + googleApiKey
                    + "&timeMin=" + timeMin
                    + "&timeMax=" + timeMax
                    + "&singleEvents=true"
                    + "&orderBy=startTime"
                    + "&maxResults=100";

            String json = RestClient.create()
                    .get()
                    .uri(java.net.URI.create(url))
                    .retrieve()
                    .body(String.class);

            ObjectMapper objectMapper = new ObjectMapper();
            JsonNode root = objectMapper.readTree(json);
            JsonNode items = root.path("items");

            int count = 0;
            for (JsonNode item : items) {
                String summary = item.path("summary").asText("");
                if (summary.isBlank()) continue;

                // Bỏ qua "Ngày làm việc" (ngày đi làm bù, không phải ngày lễ)
                if (summary.toLowerCase().contains("ngày làm việc")) continue;

                String rawDescription = item.path("description").asText("");

                // Bỏ qua "Ngày lễ kỷ niệm" (observances) - không phải ngày lễ chính thức
                if (rawDescription.contains("Ngày lễ kỷ niệm")) continue;

                // Google Calendar trả về date (all-day) hoặc dateTime
                JsonNode startNode = item.path("start");
                String dateStr = startNode.has("date")
                        ? startNode.path("date").asText()
                        : startNode.path("dateTime").asText().substring(0, 10);
                LocalDate date = LocalDate.parse(dateStr);

                if (holidayCalendarRepository.existsByHolidayDateAndName(date, summary)) {
                    continue;
                }

                // Dọn description: chỉ lấy dòng đầu, bỏ text hướng dẫn Google
                String description = rawDescription.lines().findFirst().orElse("").trim();
                if (description.startsWith("Để ẩn")) description = "";

                HolidayCalendar.HolidayType type = classifyHolidayType(summary, description);

                HolidayCalendar holiday = HolidayCalendar.builder()
                        .name(summary)
                        .holidayDate(date)
                        .holidayType(type)
                        .recurring(true)
                        .description(description.isBlank() ? "Ngày lễ chính thức" : description)
                        .build();
                holidayCalendarRepository.save(holiday);
                count++;
            }

            log.info("Synced {} new holidays from Google Calendar for year {}", count, year);
            return count;
        } catch (Exception e) {
            log.error("Failed to sync holidays from Google Calendar: {}", e.getMessage());
            throw new RuntimeException("Không thể đồng bộ ngày lễ từ Google Calendar: " + e.getMessage());
        }
    }

    private HolidayCalendar.HolidayType classifyHolidayType(String name, String description) {
        String lower = (name + " " + description).toLowerCase();
        if (lower.contains("public holiday") || lower.contains("national")
                || lower.contains("quốc khánh") || lower.contains("giải phóng")
                || lower.contains("lao động") || lower.contains("tết nguyên đán")
                || lower.contains("hùng vương")) {
            return HolidayCalendar.HolidayType.PUBLIC_HOLIDAY;
        }
        if (lower.contains("observance") || lower.contains("religious")
                || lower.contains("vu lan") || lower.contains("phật")) {
            return HolidayCalendar.HolidayType.RELIGIOUS;
        }
        return HolidayCalendar.HolidayType.CULTURAL;
    }

    private record HolidayEntry(LocalDate date, String name, HolidayCalendar.HolidayType type, String description) {}
}
