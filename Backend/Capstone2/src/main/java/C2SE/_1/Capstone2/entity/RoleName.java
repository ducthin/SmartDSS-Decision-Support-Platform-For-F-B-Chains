package C2SE._1.Capstone2.entity;

import java.util.List;

public enum RoleName {
    ADMIN,
    MANAGER,
    STAFF;

    public static List<RoleName> activeRoles() {
        return List.of(ADMIN, MANAGER, STAFF);
    }

    public static RoleName fromInput(String value) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("Role is required");
        }

        String normalized = value.trim().toUpperCase();
        if ("BARISTA".equals(normalized) || "WAITER".equals(normalized)) {
            return STAFF;
        }

        return RoleName.valueOf(normalized);
    }
}
