package C2SE._1.Capstone2.service.impl;

import C2SE._1.Capstone2.dto.StoreLocationDTO;
import C2SE._1.Capstone2.dto.StoreLocationUpdateDTO;
import C2SE._1.Capstone2.exception.BadRequestException;
import C2SE._1.Capstone2.service.AppSettingService;
import C2SE._1.Capstone2.service.StoreLocationService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class StoreLocationServiceImpl implements StoreLocationService {

    public static final String STORE_LATITUDE_KEY = "store_latitude";
    public static final String STORE_LONGITUDE_KEY = "store_longitude";
    public static final String STORE_ADDRESS_KEY = "store_address";

    private final AppSettingService appSettingService;

    @Override
    @Transactional(readOnly = true)
    public StoreLocationDTO getStoreLocation() {
        return StoreLocationDTO.builder()
                .latitude(parseDouble(appSettingService.getValue(STORE_LATITUDE_KEY)))
                .longitude(parseDouble(appSettingService.getValue(STORE_LONGITUDE_KEY)))
                .address(appSettingService.getValue(STORE_ADDRESS_KEY))
                .build();
    }

    @Override
    public StoreLocationDTO updateStoreLocation(StoreLocationUpdateDTO dto) {
        if ((dto.getLatitude() == null) != (dto.getLongitude() == null)) {
            throw new BadRequestException("Vui lòng nhập đủ cả vĩ độ và kinh độ");
        }

        if (dto.getLatitude() == null) {
            appSettingService.setValue(STORE_LATITUDE_KEY, null);
            appSettingService.setValue(STORE_LONGITUDE_KEY, null);
        } else {
            appSettingService.setValue(STORE_LATITUDE_KEY, dto.getLatitude().toString());
            appSettingService.setValue(STORE_LONGITUDE_KEY, dto.getLongitude().toString());
        }
        appSettingService.setValue(STORE_ADDRESS_KEY, normalize(dto.getAddress()));

        return getStoreLocation();
    }

    private static Double parseDouble(String val) {
        if (val == null || val.isBlank()) return null;
        try {
            return Double.parseDouble(val);
        } catch (NumberFormatException ignored) {
            return null;
        }
    }

    private static String normalize(String text) {
        if (text == null) return null;
        String trimmed = text.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
