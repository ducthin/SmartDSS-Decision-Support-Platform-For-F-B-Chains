package C2SE._1.Capstone2.controller;

import C2SE._1.Capstone2.dto.ApiResponse;
import C2SE._1.Capstone2.dto.HolidayCalendarDTO;
import C2SE._1.Capstone2.service.HolidayCalendarService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

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
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<ApiResponse<HolidayCalendarDTO>> createHoliday(@Valid @RequestBody HolidayCalendarDTO dto) {
        HolidayCalendarDTO created = holidayCalendarService.createHoliday(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(
                ApiResponse.success(created, "Ngày lễ '" + created.getName() + "' đã được tạo thành công")
        );
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<ApiResponse<HolidayCalendarDTO>> updateHoliday(
            @PathVariable Long id,
            @Valid @RequestBody HolidayCalendarDTO dto) {
        HolidayCalendarDTO updated = holidayCalendarService.updateHoliday(id, dto);
        return ResponseEntity.ok(ApiResponse.success(
                updated,
                "Ngày lễ '" + updated.getName() + "' đã được cập nhật thành công"
        ));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> deleteHoliday(@PathVariable Long id) {
        holidayCalendarService.deleteHoliday(id);
        Map<String, Object> data = new HashMap<>();
        data.put("id", id);
        return ResponseEntity.ok(ApiResponse.success(data, "Ngày lễ đã được xóa thành công"));
    }

    @PostMapping("/sync-calendarific")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> syncFromCalendarific(
            @RequestParam(defaultValue = "0") int year) {
        if (year <= 0) {
            year = java.time.LocalDate.now().getYear();
        }
        int count = holidayCalendarService.syncFromCalendarific(year);
        Map<String, Object> data = new HashMap<>();
        data.put("year", year);
        data.put("synced", count);
        return ResponseEntity.ok(ApiResponse.success(
                data,
                "Đã đồng bộ " + count + " ngày lễ từ Calendarific cho năm " + year
        ));
    }

    @GetMapping("/by-type")
    public ResponseEntity<ApiResponse<List<HolidayCalendarDTO>>> getHolidaysByType(
            @RequestParam String holidayType) {
        return ResponseEntity.ok(ApiResponse.success(
                holidayCalendarService.getHolidaysByType(holidayType)
        ));
    }

    @GetMapping("/by-year")
    public ResponseEntity<ApiResponse<List<HolidayCalendarDTO>>> getHolidaysByYear(
            @RequestParam int year) {
        return ResponseEntity.ok(ApiResponse.success(
                holidayCalendarService.getHolidaysByYear(year)
        ));
    }

    @GetMapping("/check/{date}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> checkIsHoliday(
            @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        HolidayCalendarDTO holiday = holidayCalendarService.getHolidayByDate(date);
        Map<String, Object> data = new HashMap<>();
        data.put("date", date);
        data.put("isHoliday", holiday != null);
        data.put("holiday", holiday);
        return ResponseEntity.ok(ApiResponse.success(data));
    }
}
