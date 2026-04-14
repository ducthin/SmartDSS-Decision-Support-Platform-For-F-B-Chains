package C2SE._1.Capstone2.service;

import C2SE._1.Capstone2.dto.StoreLocationDTO;
import C2SE._1.Capstone2.dto.StoreLocationUpdateDTO;

public interface StoreLocationService {
    StoreLocationDTO getStoreLocation();
    StoreLocationDTO updateStoreLocation(StoreLocationUpdateDTO dto);
}
