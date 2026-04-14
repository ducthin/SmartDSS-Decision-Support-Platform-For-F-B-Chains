package C2SE._1.Capstone2.service;

import C2SE._1.Capstone2.dto.AIPredictionRequestDTO;
import C2SE._1.Capstone2.dto.AIPredictionResponseDTO;
import C2SE._1.Capstone2.dto.LlmComparisonDTO;

import java.time.LocalDate;

public interface OpenAiComparisonService {
    /**
     * @param intraDayContextForLlm đoạn mô tả bổ sung (cùng ngày + giờ + số liệu thực), có thể null
     */
    LlmComparisonDTO compareIfRequested(
            boolean requested,
            LocalDate targetDate,
            AIPredictionRequestDTO features,
            AIPredictionResponseDTO mlResult,
            String intraDayContextForLlm
    );
}
