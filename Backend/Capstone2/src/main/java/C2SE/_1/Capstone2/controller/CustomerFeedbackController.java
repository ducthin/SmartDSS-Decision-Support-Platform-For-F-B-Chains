package C2SE._1.Capstone2.controller;

import C2SE._1.Capstone2.dto.ApiResponse;
import C2SE._1.Capstone2.dto.CustomerFeedbackDTO;
import C2SE._1.Capstone2.dto.FeedbackStatsDTO;
import C2SE._1.Capstone2.dto.PageResponse;
import C2SE._1.Capstone2.dto.UpdateFeedbackStatusDTO;
import C2SE._1.Capstone2.entity.FeedbackStatus;
import C2SE._1.Capstone2.service.CustomerFeedbackService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/v1/feedbacks")
@RequiredArgsConstructor
public class CustomerFeedbackController {

    private final CustomerFeedbackService customerFeedbackService;

    @GetMapping("/stats")
    public ResponseEntity<ApiResponse<FeedbackStatsDTO>> getStats() {
        return ResponseEntity.ok(ApiResponse.success(customerFeedbackService.getFeedbackStats()));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<CustomerFeedbackDTO>>> getAllFeedbacks(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) FeedbackStatus status,
            @RequestParam(required = false) Integer rating,
            @RequestParam(required = false) String keyword,
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            @RequestParam(required = false) LocalDate fromDate,
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            @RequestParam(required = false) LocalDate toDate
    ) {
        var pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        return ResponseEntity.ok(ApiResponse.success(customerFeedbackService.getAllFeedbacks(
                pageable, status, rating, keyword, fromDate, toDate
        )));
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<ApiResponse<CustomerFeedbackDTO>> updateStatus(
            @PathVariable Long id,
            @Valid @RequestBody UpdateFeedbackStatusDTO dto
    ) {
        return ResponseEntity.ok(ApiResponse.success(customerFeedbackService.updateFeedbackStatus(id, dto)));
    }
}
