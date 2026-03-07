package C2SE._1.Capstone2.controller;

import C2SE._1.Capstone2.dto.ApiResponse;
import C2SE._1.Capstone2.dto.HolidayCalendarDTO;
import C2SE._1.Capstone2.service.HolidayCalendarService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/v1/holidays")
@RequiredArgsConstructor
public class HolidayCalendarController {

    private final HolidayCalendarService holidayCalendarService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<HolidayCalendarDTO>>> getAllHolidays() {
        return ResponseEntity.ok(ApiResponse.success(holidayCalendarService.getAllHolidays()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<HolidayCalendarDTO>> getHolidayById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(holidayCalendarService.getHolidayById(id)));
    }

    @GetMapping("/range")
    public ResponseEntity<ApiResponse<List<HolidayCalendarDTO>>> getHolidaysByDateRange(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(ApiResponse.success(holidayCalendarService.getHolidaysByDateRange(from, to)));
    }

    @GetMapping("/month")
    public ResponseEntity<ApiResponse<List<HolidayCalendarDTO>>> getHolidaysByMonth(
            @RequestParam int month, @RequestParam int year) {
        return ResponseEntity.ok(ApiResponse.success(holidayCalendarService.getHolidaysByMonth(month, year)));
    }

    @GetMapping("/upcoming")
    public ResponseEntity<ApiResponse<List<HolidayCalendarDTO>>> getUpcomingHolidays() {
        return ResponseEntity.ok(ApiResponse.success(holidayCalendarService.getUpcomingHolidays()));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<HolidayCalendarDTO>> createHoliday(@Valid @RequestBody HolidayCalendarDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(holidayCalendarService.createHoliday(dto)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<HolidayCalendarDTO>> updateHoliday(@PathVariable Long id, @Valid @RequestBody HolidayCalendarDTO dto) {
        return ResponseEntity.ok(ApiResponse.success(holidayCalendarService.updateHoliday(id, dto)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteHoliday(@PathVariable Long id) {
        holidayCalendarService.deleteHoliday(id);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @PostMapping("/sync")
    public ResponseEntity<ApiResponse<Integer>> syncFromNagerDate(
            @RequestParam(defaultValue = "0") int year) {
        if (year <= 0) {
            year = java.time.LocalDate.now().getYear();
        }
        int count = holidayCalendarService.syncFromNagerDate(year);
        return ResponseEntity.ok(ApiResponse.success(count, "Đã đồng bộ " + count + " ngày lễ mới từ Nager.Date"));
    }

    @PostMapping("/seed-vietnamese")
    public ResponseEntity<ApiResponse<Integer>> seedVietnameseHolidays(
            @RequestParam(defaultValue = "0") int year) {
        if (year <= 0) {
            year = java.time.LocalDate.now().getYear();
        }
        int count = holidayCalendarService.seedVietnameseHolidays(year);
        return ResponseEntity.ok(ApiResponse.success(count, "Đã thêm " + count + " ngày lễ Việt Nam mới"));
    }

    @PostMapping("/sync-google")
    public ResponseEntity<ApiResponse<Integer>> syncFromGoogleCalendar(
            @RequestParam(defaultValue = "0") int year) {
        if (year <= 0) {
            year = java.time.LocalDate.now().getYear();
        }
        int count = holidayCalendarService.syncFromGoogleCalendar(year);
        return ResponseEntity.ok(ApiResponse.success(count, "Đã đồng bộ " + count + " ngày lễ từ Google Calendar"));
    }
}
