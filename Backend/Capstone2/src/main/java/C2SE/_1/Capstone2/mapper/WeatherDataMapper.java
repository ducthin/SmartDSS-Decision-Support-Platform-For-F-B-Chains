package C2SE._1.Capstone2.mapper;

import C2SE._1.Capstone2.dto.WeatherDataDTO;
import C2SE._1.Capstone2.entity.WeatherData;
import org.mapstruct.Mapper;

import java.util.List;

@Mapper(componentModel = "spring")
public interface WeatherDataMapper {

    WeatherDataDTO toDTO(WeatherData weatherData);

    List<WeatherDataDTO> toDTOList(List<WeatherData> weatherDataList);
}
