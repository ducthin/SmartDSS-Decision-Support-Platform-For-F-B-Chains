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
            weatherData.setPressure(main.path("pressure").asInt());
            weatherData.setVisibility(root.path("visibility").asInt());
            weatherData.setCity(city);

            // Calculate weather impact and alert status
            WeatherDataDTO dto = weatherDataMapper.toDTO(weatherData);
            Double impactScore = calculateWeatherImpactScore(dto);
            Boolean isAlert = isWeatherAlert(dto);

            weatherData.setWeatherImpactScore(impactScore);
            weatherData.setIsAlert(isAlert);
            if (isAlert) {
                weatherData.setAlertMessage(generateAlertMessage(dto));
            }

            return weatherDataMapper.toDTO(weatherDataRepository.save(weatherData));
        } catch (Exception e) {
            log.error("Failed to fetch weather data: {}", e.getMessage());
            throw new RuntimeException("Không thể lấy dữ liệu thời tiết: " + e.getMessage());
        }
    }

    @Override
    public Double calculateWeatherImpactScore(WeatherDataDTO weather) {
        if (weather == null) return 0.0;

        double score = 0.0;

        // Temperature impact (-10 to 45°C is normal, extremes reduce sales)
        double temp = weather.getTemperature() != null ? weather.getTemperature() : 25;
        if (temp < -10 || temp > 45) {
            score += 30; // Extreme temperatures
        } else if (temp < 5 || temp > 40) {
            score += 20; // Uncomfortable temperatures
        } else if (temp < 10 || temp > 35) {
            score += 10; // Suboptimal temperatures
        }

        // Humidity impact (30-60% is normal)
        int humidity = weather.getHumidity() != null ? weather.getHumidity() : 60;
        if (humidity > 85 || humidity < 20) {
            score += 15; // Extreme humidity
        } else if (humidity > 75 || humidity < 30) {
            score += 8;
        }

        // Wind impact (> 20 km/h affects outdoor activities)
        double windSpeed = weather.getWindSpeed() != null ? weather.getWindSpeed() : 0;
        if (windSpeed > 40) {
            score += 20; // Strong winds
        } else if (windSpeed > 25) {
            score += 12;
        } else if (windSpeed > 15) {
            score += 5;
        }

        // Rainfall impact (heavy rain reduces foot traffic)
        double rainfall = weather.getRainfall() != null ? weather.getRainfall() : 0;
        if (rainfall > 20) {
            score += 30; // Heavy rain
        } else if (rainfall > 10) {
            score += 20; // Moderate rain
        } else if (rainfall > 2) {
            score += 10; // Light rain
        }

        // Weather condition impact
        String condition = weather.getCondition() != null ? weather.getCondition().toLowerCase() : "";
        if (condition.contains("thunderstorm") || condition.contains("tornado")) {
            score += 35;
        } else if (condition.contains("snow")) {
            score += 25;
        } else if (condition.contains("rain")) {
            score += 15;
        } else if (condition.contains("mist") || condition.contains("fog")) {
            score += 8;
        }

        return Math.min(score, 100.0);
    }

    @Override
    public Boolean isWeatherAlert(WeatherDataDTO weather) {
        if (weather == null) return false;

        double temp = weather.getTemperature() != null ? weather.getTemperature() : 25;
        int humidity = weather.getHumidity() != null ? weather.getHumidity() : 60;
        double windSpeed = weather.getWindSpeed() != null ? weather.getWindSpeed() : 0;
        double rainfall = weather.getRainfall() != null ? weather.getRainfall() : 0;
        String condition = weather.getCondition() != null ? weather.getCondition().toLowerCase() : "";

        // Alert if conditions are severe
        if (temp < -5 || temp > 42) return true;
        if (humidity > 90 || humidity < 15) return true;
        if (windSpeed > 35) return true;
        if (rainfall > 15) return true;
        if (condition.contains("thunderstorm") || condition.contains("tornado")) return true;
        if (condition.contains("snow")) return true;

        return false;
    }

    @Override
    public WeatherDataDTO getTodayWeatherWithImpact() {
        WeatherDataDTO weather = getTodayWeather();
        if (weather != null) {
            weather.setWeatherImpactScore(calculateWeatherImpactScore(weather));
            weather.setIsAlert(isWeatherAlert(weather));
        }
        return weather;
    }

    private String generateAlertMessage(WeatherDataDTO weather) {
        StringBuilder message = new StringBuilder();
        
        double temp = weather.getTemperature() != null ? weather.getTemperature() : 25;
        if (temp < -5 || temp > 42) {
            message.append("⚠️ Nhiệt độ cực đoan (").append(String.format("%.1f", temp)).append("°C). ");
        }

        int humidity = weather.getHumidity() != null ? weather.getHumidity() : 60;
        if (humidity > 90) {
            message.append("⚠️ Độ ẩm rất cao (").append(humidity).append("%). ");
        }

        double windSpeed = weather.getWindSpeed() != null ? weather.getWindSpeed() : 0;
        if (windSpeed > 35) {
            message.append("⚠️ Gió mạnh (").append(String.format("%.1f", windSpeed)).append(" km/h). ");
        }

        double rainfall = weather.getRainfall() != null ? weather.getRainfall() : 0;
        if (rainfall > 15) {
            message.append("⚠️ Mưa lớn (").append(String.format("%.1f", rainfall)).append(" mm). ");
        }

        String condition = weather.getCondition() != null ? weather.getCondition() : "";
        if (condition.toLowerCase().contains("thunderstorm")) {
            message.append("⚠️ Có dông bão. ");
        } else if (condition.toLowerCase().contains("snow")) {
            message.append("⚠️ Có tuyết. ");
        }

        return message.toString().trim();
    }

    @Scheduled(fixedRateString = "${weather.api.fetch-interval:3600000}")
    public void scheduledWeatherFetch() {
        log.info("Scheduled weather fetch started");
        int maxRetries = 3;
        for (int attempt = 1; attempt <= maxRetries; attempt++) {
            WeatherDataDTO result = fetchAndSaveCurrentWeather();
            if (result != null) {
                log.info("Weather fetch succeeded on attempt {}", attempt);
                return;
            }
            if (attempt < maxRetries) {
                log.warn("Weather fetch failed (attempt {}/{}), retrying in 10s...", attempt, maxRetries);
                try {
                    Thread.sleep(10_000);
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                    return;
                }
            }
        }
        log.error("Weather fetch failed after {} attempts", maxRetries);
    }
}
