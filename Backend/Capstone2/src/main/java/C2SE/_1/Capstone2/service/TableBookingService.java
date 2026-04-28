package C2SE._1.Capstone2.service;

import C2SE._1.Capstone2.dto.PageResponse;
import C2SE._1.Capstone2.dto.PublicTableBookingRequestDTO;
import C2SE._1.Capstone2.dto.TableBookingDTO;
import C2SE._1.Capstone2.dto.UpdateTableBookingStatusDTO;
import C2SE._1.Capstone2.entity.BookingStatus;
import org.springframework.data.domain.Pageable;

import java.time.LocalDate;

public interface TableBookingService {
    TableBookingDTO createPublicBooking(PublicTableBookingRequestDTO dto);

    PageResponse<TableBookingDTO> getAll(
            Pageable pageable,
            BookingStatus status,
            String keyword,
            LocalDate fromDate,
            LocalDate toDate
    );

    TableBookingDTO updateStatus(Long id, UpdateTableBookingStatusDTO dto);
}
