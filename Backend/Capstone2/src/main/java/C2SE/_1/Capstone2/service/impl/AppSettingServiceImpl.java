package C2SE._1.Capstone2.service.impl;

import C2SE._1.Capstone2.entity.AppSetting;
import C2SE._1.Capstone2.repository.AppSettingRepository;
import C2SE._1.Capstone2.service.AppSettingService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class AppSettingServiceImpl implements AppSettingService {

    private final AppSettingRepository appSettingRepository;

    @Override
    @Transactional(readOnly = true)
    public String getValue(String key) {
        return appSettingRepository.findBySettingKey(key)
                .map(AppSetting::getSettingValue)
                .orElse(null);
    }

    @Override
    public void setValue(String key, String value) {
        AppSetting setting = appSettingRepository.findBySettingKey(key)
                .orElseGet(() -> AppSetting.builder().settingKey(key).build());
        setting.setSettingValue(value);
        appSettingRepository.save(setting);
    }
}

