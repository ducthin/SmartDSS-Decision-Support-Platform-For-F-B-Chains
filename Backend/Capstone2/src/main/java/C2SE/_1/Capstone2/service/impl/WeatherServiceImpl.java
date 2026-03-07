package C2SE._1.Capstone2.service.impl;

import C2SE._1.Capstone2.dto.WeatherDataDTO;
import C2SE._1.Capstone2.entity.WeatherData;
import C2SE._1.Capstone2.mapper.WeatherDataMapper;
import C2SE._1.Capstone2.repository.WeatherDataRepository;
import C2SE._1.Capstone2.service.WeatherService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;

import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
@Slf4j
public class WeatherServiceImpl implements WeatherService {

    private final WeatherDataRepository weatherDataRepository;
    private final WeatherDataMapper weatherDataMapper;

    @Value("${weather.api.key}")
    private String apiKey;

    @Value("${weather.api.city:Da Nang}")
    private String city;

    @Value("${weather.api.url:https://api.openweathermap.org/data/2.5/weather}")
    private String apiUrl;

    @Override
    @Transactional(readOnly = true)
    public WeatherDataDTO getTodayWeather() {
        return weatherDataRepository.findByRecordDate(LocalDate.now())
                .map(weatherDataMapper::toDTO)
                .orElse(null);
    }

    @Override
    @Transactional(readOnly = true)
    public WeatherDataDTO getWeatherByDate(LocalDate date) {
        return weatherDataRepository.findByRecordDate(date)
                .map(weatherDataMapper::toDTO)
                .orElse(null);
    }

    @Override
    @Transactional(readOnly = true)
    public List<WeatherDataDTO> getWeatherRange(LocalDate from, LocalDate to) {
        return weatherDataMapper.toDTOList(
                weatherDataRepository.findByRecordDateBetweenOrderByRecordDateDesc(from, to));
    }

    @Override
    public WeatherDataDTO fetchAndSaveCurrentWeather() {
        try {
            String url = apiUrl + "?q=" + city + "&appid=" + apiKey + "&units=metric&lang=vi";

            String json = RestClient.create()
                    .get()
                    .uri(url)
                    .retrieve()
                    .body(String.class);

            ObjectMapper objectMapper = new ObjectMapper();
            JsonNode root = objectMapper.readTree(json);

            JsonNode main = root.path("main");
            JsonNode weatherArr = root.path("weather");
            JsonNode wind = root.path("wind");
            JsonNode rain = root.path("rain");

            LocalDate today = LocalDate.now();
            WeatherData weatherData = weatherDataRepository.findByRecordDate(today)
                    .orElse(WeatherData.builder().recordDate(today).build());

            weatherData.setTemperature(main.path("temp").asDouble());
            weatherData.setFeelsLike(main.path("feels_like").asDouble());
            weatherData.setHumidity(main.path("humidity").asInt());
            weatherData.setCondition(weatherArr.get(0).path("main").asText());
            weatherData.setDescription(weatherArr.get(0).path("description").asText());
            weatherData.setIcon(weatherArr.get(0).path("icon").asText());
            weatherData.setWindSpeed(wind.path("speed").asDouble());
            weatherData.setRainfall(rain.isMissingNode() ? 0.0 : rain.path("1h").asDouble(0.0));
            weatherData.setCity(city);

            return weatherDataMapper.toDTO(weatherDataRepository.save(weatherData));
        } catch (Exception e) {
            log.error("Failed to fetch weather data: {}", e.getMessage());
            return null;
        }
    }

    @Scheduled(fixedRateString = "${weather.api.fetch-interval:3600000}")
    public void scheduledWeatherFetch() {
        log.info("Scheduled weather fetch started");
        fetchAndSaveCurrentWeather();
    }
}
