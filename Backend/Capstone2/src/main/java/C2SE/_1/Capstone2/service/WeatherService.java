package C2SE._1.Capstone2.service;

import C2SE._1.Capstone2.dto.WeatherDataDTO;

import java.time.LocalDate;
import java.util.List;

public interface WeatherService {

    WeatherDataDTO getTodayWeather();

    WeatherDataDTO getWeatherByDate(LocalDate date);

    List<WeatherDataDTO> getWeatherRange(LocalDate from, LocalDate to);

    WeatherDataDTO fetchAndSaveCurrentWeather();
}
