package C2SE._1.Capstone2.service.impl;

import C2SE._1.Capstone2.dto.CustomerFeedbackDTO;
import C2SE._1.Capstone2.dto.PageResponse;
import C2SE._1.Capstone2.dto.QrFeedbackDTO;
import C2SE._1.Capstone2.entity.CustomerFeedback;
import C2SE._1.Capstone2.entity.CustomerFeedbackImage;
import C2SE._1.Capstone2.entity.DiningTable;
import C2SE._1.Capstone2.exception.BadRequestException;
import C2SE._1.Capstone2.exception.ResourceNotFoundException;
import C2SE._1.Capstone2.repository.CustomerFeedbackRepository;
import C2SE._1.Capstone2.repository.DiningTableRepository;
import C2SE._1.Capstone2.service.CustomerFeedbackService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
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
    private static final long MAX_IMAGE_BYTES = 5L * 1024 * 1024; // 5MB
    private static final int MAX_IMAGES = 5;

    private final DiningTableRepository diningTableRepository;
    private final CustomerFeedbackRepository customerFeedbackRepository;

    @Override
    public CustomerFeedbackDTO submitFeedback(String qrToken, QrFeedbackDTO dto) {
        DiningTable table = diningTableRepository.findByQrToken(qrToken)
                .orElseThrow(() -> new ResourceNotFoundException("DiningTable", "qrToken", qrToken));
        if (!Boolean.TRUE.equals(table.getActive())) {
            throw new BadRequestException("Bàn này hiện không hoạt động");
        }

        List<String> imageUrls = saveFeedbackImages(dto.getImages());

        CustomerFeedback feedback = CustomerFeedback.builder()
                .table(table)
                .tableName(table.getName())
                .customerName(dto.getCustomerName().trim())
                .customerPhone(dto.getCustomerPhone().trim())
                .customerEmail(dto.getCustomerEmail().trim())
                .rating(dto.getRating())
                .content(dto.getContent().trim())
                .imageUrl(imageUrls.isEmpty() ? null : imageUrls.get(0))
                .build();

        List<CustomerFeedbackImage> images = new ArrayList<>();
        for (String url : imageUrls) {
            images.add(CustomerFeedbackImage.builder().feedback(feedback).imageUrl(url).build());
        }
        feedback.setImages(images);

        return toDTO(customerFeedbackRepository.save(feedback));
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<CustomerFeedbackDTO> getAllFeedbacks(Pageable pageable) {
        Page<CustomerFeedback> page = customerFeedbackRepository.findAllByOrderByCreatedAtDesc(pageable);
        List<CustomerFeedbackDTO> data = page.getContent().stream().map(this::toDTO).toList();
        return PageResponse.of(page, data);
    }

    private List<String> saveFeedbackImages(List<MultipartFile> images) {
        if (images == null || images.isEmpty()) return List.of();
        if (images.size() > MAX_IMAGES) {
            throw new BadRequestException("Tối đa " + MAX_IMAGES + " ảnh cho mỗi feedback");
        }

        List<String> urls = new ArrayList<>();
        for (MultipartFile image : images) {
            if (image == null || image.isEmpty()) continue;
            if (image.getSize() > MAX_IMAGE_BYTES) {
                throw new BadRequestException("Mỗi ảnh tối đa 5MB");
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
                Path uploadDir = Paths.get("uploads", "feedbacks");
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
                .createdAt(item.getCreatedAt())
                .build();
    }
}
