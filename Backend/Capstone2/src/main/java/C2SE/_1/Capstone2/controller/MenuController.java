package C2SE._1.Capstone2.controller;

import C2SE._1.Capstone2.dto.ApiResponse;
import C2SE._1.Capstone2.dto.MenuItemDTO;
import C2SE._1.Capstone2.service.MenuService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/menu")
@RequiredArgsConstructor
public class MenuController {

    private final MenuService menuService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<MenuItemDTO>>> getAllMenuItems() {
        return ResponseEntity.ok(ApiResponse.success(menuService.getAllMenuItems()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<MenuItemDTO>> getMenuItemById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(menuService.getMenuItemById(id)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<MenuItemDTO>> createMenuItem(@RequestBody MenuItemDTO menuItemDTO) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(menuService.createMenuItem(menuItemDTO)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<MenuItemDTO>> updateMenuItem(@PathVariable Long id, @RequestBody MenuItemDTO menuItemDTO) {
        return ResponseEntity.ok(ApiResponse.success(menuService.updateMenuItem(id, menuItemDTO)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteMenuItem(@PathVariable Long id) {
        menuService.deleteMenuItem(id);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
