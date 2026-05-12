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
        return ResponseEntity.ok(ApiResponse.success(weatherService.fetchAndSaveCurrentWeather(),
                "Dữ liệu thời tiết đã được cập nhật thành công"));
    }

    @GetMapping("/today/impact")
    public ResponseEntity<ApiResponse<WeatherDataDTO>> getTodayWeatherWithImpact() {
        return ResponseEntity.ok(ApiResponse.success(weatherService.getTodayWeatherWithImpact(),
                "Dữ liệu thời tiết kèm điểm tác động"));
    }

    @GetMapping("/impact/{date}")
    public ResponseEntity<ApiResponse<Object>> getWeatherImpactByDate(
            @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        WeatherDataDTO weather = weatherService.getWeatherByDate(date);
        if (weather == null) {
            return ResponseEntity.ok(ApiResponse.success(null, "Không có dữ liệu thời tiết cho ngày này"));
        }
        
        Double impactScore = weatherService.calculateWeatherImpactScore(weather);
        Boolean isAlert = weatherService.isWeatherAlert(weather);
        
        return ResponseEntity.ok(ApiResponse.success(new Object() {
            public final LocalDate dateValue = date;
            public final Double temperature = weather.getTemperature();
            public final Integer humidity = weather.getHumidity();
            public final Double windSpeed = weather.getWindSpeed();
            public final Double rainfall = weather.getRainfall();
            public final String condition = weather.getCondition();
            public final Double weatherImpactScore = impactScore;
            public final Boolean weatherAlert = isAlert;
        }));
    }
}
