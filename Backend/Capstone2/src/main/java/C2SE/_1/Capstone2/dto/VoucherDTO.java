package C2SE._1.Capstone2.dto;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VoucherDTO {

    private Long id;

    @NotBlank(message = "Mã voucher không được để trống")
    @Size(max = 64, message = "Mã voucher tối đa 64 ký tự")
    private String code;

    @NotBlank(message = "Tên voucher không được để trống")
    @Size(max = 200, message = "Tên voucher tối đa 200 ký tự")
    private String name;

    @Size(max = 500, message = "Mô tả tối đa 500 ký tự")
    private String description;

    @NotNull(message = "Loại giảm giá không được để trống")
    private String discountType;

    @NotNull(message = "Giá trị giảm không được để trống")
    @DecimalMin(value = "0.01", message = "Giá trị giảm phải > 0")
    private BigDecimal discountValue;

    @DecimalMin(value = "0.0", message = "Đơn tối thiểu phải >= 0")
    private BigDecimal minOrderAmount;

    @DecimalMin(value = "0.0", message = "Giảm tối đa phải >= 0")
    private BigDecimal maxDiscountAmount;

    private LocalDateTime validFrom;
    private LocalDateTime validTo;

    private Boolean active;

    @Min(value = 1, message = "Giới hạn sử dụng phải >= 1")
    private Integer usageLimit;

    private Integer usedCount;
    private String customerPhone;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @AssertTrue(message = "Giảm tối đa phải <= 100% khi dùng voucher phần trăm")
    public boolean isPercentDiscountValid() {
        if (discountType == null || discountValue == null) {
            return true;
        }
        if (!"PERCENT".equalsIgnoreCase(discountType.trim())) {
            return true;
        }
        return discountValue.compareTo(BigDecimal.valueOf(100)) <= 0;
    }

    @AssertTrue(message = "Thời gian hiệu lực không hợp lệ")
    public boolean isValidRange() {
        if (validFrom == null || validTo == null) {
            return true;
        }
        return !validFrom.isAfter(validTo);
    }
}
