package C2SE._1.Capstone2.controller;

import C2SE._1.Capstone2.dto.AIPredictionResponseDTO;
import C2SE._1.Capstone2.service.AIPredictionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/v1/predictions")
@RequiredArgsConstructor
@Slf4j
public class PredictionController {

    private final AIPredictionService aiPredictionService;

    @GetMapping
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    public ResponseEntity<AIPredictionResponseDTO> getDailyPrediction(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required = false, defaultValue = "false") boolean compareLlm) {
        LocalDate targetDate = (date != null) ? date : LocalDate.now();
        log.info("[PredictionController] Dự báo cho ngày: {} compareLlm={}", targetDate, compareLlm);
        return ResponseEntity.ok(aiPredictionService.getPrediction(targetDate, compareLlm));
    }
}
