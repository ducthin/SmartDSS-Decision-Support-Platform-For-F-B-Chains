package C2SE._1.Capstone2.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CashClosingCreateDTO {

    private LocalDate businessDate;

    @DecimalMin(value = "0", message = "Tồn đầu phải >= 0")
    private BigDecimal openingBalance;

    @NotNull(message = "Tồn thực tế không được để trống")
    @DecimalMin(value = "0", message = "Tồn thực tế phải >= 0")
    private BigDecimal actualBalance;

    private String note;
}
