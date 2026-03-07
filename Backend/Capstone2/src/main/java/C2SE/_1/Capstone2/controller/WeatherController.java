package C2SE._1.Capstone2.controller;

import C2SE._1.Capstone2.dto.ApiResponse;
import C2SE._1.Capstone2.dto.WeatherDataDTO;
import C2SE._1.Capstone2.service.WeatherService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/v1/weather")
@RequiredArgsConstructor
public class WeatherController {

    private final WeatherService weatherService;

    @GetMapping("/today")
    public ResponseEntity<ApiResponse<WeatherDataDTO>> getTodayWeather() {
        return ResponseEntity.ok(ApiResponse.success(weatherService.getTodayWeather()));
    }

    @GetMapping("/date")
    public ResponseEntity<ApiResponse<WeatherDataDTO>> getWeatherByDate(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ResponseEntity.ok(ApiResponse.success(weatherService.getWeatherByDate(date)));
    }

    @GetMapping("/range")
    public ResponseEntity<ApiResponse<List<WeatherDataDTO>>> getWeatherRange(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(ApiResponse.success(weatherService.getWeatherRange(from, to)));
    }

    @PostMapping("/fetch")
    public ResponseEntity<ApiResponse<WeatherDataDTO>> fetchNow() {
        return ResponseEntity.ok(ApiResponse.success(weatherService.fetchAndSaveCurrentWeather()));
    }
}
