package C2SE._1.Capstone2.service;

import C2SE._1.Capstone2.dto.CustomerFeedbackDTO;
import C2SE._1.Capstone2.dto.FeedbackStatsDTO;
import C2SE._1.Capstone2.dto.PageResponse;
import C2SE._1.Capstone2.dto.QrFeedbackDTO;
import C2SE._1.Capstone2.dto.UpdateFeedbackStatusDTO;
import C2SE._1.Capstone2.entity.FeedbackStatus;
import org.springframework.data.domain.Pageable;

import java.time.LocalDate;

public interface CustomerFeedbackService {
    CustomerFeedbackDTO submitFeedback(String qrToken, QrFeedbackDTO dto);

    PageResponse<CustomerFeedbackDTO> getAllFeedbacks(
            Pageable pageable,
            FeedbackStatus status,
            Integer rating,
            String keyword,
            LocalDate fromDate,
            LocalDate toDate
    );

    CustomerFeedbackDTO updateFeedbackStatus(Long id, UpdateFeedbackStatusDTO dto);

    FeedbackStatsDTO getFeedbackStats();
}
