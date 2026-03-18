package C2SE._1.Capstone2.repository;

import C2SE._1.Capstone2.entity.AppSetting;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface AppSettingRepository extends JpaRepository<AppSetting, Long> {
    Optional<AppSetting> findBySettingKey(String settingKey);
}

