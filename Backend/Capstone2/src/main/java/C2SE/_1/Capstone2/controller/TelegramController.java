package C2SE._1.Capstone2.controller;

import C2SE._1.Capstone2.dto.ApiResponse;
import C2SE._1.Capstone2.dto.TelegramLinkStatusDTO;
import C2SE._1.Capstone2.service.TelegramLinkService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/public/telegram")
@RequiredArgsConstructor
public class TelegramController {

    private final TelegramLinkService telegramLinkService;

    @GetMapping("/opt-in-link")
    public ResponseEntity<ApiResponse<String>> getOptInLink(@RequestParam String phone) {
        return ResponseEntity.ok(ApiResponse.success(telegramLinkService.buildOptInUrl(phone)));
    }

    @GetMapping("/link-status")
    public ResponseEntity<ApiResponse<TelegramLinkStatusDTO>> getLinkStatus(@RequestParam String phone) {
        return ResponseEntity.ok(ApiResponse.success(telegramLinkService.getLinkStatus(phone)));
    }

    @PostMapping("/webhook")
    public ResponseEntity<ApiResponse<Void>> telegramWebhook(@RequestBody Map<String, Object> payload) {
        telegramLinkService.handleWebhook(payload);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
