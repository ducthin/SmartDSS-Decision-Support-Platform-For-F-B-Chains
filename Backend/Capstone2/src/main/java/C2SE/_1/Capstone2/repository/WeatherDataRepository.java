package C2SE._1.Capstone2.repository;

import C2SE._1.Capstone2.entity.WeatherData;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface WeatherDataRepository extends JpaRepository<WeatherData, Long> {

    Optional<WeatherData> findByRecordDate(LocalDate recordDate);

    List<WeatherData> findByRecordDateBetweenOrderByRecordDateDesc(LocalDate from, LocalDate to);
}
