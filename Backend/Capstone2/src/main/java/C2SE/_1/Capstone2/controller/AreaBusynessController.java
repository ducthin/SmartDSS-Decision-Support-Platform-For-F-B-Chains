package C2SE._1.Capstone2.controller;

import C2SE._1.Capstone2.dto.ApiResponse;
import C2SE._1.Capstone2.dto.AreaBusynessDTO;
import C2SE._1.Capstone2.service.AreaBusynessService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/area-busyness")
@RequiredArgsConstructor
public class AreaBusynessController {

    private final AreaBusynessService areaBusynessService;

    @GetMapping("/current")
    public ResponseEntity<ApiResponse<AreaBusynessDTO>> analyzeCurrentArea() {
        return ResponseEntity.ok(ApiResponse.success(areaBusynessService.analyzeCurrentArea()));
    }
}
