package C2SE._1.Capstone2.service.impl;

import C2SE._1.Capstone2.dto.PageResponse;
import C2SE._1.Capstone2.dto.VoucherDTO;
import C2SE._1.Capstone2.entity.Voucher;
import C2SE._1.Capstone2.exception.BadRequestException;
import C2SE._1.Capstone2.exception.ResourceNotFoundException;
import C2SE._1.Capstone2.mapper.VoucherMapper;
import C2SE._1.Capstone2.repository.VoucherRepository;
import C2SE._1.Capstone2.service.CustomerNotificationService;
import C2SE._1.Capstone2.service.VoucherService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class VoucherServiceImpl implements VoucherService {

    private final VoucherRepository voucherRepository;
    private final VoucherMapper voucherMapper;
    private final CustomerNotificationService customerNotificationService;

    @Override
    @Transactional(readOnly = true)
    public PageResponse<VoucherDTO> getAllVouchers(String keyword, Pageable pageable) {
        String normalizedKeyword = (keyword == null || keyword.isBlank()) ? null : keyword.trim();
        Page<Voucher> page = voucherRepository.search(normalizedKeyword, pageable);
        return PageResponse.of(page, voucherMapper.toDTOList(page.getContent()));
    }

    @Override
    @Transactional(readOnly = true)
    public VoucherDTO getVoucherById(Long id) {
        Voucher voucher = voucherRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Voucher", "id", id));
        return voucherMapper.toDTO(voucher);
    }

    @Override
    @Transactional(readOnly = true)
    public List<VoucherDTO> getAvailablePersonalVouchers(String phone) {
        String normalizedPhone = normalizePhone(phone);
        return voucherMapper.toDTOList(
                voucherRepository.findAvailablePersonalVouchers(List.of(normalizedPhone), LocalDateTime.now())
        );
    }

    @Override
    public VoucherDTO createVoucher(VoucherDTO dto) {
        Voucher voucher = voucherMapper.toEntity(dto);
        voucher.setCode(normalizeCode(dto.getCode()));

        if (voucherRepository.findByCodeIgnoreCase(voucher.getCode()).isPresent()) {
            throw new BadRequestException("Mã voucher đã tồn tại: " + voucher.getCode());
        }

        hydrateVoucherDefaults(voucher);
        validateVoucher(voucher);

        Voucher savedVoucher = voucherRepository.save(voucher);
        customerNotificationService.notifyPromotionVoucher(savedVoucher);
        return voucherMapper.toDTO(savedVoucher);
    }

    @Override
    public VoucherDTO updateVoucher(Long id, VoucherDTO dto) {
        Voucher voucher = voucherRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Voucher", "id", id));

        String nextCode = normalizeCode(dto.getCode());
        voucherRepository.findByCodeIgnoreCase(nextCode).ifPresent(existing -> {
            if (!existing.getId().equals(id)) {
                throw new BadRequestException("Mã voucher đã tồn tại: " + nextCode);
            }
        });

        voucherMapper.updateEntityFromDTO(dto, voucher);
        voucher.setCode(nextCode);

        hydrateVoucherDefaults(voucher);
        validateVoucher(voucher);

        Voucher savedVoucher = voucherRepository.save(voucher);
        customerNotificationService.notifyPromotionVoucher(savedVoucher);
        return voucherMapper.toDTO(savedVoucher);
    }

    @Override
    public void deleteVoucher(Long id) {
        if (!voucherRepository.existsById(id)) {
            throw new ResourceNotFoundException("Voucher", "id", id);
        }
        voucherRepository.deleteById(id);
    }

    private String normalizeCode(String code) {
        if (code == null || code.isBlank()) {
            throw new BadRequestException("Mã voucher không được để trống");
        }
        return code.trim().toUpperCase();
    }

    private void hydrateVoucherDefaults(Voucher voucher) {
        if (voucher.getActive() == null) {
            voucher.setActive(true);
        }
        if (voucher.getUsedCount() == null) {
            voucher.setUsedCount(0);
        }
        if (voucher.getMinOrderAmount() == null) {
            voucher.setMinOrderAmount(BigDecimal.ZERO);
        }
        if (voucher.getCustomerPhone() != null && !voucher.getCustomerPhone().isBlank()) {
            voucher.setCustomerPhone(normalizePhone(voucher.getCustomerPhone()));
        }
    }

    private void validateVoucher(Voucher voucher) {
        if (voucher.getValidFrom() != null && voucher.getValidTo() != null
            && voucher.getValidFrom().isAfter(voucher.getValidTo())) {
            throw new BadRequestException("Thời gian hiệu lực voucher không hợp lệ");
        }
        if (voucher.getUsageLimit() != null && voucher.getUsageLimit() < voucher.getUsedCount()) {
            throw new BadRequestException("Giới hạn sử dụng không được nhỏ hơn số lượt đã dùng");
        }
        if (voucher.getDiscountType() == Voucher.DiscountType.PERCENT
                && voucher.getDiscountValue() != null
                && voucher.getDiscountValue().compareTo(BigDecimal.valueOf(100)) > 0) {
            throw new BadRequestException("Voucher phần trăm không được vượt quá 100%");
        }
    }

    private String normalizePhone(String phone) {
        if (phone == null || phone.isBlank()) {
            throw new BadRequestException("Số điện thoại không hợp lệ");
        }
        String normalized = phone.replaceAll("\\s+", "").trim();
        if (!normalized.matches("^[+0-9][0-9]{8,19}$")) {
            throw new BadRequestException("Số điện thoại không hợp lệ");
        }
        return normalized;
    }
}
