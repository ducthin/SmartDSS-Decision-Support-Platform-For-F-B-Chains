package C2SE._1.Capstone2.controller;

import C2SE._1.Capstone2.dto.ApiResponse;
import C2SE._1.Capstone2.dto.NotificationTestRequestDTO;
import C2SE._1.Capstone2.dto.NotificationTestResultDTO;
import C2SE._1.Capstone2.service.CustomerNotificationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final CustomerNotificationService customerNotificationService;

    @PostMapping("/test")
    public ResponseEntity<ApiResponse<NotificationTestResultDTO>> sendTestNotification(
            @Valid @RequestBody NotificationTestRequestDTO request
    ) {
        NotificationTestResultDTO result = customerNotificationService.sendTestNotification(
                request.getPhone(),
                request.getMessage()
        );
        return ResponseEntity.ok(ApiResponse.success(result));
    }
}
