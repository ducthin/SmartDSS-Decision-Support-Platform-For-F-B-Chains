package C2SE._1.Capstone2.service.impl;

import C2SE._1.Capstone2.dto.PageResponse;
import C2SE._1.Capstone2.dto.PublicTableBookingRequestDTO;
import C2SE._1.Capstone2.dto.TableBookingDTO;
import C2SE._1.Capstone2.dto.UpdateTableBookingStatusDTO;
import C2SE._1.Capstone2.entity.BookingStatus;
import C2SE._1.Capstone2.entity.TableBooking;
import C2SE._1.Capstone2.exception.BadRequestException;
import C2SE._1.Capstone2.exception.ResourceNotFoundException;
import C2SE._1.Capstone2.repository.TableBookingRepository;
import C2SE._1.Capstone2.service.TableBookingService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import C2SE._1.Capstone2.util.TimeUtil;

@Service
@RequiredArgsConstructor
@Transactional
public class TableBookingServiceImpl implements TableBookingService {

    private final TableBookingRepository tableBookingRepository;

    @Override
    public TableBookingDTO createPublicBooking(PublicTableBookingRequestDTO dto) {
        validateBookingDateTime(dto.getBookingDate(), dto.getBookingTime());

        TableBooking booking = TableBooking.builder()
                .customerName(dto.getCustomerName().trim())
                .customerPhone(normalizePhone(dto.getCustomerPhone()))
                .bookingDate(dto.getBookingDate())
                .bookingTime(dto.getBookingTime())
                .guestCount(dto.getGuestCount())
                .note(dto.getNote() == null ? null : dto.getNote().trim())
                .status(BookingStatus.NEW)
                .build();

        return toDTO(tableBookingRepository.save(booking));
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<TableBookingDTO> getAll(
            Pageable pageable,
            BookingStatus status,
            String keyword,
            LocalDate fromDate,
            LocalDate toDate
    ) {
        String normalizedKeyword = keyword == null || keyword.isBlank() ? null : keyword.trim();
        Page<TableBooking> page = tableBookingRepository.search(status, normalizedKeyword, fromDate, toDate, pageable);
        List<TableBookingDTO> data = page.getContent().stream().map(this::toDTO).toList();
        return PageResponse.of(page, data);
    }

    @Override
    public TableBookingDTO updateStatus(Long id, UpdateTableBookingStatusDTO dto) {
        TableBooking booking = tableBookingRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("TableBooking", "id", id));
        booking.setStatus(dto.getStatus());
        return toDTO(tableBookingRepository.save(booking));
    }

    private void validateBookingDateTime(LocalDate date, LocalTime time) {
        LocalDateTime bookingAt = LocalDateTime.of(date, time);
        if (bookingAt.isBefore(TimeUtil.nowVN().minusMinutes(5))) {
            throw new BadRequestException("Thời gian đặt bàn phải ở hiện tại hoặc tương lai");
        }
    }

    private String normalizePhone(String phone) {
        String cleaned = phone == null ? "" : phone.replaceAll("[^0-9+]", "");
        if (cleaned.startsWith("+84")) return "0" + cleaned.substring(3);
        if (cleaned.startsWith("84") && cleaned.length() > 9) return "0" + cleaned.substring(2);
        return cleaned;
    }

    private TableBookingDTO toDTO(TableBooking item) {
        return TableBookingDTO.builder()
                .id(item.getId())
                .customerName(item.getCustomerName())
                .customerPhone(item.getCustomerPhone())
                .bookingDate(item.getBookingDate())
                .bookingTime(item.getBookingTime())
                .guestCount(item.getGuestCount())
                .note(item.getNote())
                .status(item.getStatus())
                .createdAt(item.getCreatedAt())
                .updatedAt(item.getUpdatedAt())
                .build();
    }
}
