package C2SE._1.Capstone2.controller;

import C2SE._1.Capstone2.dto.ApiResponse;
import C2SE._1.Capstone2.dto.ShiftAssignmentCreateDTO;
import C2SE._1.Capstone2.dto.ShiftAssignmentDTO;
import C2SE._1.Capstone2.dto.ShiftAssignmentUpdateDTO;
import C2SE._1.Capstone2.dto.ShiftAttendanceDTO;
import C2SE._1.Capstone2.dto.ShiftBulkAssignDTO;
import C2SE._1.Capstone2.dto.ShiftCheckInDTO;
import C2SE._1.Capstone2.dto.ShiftCheckOutDTO;
import C2SE._1.Capstone2.dto.ShiftRevenueDetailDTO;
import C2SE._1.Capstone2.dto.ShiftTemplateDTO;
import C2SE._1.Capstone2.dto.ShiftWorkSummaryDTO;
import C2SE._1.Capstone2.entity.ShiftType;
import C2SE._1.Capstone2.service.ShiftService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.List;
import C2SE._1.Capstone2.util.TimeUtil;

@RestController
@RequestMapping("/api/v1/shifts")
@RequiredArgsConstructor
public class ShiftController {

    private final ShiftService shiftService;

    @GetMapping("/templates")
    public ResponseEntity<ApiResponse<List<ShiftTemplateDTO>>> getShiftTemplates(
            @RequestParam(defaultValue = "true") boolean activeOnly,
            @RequestParam(required = false) ShiftType shiftType) {
        return ResponseEntity.ok(ApiResponse.success(shiftService.getShiftTemplates(activeOnly, shiftType)));
    }

    @PostMapping("/templates")
    public ResponseEntity<ApiResponse<ShiftTemplateDTO>> createShiftTemplate(@Valid @RequestBody ShiftTemplateDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(shiftService.createShiftTemplate(dto)));
    }

    @PutMapping("/templates/{id}")
    public ResponseEntity<ApiResponse<ShiftTemplateDTO>> updateShiftTemplate(
            @PathVariable Long id,
            @Valid @RequestBody ShiftTemplateDTO dto) {
        return ResponseEntity.ok(ApiResponse.success(shiftService.updateShiftTemplate(id, dto)));
    }

    @DeleteMapping("/templates/{id}")
    public ResponseEntity<ApiResponse<Void>> deactivateShiftTemplate(@PathVariable Long id) {
        shiftService.deactivateShiftTemplate(id);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @GetMapping("/assignments")
    public ResponseEntity<ApiResponse<List<ShiftAssignmentDTO>>> getAssignments(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate,
            @RequestParam(required = false) Long userId,
            @RequestParam(required = false) ShiftType shiftType) {
        return ResponseEntity.ok(ApiResponse.success(shiftService.getAssignments(fromDate, toDate, userId, shiftType)));
    }

    @GetMapping("/my-assignments")
    public ResponseEntity<ApiResponse<List<ShiftAssignmentDTO>>> getMyAssignments(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate) {
        return ResponseEntity.ok(ApiResponse.success(shiftService.getMyAssignments(fromDate, toDate)));
    }

    @PostMapping("/assignments")
    public ResponseEntity<ApiResponse<ShiftAssignmentDTO>> createAssignment(@Valid @RequestBody ShiftAssignmentCreateDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(shiftService.createAssignment(dto)));
    }

    @PostMapping("/assignments/bulk")
    public ResponseEntity<ApiResponse<List<ShiftAssignmentDTO>>> createAssignmentsBulk(@Valid @RequestBody ShiftBulkAssignDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(shiftService.createAssignmentsBulk(dto)));
    }

    @PutMapping("/assignments/{id}")
    public ResponseEntity<ApiResponse<ShiftAssignmentDTO>> updateAssignment(
            @PathVariable Long id,
            @RequestBody ShiftAssignmentUpdateDTO dto) {
        return ResponseEntity.ok(ApiResponse.success(shiftService.updateAssignment(id, dto)));
    }

    @DeleteMapping("/assignments/{id}")
    public ResponseEntity<ApiResponse<ShiftAssignmentDTO>> cancelAssignment(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(shiftService.cancelAssignment(id)));
    }

    @PostMapping("/attendance/check-in")
    public ResponseEntity<ApiResponse<ShiftAttendanceDTO>> checkIn(@Valid @RequestBody ShiftCheckInDTO dto) {
        return ResponseEntity.ok(ApiResponse.success(shiftService.checkIn(dto)));
    }

    @PostMapping("/attendance/check-out")
    public ResponseEntity<ApiResponse<ShiftAttendanceDTO>> checkOut(@Valid @RequestBody ShiftCheckOutDTO dto) {
        return ResponseEntity.ok(ApiResponse.success(shiftService.checkOut(dto)));
    }

    @GetMapping("/attendance")
    public ResponseEntity<ApiResponse<List<ShiftAttendanceDTO>>> getAttendances(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate,
            @RequestParam(required = false) Long userId,
            @RequestParam(required = false) ShiftType shiftType) {
        return ResponseEntity.ok(ApiResponse.success(shiftService.getAttendances(fromDate, toDate, userId, shiftType)));
    }

    @GetMapping("/my-attendance")
    public ResponseEntity<ApiResponse<List<ShiftAttendanceDTO>>> getMyAttendances(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate) {
        return ResponseEntity.ok(ApiResponse.success(shiftService.getMyAttendances(fromDate, toDate)));
    }

    @GetMapping("/work-summary")
    public ResponseEntity<ApiResponse<List<ShiftWorkSummaryDTO>>> getWorkSummary(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate,
            @RequestParam(required = false) Long userId,
            @RequestParam(required = false) ShiftType shiftType) {
        return ResponseEntity.ok(ApiResponse.success(shiftService.getWorkSummary(fromDate, toDate, userId, shiftType)));
    }

    @GetMapping("/revenue-details")
    public ResponseEntity<ApiResponse<List<ShiftRevenueDetailDTO>>> getRevenueDetails(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate,
            @RequestParam(required = false) Long userId,
            @RequestParam(required = false) ShiftType shiftType) {
        return ResponseEntity.ok(ApiResponse.success(shiftService.getRevenueDetails(fromDate, toDate, userId, shiftType)));
    }

    @GetMapping(value = "/work-summary.csv", produces = "text/csv")
    public ResponseEntity<byte[]> exportWorkSummaryCsv(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate,
            @RequestParam(required = false) Long userId,
            @RequestParam(required = false) ShiftType shiftType) {
        List<ShiftWorkSummaryDTO> rows = shiftService.getWorkSummary(fromDate, toDate, userId, shiftType);
        String csv = buildWorkSummaryCsv(rows);
        String fileName = "shift_work_summary_" + TimeUtil.todayVN() + ".csv";

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + fileName + "\"")
                .contentType(new MediaType("text", "csv", StandardCharsets.UTF_8))
                .body(csv.getBytes(StandardCharsets.UTF_8));
    }

    private String buildWorkSummaryCsv(List<ShiftWorkSummaryDTO> rows) {
        StringBuilder sb = new StringBuilder();
        sb.append("user_id,user_full_name,shift_type,total_assignments,assigned_count,checked_in_count,completed_count,cancelled_count,absent_count,total_worked_minutes,total_late_minutes,total_early_leave_minutes,total_revenue_during_shift,average_revenue_per_completed_shift,cashier_revenue_during_shift\n");

        for (ShiftWorkSummaryDTO row : rows) {
            sb.append(row.getUserId() == null ? "" : row.getUserId()).append(',')
                    .append(csvEscape(row.getUserFullName())).append(',')
                    .append(row.getShiftType() == null ? "" : row.getShiftType().name()).append(',')
                    .append(safeLong(row.getTotalAssignments())).append(',')
                    .append(safeLong(row.getAssignedCount())).append(',')
                    .append(safeLong(row.getCheckedInCount())).append(',')
                    .append(safeLong(row.getCompletedCount())).append(',')
                    .append(safeLong(row.getCancelledCount())).append(',')
                    .append(safeLong(row.getAbsentCount())).append(',')
                    .append(safeLong(row.getTotalWorkedMinutes())).append(',')
                    .append(safeLong(row.getTotalLateMinutes())).append(',')
                    .append(safeLong(row.getTotalEarlyLeaveMinutes())).append(',')
                    .append(safeDecimal(row.getTotalRevenueDuringShift())).append(',')
                    .append(safeDecimal(row.getAverageRevenuePerCompletedShift())).append(',')
                    .append(safeDecimal(row.getTotalCashierRevenueDuringShift()))
                    .append('\n');
        }

        return sb.toString();
    }

    private long safeLong(Long value) {
        return value == null ? 0L : value;
    }

    private String safeDecimal(BigDecimal value) {
        return value == null ? "0" : value.toPlainString();
    }

    private String csvEscape(String value) {
        if (value == null || value.isBlank()) {
            return "";
        }
        boolean needQuotes = value.contains(",") || value.contains("\"") || value.contains("\n") || value.contains("\r");
        String escaped = value.replace("\"", "\"\"");
        return needQuotes ? "\"" + escaped + "\"" : escaped;
    }
}
