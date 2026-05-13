package C2SE._1.Capstone2.util;

import C2SE._1.Capstone2.dto.DrinkSizeOptionDTO;
import C2SE._1.Capstone2.dto.DrinkToppingOptionDTO;
import C2SE._1.Capstone2.dto.MenuItemDTO;
import C2SE._1.Capstone2.dto.OrderToppingLineDTO;
import C2SE._1.Capstone2.entity.MenuItem;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.mapstruct.Named;
import org.springframework.stereotype.Component;

import java.util.Collections;
import java.util.List;

@Component
public class DrinkOptionsJsonMapper {

    private final ObjectMapper objectMapper = new ObjectMapper();

    public void attachDrinkLists(MenuItemDTO dto, MenuItem entity) {
        dto.setDrink(Boolean.TRUE.equals(entity.getDrink()));
        if (!Boolean.TRUE.equals(entity.getDrink())) {
            dto.setDrinkSizes(null);
            dto.setDrinkToppings(null);
            return;
        }
        dto.setDrinkSizes(parseSizes(entity.getDrinkSizesJson()));
        dto.setDrinkToppings(parseToppings(entity.getDrinkToppingsJson()));
    }

    public List<DrinkSizeOptionDTO> parseSizes(String json) {
        if (json == null || json.isBlank()) {
            return Collections.emptyList();
        }
        try {
            return objectMapper.readValue(json, new TypeReference<>() {});
        } catch (Exception e) {
            return Collections.emptyList();
        }
    }

    public List<DrinkToppingOptionDTO> parseToppings(String json) {
        if (json == null || json.isBlank()) {
            return Collections.emptyList();
        }
        try {
            return objectMapper.readValue(json, new TypeReference<>() {});
        } catch (Exception e) {
            return Collections.emptyList();
        }
    }

    public String toJsonSizes(List<DrinkSizeOptionDTO> list) {
        if (list == null || list.isEmpty()) {
            return null;
        }
        try {
            return objectMapper.writeValueAsString(list);
        } catch (Exception e) {
            throw new IllegalStateException("Cannot serialize drink sizes", e);
        }
    }

    public String toJsonToppings(List<DrinkToppingOptionDTO> list) {
        if (list == null || list.isEmpty()) {
            return null;
        }
        try {
            return objectMapper.writeValueAsString(list);
        } catch (Exception e) {
            throw new IllegalStateException("Cannot serialize drink toppings", e);
        }
    }

    public String toJsonToppingLines(List<OrderToppingLineDTO> list) {
        if (list == null || list.isEmpty()) {
            return null;
        }
        try {
            return objectMapper.writeValueAsString(list);
        } catch (Exception e) {
            throw new IllegalStateException("Cannot serialize topping snapshot", e);
        }
    }

    @Named("toppingSnapshotJsonToList")
    public List<OrderToppingLineDTO> toppingSnapshotJsonToList(String json) {
        if (json == null || json.isBlank()) {
            return Collections.emptyList();
        }
        try {
            return objectMapper.readValue(json, new TypeReference<>() {});
        } catch (Exception e) {
            return Collections.emptyList();
        }
    }
}
