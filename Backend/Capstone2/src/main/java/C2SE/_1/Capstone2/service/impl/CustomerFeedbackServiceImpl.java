package C2SE._1.Capstone2.service.impl;

import C2SE._1.Capstone2.dto.CustomerFeedbackDTO;
import C2SE._1.Capstone2.dto.FeedbackAlertDTO;
import C2SE._1.Capstone2.dto.FeedbackStatsDTO;
import C2SE._1.Capstone2.dto.PageResponse;
import C2SE._1.Capstone2.dto.QrFeedbackDTO;
import C2SE._1.Capstone2.dto.UpdateFeedbackStatusDTO;
import C2SE._1.Capstone2.entity.CustomerFeedback;
import C2SE._1.Capstone2.entity.CustomerFeedbackImage;
import C2SE._1.Capstone2.entity.DiningTable;
import C2SE._1.Capstone2.entity.FeedbackStatus;
import C2SE._1.Capstone2.exception.BadRequestException;
import C2SE._1.Capstone2.exception.ResourceNotFoundException;
import C2SE._1.Capstone2.repository.CustomerFeedbackRepository;
import C2SE._1.Capstone2.repository.DiningTableRepository;
import C2SE._1.Capstone2.service.CustomerFeedbackService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class CustomerFeedbackServiceImpl implements CustomerFeedbackService {

    private static final Set<String> ALLOWED_IMAGE_CONTENT_TYPES = Set.of(
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/gif"
    );
    private static final long MB = 1024L * 1024L;

    @Value("${app.feedback.image.max-size-mb:5}")
    private long maxImageSizeMb;
    @Value("${app.feedback.image.max-count:5}")
    private int maxImages;
    @Value("${app.feedback.spam.cooldown-minutes:2}")
    private int feedbackCooldownMinutes;
    @Value("${app.feedback.spam.max-per-phone-24h:5}")
    private int maxFeedbackPerPhonePer24h;
    @Value("${app.feedback.spam.max-per-table-per-minute:3}")
    private int maxFeedbackPerTablePerMinute;
    @Value("${app.feedback.alert.low-rating-threshold:2}")
    private int lowRatingThreshold;
    @Value("${app.feedback.alert.critical-low-rating-count:2}")
    private int criticalLowRatingCount;
    @Value("${app.feedback.alert.window-minutes:30}")
    private int alertWindowMinutes;
    @Value("${app.upload.dir:}")
    private String configuredUploadDir;

    private final DiningTableRepository diningTableRepository;
    private final CustomerFeedbackRepository customerFeedbackRepository;
    private final SimpMessagingTemplate messagingTemplate;

    @Override
    public CustomerFeedbackDTO submitFeedback(String qrToken, QrFeedbackDTO dto) {
        DiningTable table = diningTableRepository.findByQrToken(qrToken)
                .orElseThrow(() -> new ResourceNotFoundException("DiningTable", "qrToken", qrToken));
        if (!Boolean.TRUE.equals(table.getActive())) {
            throw new BadRequestException("Bàn này hiện không hoạt động");
        }

        // Basic anti-spam: cooldown by table+phone, cap per day by phone and cap per minute by table.
        LocalDateTime now = LocalDateTime.now();
        String customerPhone = dto.getCustomerPhone().trim();
        if (customerFeedbackRepository.existsByTableNameAndCustomerPhoneAndCreatedAtAfter(
                table.getName(), customerPhone, now.minusMinutes(feedbackCooldownMinutes))) {
            throw new BadRequestException("Bạn vừa gửi feedback gần đây, vui lòng chờ thêm ít phút");
        }
        long phoneDailyCount = customerFeedbackRepository.countByCustomerPhoneAndCreatedAtAfter(
                customerPhone, now.minusHours(24));
        if (phoneDailyCount >= maxFeedbackPerPhonePer24h) {
            throw new BadRequestException("Bạn đã gửi quá nhiều feedback trong 24 giờ, vui lòng thử lại sau");
        }
        long tableMinuteCount = customerFeedbackRepository.countByTableNameAndCreatedAtAfter(
                table.getName(), now.minusMinutes(1));
        if (tableMinuteCount >= maxFeedbackPerTablePerMinute) {
            throw new BadRequestException("Hệ thống đang nhận quá nhiều feedback từ bàn này, vui lòng thử lại sau");
        }

        List<String> imageUrls = saveFeedbackImages(dto.getImages());

        CustomerFeedback feedback = CustomerFeedback.builder()
                .table(table)
                .tableName(table.getName())
                .customerName(dto.getCustomerName().trim())
                .customerPhone(customerPhone)
                .customerEmail(dto.getCustomerEmail().trim())
                .rating(dto.getRating())
                .content(dto.getContent().trim())
                .imageUrl(imageUrls.isEmpty() ? null : imageUrls.get(0))
                .status(FeedbackStatus.NEW)
                .build();

        List<CustomerFeedbackImage> images = new ArrayList<>();
        for (String url : imageUrls) {
            images.add(CustomerFeedbackImage.builder().feedback(feedback).imageUrl(url).build());
        }
        feedback.setImages(images);

        CustomerFeedbackDTO savedDto = toDTO(customerFeedbackRepository.save(feedback));

        // Operational alert: broadcast all feedback and highlight low-rating items.
        messagingTemplate.convertAndSend("/topic/feedbacks", savedDto);
        if (savedDto.getRating() != null && savedDto.getRating() <= lowRatingThreshold) {
            long lowRatingCount = customerFeedbackRepository.countLowRatingByTableInWindow(
                    savedDto.getTableName(),
                    lowRatingThreshold,
                    LocalDateTime.now().minusMinutes(alertWindowMinutes)
            );
            String level = lowRatingCount >= criticalLowRatingCount ? "CRITICAL" : "HIGH";
            FeedbackAlertDTO alert = FeedbackAlertDTO.builder()
                    .feedbackId(savedDto.getId())
                    .tableName(savedDto.getTableName())
                    .customerName(savedDto.getCustomerName())
                    .rating(savedDto.getRating())
                    .content(savedDto.getContent())
                    .level(level)
                    .lowRatingCountInWindow(lowRatingCount)
                    .windowMinutes(alertWindowMinutes)
                    .createdAt(savedDto.getCreatedAt())
                    .build();
            messagingTemplate.convertAndSend("/topic/feedback-alerts", alert);
        }

        return savedDto;
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<CustomerFeedbackDTO> getAllFeedbacks(
            Pageable pageable,
            FeedbackStatus status,
            Integer rating,
            String keyword,
            LocalDate fromDate,
            LocalDate toDate
    ) {
        LocalDateTime fromDateTime = fromDate != null ? fromDate.atStartOfDay() : null;
        LocalDateTime toDateTime = toDate != null ? toDate.plusDays(1).atStartOfDay().minusNanos(1) : null;
        String normalizedKeyword = keyword == null || keyword.isBlank() ? null : keyword.trim();
        Page<CustomerFeedback> page = customerFeedbackRepository.search(
                status,
                rating,
                normalizedKeyword,
                fromDateTime,
                toDateTime,
                pageable
        );
        List<CustomerFeedbackDTO> data = page.getContent().stream().map(this::toDTO).toList();
        return PageResponse.of(page, data);
    }

    @Override
    public CustomerFeedbackDTO updateFeedbackStatus(Long id, UpdateFeedbackStatusDTO dto) {
        CustomerFeedback feedback = customerFeedbackRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("CustomerFeedback", "id", id));
        feedback.setStatus(dto.getStatus());
        feedback.setInternalNote(dto.getInternalNote() == null ? null : dto.getInternalNote().trim());
        CustomerFeedbackDTO updated = toDTO(customerFeedbackRepository.save(feedback));
        messagingTemplate.convertAndSend("/topic/feedbacks", updated);
        return updated;
    }

    @Override
    @Transactional(readOnly = true)
    public FeedbackStatsDTO getFeedbackStats() {
        LocalDateTime startToday = LocalDate.now().atStartOfDay();
        LocalDateTime endToday = startToday.plusDays(1).minusNanos(1);
        return FeedbackStatsDTO.builder()
                .total(customerFeedbackRepository.count())
                .newCount(customerFeedbackRepository.countByStatus(FeedbackStatus.NEW))
                .inReviewCount(customerFeedbackRepository.countByStatus(FeedbackStatus.IN_REVIEW))
                .resolvedCount(customerFeedbackRepository.countByStatus(FeedbackStatus.RESOLVED))
                .lowRatingCount(customerFeedbackRepository.countByRatingLessThanEqual(lowRatingThreshold))
                .todayCount(customerFeedbackRepository.countByCreatedAtBetween(startToday, endToday))
                .averageRating(customerFeedbackRepository.averageRating())
                .build();
    }

    private List<String> saveFeedbackImages(List<MultipartFile> images) {
        if (images == null || images.isEmpty()) return List.of();
        if (images.size() > maxImages) {
            throw new BadRequestException("Tối đa " + maxImages + " ảnh cho mỗi feedback");
        }

        List<String> urls = new ArrayList<>();
        for (MultipartFile image : images) {
            if (image == null || image.isEmpty()) continue;
            if (image.getSize() > (maxImageSizeMb * MB)) {
                throw new BadRequestException("Mỗi ảnh tối đa " + maxImageSizeMb + "MB");
            }

            String contentType = image.getContentType();
            if (contentType == null || !ALLOWED_IMAGE_CONTENT_TYPES.contains(contentType)) {
                throw new BadRequestException("Chỉ hỗ trợ ảnh JPG/PNG/WEBP/GIF");
            }

            String original = StringUtils.cleanPath(
                    image.getOriginalFilename() == null ? "feedback-image" : image.getOriginalFilename()
            );
            String ext = "";
            int dot = original.lastIndexOf('.');
            if (dot >= 0 && dot < original.length() - 1) {
                ext = original.substring(dot).toLowerCase();
            }
            if (ext.isBlank()) {
                ext = switch (contentType) {
                    case "image/png" -> ".png";
                    case "image/webp" -> ".webp";
                    case "image/gif" -> ".gif";
                    default -> ".jpg";
                };
            }

            try {
                Path uploadDir;
                if (configuredUploadDir != null && !configuredUploadDir.isBlank()) {
                    uploadDir = Paths.get(configuredUploadDir, "feedbacks");
                } else {
                    // Auto-detect the actual uploads directory from known candidate locations
                    uploadDir = resolveUploadsDir().resolve("feedbacks");
                }
                Files.createDirectories(uploadDir);

                String filename = "feedback-" + UUID.randomUUID() + ext;
                Path target = uploadDir.resolve(filename);
                Files.write(target, image.getBytes());
                urls.add("/uploads/feedbacks/" + filename);
            } catch (IOException e) {
                throw new BadRequestException("Không thể lưu ảnh feedback");
            }
        }
        return urls;
    }

    /**
     * Finds the uploads directory by checking candidate paths in order:
     * 1. The JVM working directory (works when launched from Capstone2/)
     * 2. SmartDSS/Backend/Capstone2/uploads (works when launched from Code/)
     */
    private Path resolveUploadsDir() {
        Path cwd = Paths.get("").toAbsolutePath();
        Path[] candidates = {
                cwd.resolve("uploads"),
                cwd.resolve("SmartDSS/Backend/Capstone2/uploads"),
                cwd.resolve("Capstone2/uploads"),
                cwd.resolve("Backend/Capstone2/uploads"),
        };
        for (Path candidate : candidates) {
            if (candidate.toFile().exists()) {
                return candidate;
            }
        }
        // Fallback: create in working directory
        return cwd.resolve("uploads");
    }

    private CustomerFeedbackDTO toDTO(CustomerFeedback item) {
        List<CustomerFeedbackImage> images = item.getImages() == null ? List.of() : item.getImages();
        List<String> imageUrls = images.stream().map(CustomerFeedbackImage::getImageUrl).toList();
        if (imageUrls.isEmpty() && item.getImageUrl() != null && !item.getImageUrl().isBlank()) {
            imageUrls = List.of(item.getImageUrl());
        }
        return CustomerFeedbackDTO.builder()
                .id(item.getId())
                .tableName(item.getTableName())
                .customerName(item.getCustomerName())
                .customerPhone(item.getCustomerPhone())
                .customerEmail(item.getCustomerEmail())
                .rating(item.getRating())
                .content(item.getContent())
                .imageUrl(item.getImageUrl())
                .imageUrls(imageUrls)
                .status(item.getStatus())
                .internalNote(item.getInternalNote())
                .createdAt(item.getCreatedAt())
                .build();
    }
}
