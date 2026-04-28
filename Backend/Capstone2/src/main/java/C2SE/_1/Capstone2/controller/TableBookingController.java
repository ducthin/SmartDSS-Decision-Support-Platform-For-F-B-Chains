package C2SE._1.Capstone2.controller;

import C2SE._1.Capstone2.dto.ApiResponse;
import C2SE._1.Capstone2.dto.PageResponse;
import C2SE._1.Capstone2.dto.PublicTableBookingRequestDTO;
import C2SE._1.Capstone2.dto.TableBookingDTO;
import C2SE._1.Capstone2.dto.UpdateTableBookingStatusDTO;
import C2SE._1.Capstone2.entity.BookingStatus;
import C2SE._1.Capstone2.service.TableBookingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequiredArgsConstructor
public class TableBookingController {

    private final TableBookingService tableBookingService;

    @PostMapping("/api/v1/public/home/bookings")
    public ResponseEntity<ApiResponse<TableBookingDTO>> createPublicBooking(
            @Valid @RequestBody PublicTableBookingRequestDTO dto
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                tableBookingService.createPublicBooking(dto),
                "Đặt bàn thành công"
        ));
    }

    @GetMapping("/api/v1/bookings")
    public ResponseEntity<ApiResponse<PageResponse<TableBookingDTO>>> getAll(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) BookingStatus status,
            @RequestParam(required = false) String keyword,
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            @RequestParam(required = false) LocalDate fromDate,
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            @RequestParam(required = false) LocalDate toDate
    ) {
        var pageable = PageRequest.of(page, size, Sort.by(
                Sort.Order.asc("bookingDate"),
                Sort.Order.asc("bookingTime"),
                Sort.Order.desc("createdAt")
        ));
        return ResponseEntity.ok(ApiResponse.success(
                tableBookingService.getAll(pageable, status, keyword, fromDate, toDate)
        ));
    }

    @PutMapping("/api/v1/bookings/{id}/status")
    public ResponseEntity<ApiResponse<TableBookingDTO>> updateStatus(
            @PathVariable Long id,
            @Valid @RequestBody UpdateTableBookingStatusDTO dto
    ) {
        return ResponseEntity.ok(ApiResponse.success(tableBookingService.updateStatus(id, dto)));
    }
}
