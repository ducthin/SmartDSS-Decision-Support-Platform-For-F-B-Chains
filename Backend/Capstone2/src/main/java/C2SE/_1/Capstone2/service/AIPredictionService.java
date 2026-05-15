package C2SE._1.Capstone2.service;

import C2SE._1.Capstone2.dto.AIPredictionResponseDTO;

import java.time.LocalDate;

public interface AIPredictionService {
    AIPredictionResponseDTO getPrediction(LocalDate targetDate, boolean compareLlm);
    
    /**
     * Thông báo cho ML Service biết có đơn hàng mới hoàn thành để cộng dồn vào bộ đếm Auto-Retrain
     */
    void notifyOrderCompleted(int orderCount);
}
