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

    @PostMapping("/generate-recurring")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> generateRecurringHolidays(
            @RequestParam(defaultValue = "5") int years) {
        if (years <= 0 || years > 10) {
            years = 5; // Safety limit: 5-10 years max
        }
        int count = holidayCalendarService.generateRecurringHolidays(years);
        Map<String, Object> data = new HashMap<>();
        data.put("years", years);
        data.put("generated", count);
        return ResponseEntity.ok(ApiResponse.success(
                data,
                "Đã tạo " + count + " ngày lễ tái diễn cho " + years + " năm tới"
        ));
    }

    @PutMapping("/{id}/business-hours")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<ApiResponse<HolidayCalendarDTO>> updateBusinessHours(
            @PathVariable Long id,
            @RequestBody Map<String, Object> businessHoursData) {
        // Note: Validation handled via DTO fields openOnHoliday, overrideStartTime, overrideEndTime, specialNotes
        HolidayCalendarDTO dto = new HolidayCalendarDTO();
        if (businessHoursData.containsKey("openOnHoliday")) {
            dto.setOpenOnHoliday((Boolean) businessHoursData.get("openOnHoliday"));
        }
        if (businessHoursData.containsKey("overrideStartTime")) {
            // Parse time string (HH:mm format)
            Object startTime = businessHoursData.get("overrideStartTime");
            if (startTime != null) {
                dto.setOverrideStartTime(java.time.LocalTime.parse(startTime.toString()));
            }
        }
        if (businessHoursData.containsKey("overrideEndTime")) {
            Object endTime = businessHoursData.get("overrideEndTime");
            if (endTime != null) {
                dto.setOverrideEndTime(java.time.LocalTime.parse(endTime.toString()));
            }
        }
        if (businessHoursData.containsKey("specialNotes")) {
            dto.setSpecialNotes((String) businessHoursData.get("specialNotes"));
        }
        
        HolidayCalendarDTO updated = holidayCalendarService.updateHoliday(id, dto);
        return ResponseEntity.ok(ApiResponse.success(
                updated,
                "Giờ làm việc cho ngày lễ '" + updated.getName() + "' đã được cập nhật"
        ));
    }
}

