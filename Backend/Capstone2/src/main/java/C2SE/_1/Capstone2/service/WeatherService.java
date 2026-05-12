package C2SE._1.Capstone2.service;

import C2SE._1.Capstone2.dto.WeatherDataDTO;

import java.time.LocalDate;
import java.util.List;

public interface WeatherService {

    WeatherDataDTO getTodayWeather();

    WeatherDataDTO getWeatherByDate(LocalDate date);

    List<WeatherDataDTO> getWeatherRange(LocalDate from, LocalDate to);

    WeatherDataDTO fetchAndSaveCurrentWeather();

    /**
     * Calculate weather impact score (0-100)
     * Higher score = more negative impact on business
     */
    Double calculateWeatherImpactScore(WeatherDataDTO weather);

    /**
     * Check if weather conditions warrant an alert
     * Returns true if extreme conditions detected
     */
    Boolean isWeatherAlert(WeatherDataDTO weather);

    /**
     * Get weather impact details for today
     */
    WeatherDataDTO getTodayWeatherWithImpact();
}
