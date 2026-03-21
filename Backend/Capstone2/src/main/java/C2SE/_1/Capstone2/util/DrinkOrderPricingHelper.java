package C2SE._1.Capstone2.util;

import C2SE._1.Capstone2.dto.DrinkSizeOptionDTO;
import C2SE._1.Capstone2.dto.DrinkToppingOptionDTO;
import C2SE._1.Capstone2.dto.OrderToppingLineDTO;
import C2SE._1.Capstone2.entity.MenuItem;
import C2SE._1.Capstone2.exception.BadRequestException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Component
@RequiredArgsConstructor
public class DrinkOrderPricingHelper {

    private final DrinkOptionsJsonMapper jsonMapper;

    public record ResolvedDrinkLine(
            BigDecimal unitPrice,
            String sizeCode,
            String sizeLabel,
            String toppingsJson
    ) {}

    /**
     * Computes final unit price and persisted size/topping snapshot for one order line.
     */
    public ResolvedDrinkLine resolve(MenuItem menuItem, String selectedSizeCode, List<String> selectedToppingCodes) {
        BigDecimal base = menuItem.getPrice() != null ? menuItem.getPrice() : BigDecimal.ZERO;
        boolean drink = Boolean.TRUE.equals(menuItem.getDrink());
        boolean hasSize = selectedSizeCode != null && !selectedSizeCode.isBlank();
        boolean hasToppings = selectedToppingCodes != null && !selectedToppingCodes.isEmpty();

        if (!drink) {
            if (hasSize || hasToppings) {
                throw new BadRequestException("Món \"" + menuItem.getName() + "\" không hỗ trợ chọn size/topping");
            }
            return new ResolvedDrinkLine(base, null, null, null);
        }

        if (!hasSize) {
            throw new BadRequestException("Vui lòng chọn size cho đồ uống: " + menuItem.getName());
        }

        List<DrinkSizeOptionDTO> sizes = jsonMapper.parseSizes(menuItem.getDrinkSizesJson());
        if (sizes.isEmpty()) {
            throw new BadRequestException("Món đồ uống chưa cấu hình size: " + menuItem.getName());
        }

        DrinkSizeOptionDTO sizePick = sizes.stream()
                .filter(s -> selectedSizeCode.equals(s.getCode()))
                .findFirst()
                .orElseThrow(() -> new BadRequestException("Size không hợp lệ cho món: " + menuItem.getName()));

        BigDecimal sizeExtra = sizePick.getPriceExtra() != null ? sizePick.getPriceExtra() : BigDecimal.ZERO;

        List<String> codes = selectedToppingCodes == null ? List.of() : selectedToppingCodes;
        List<DrinkToppingOptionDTO> toppingDefs = jsonMapper.parseToppings(menuItem.getDrinkToppingsJson());
        List<OrderToppingLineDTO> lines = new ArrayList<>();
        for (String code : codes) {
            if (code == null || code.isBlank()) {
                continue;
            }
            DrinkToppingOptionDTO t = toppingDefs.stream()
                    .filter(x -> code.equals(x.getCode()))
                    .findFirst()
                    .orElseThrow(() -> new BadRequestException("Topping không hợp lệ: " + code + " (" + menuItem.getName() + ")"));
            lines.add(OrderToppingLineDTO.builder()
                    .code(t.getCode())
                    .label(t.getLabel())
                    .price(t.getPrice() != null ? t.getPrice() : BigDecimal.ZERO)
                    .build());
        }

        BigDecimal toppingsSum = lines.stream()
                .map(OrderToppingLineDTO::getPrice)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        String toppingsJson = jsonMapper.toJsonToppingLines(lines);
        BigDecimal unit = base.add(sizeExtra).add(toppingsSum);
        return new ResolvedDrinkLine(unit, sizePick.getCode(), sizePick.getLabel(), toppingsJson);
    }
}
