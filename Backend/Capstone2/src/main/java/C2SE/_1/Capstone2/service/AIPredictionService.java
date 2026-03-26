package C2SE._1.Capstone2.service;

import C2SE._1.Capstone2.dto.AIPredictionResponseDTO;

import java.time.LocalDate;

public interface AIPredictionService {
    AIPredictionResponseDTO getPrediction(LocalDate targetDate, boolean compareLlm);
}
