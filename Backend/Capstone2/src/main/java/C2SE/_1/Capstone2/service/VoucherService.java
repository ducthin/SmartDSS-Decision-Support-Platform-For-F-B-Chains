package C2SE._1.Capstone2.service;

import C2SE._1.Capstone2.dto.PageResponse;
import C2SE._1.Capstone2.dto.VoucherDTO;
import org.springframework.data.domain.Pageable;

public interface VoucherService {

    PageResponse<VoucherDTO> getAllVouchers(String keyword, Pageable pageable);

    VoucherDTO getVoucherById(Long id);

    java.util.List<VoucherDTO> getAvailablePersonalVouchers(String phone);

    VoucherDTO createVoucher(VoucherDTO dto);

    VoucherDTO updateVoucher(Long id, VoucherDTO dto);

    void deleteVoucher(Long id);
}
