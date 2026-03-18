package C2SE._1.Capstone2.service;

import C2SE._1.Capstone2.dto.CustomerFeedbackDTO;
import C2SE._1.Capstone2.dto.PageResponse;
import C2SE._1.Capstone2.dto.QrFeedbackDTO;
import org.springframework.data.domain.Pageable;

public interface CustomerFeedbackService {
    CustomerFeedbackDTO submitFeedback(String qrToken, QrFeedbackDTO dto);

    PageResponse<CustomerFeedbackDTO> getAllFeedbacks(Pageable pageable);
}
