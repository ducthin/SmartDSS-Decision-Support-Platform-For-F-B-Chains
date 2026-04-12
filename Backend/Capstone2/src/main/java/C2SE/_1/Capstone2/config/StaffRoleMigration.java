package C2SE._1.Capstone2.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * One-time migration to merge legacy WAITER/BARISTA roles into STAFF.
 */
@Component
@RequiredArgsConstructor
@Slf4j
@ConditionalOnProperty(name = "app.roles.migrate-merge-service-roles", havingValue = "true", matchIfMissing = true)
public class StaffRoleMigration implements CommandLineRunner {

    private final JdbcTemplate jdbcTemplate;

    @Override
    @Transactional
    public void run(String... args) {
        Integer staffRoleId = ensureRole("STAFF");
        Integer waiterRoleId = queryRoleId("WAITER");
        Integer baristaRoleId = queryRoleId("BARISTA");

        int fromWaiter = 0;
        int fromBarista = 0;
        int deletedWaiter = 0;
        int deletedBarista = 0;

        if (waiterRoleId != null) {
            fromWaiter = jdbcTemplate.update(
                    "UPDATE users u SET u.role_id = ? WHERE u.role_id = ?",
                    staffRoleId, waiterRoleId
            );
            deletedWaiter = jdbcTemplate.update("DELETE FROM roles WHERE id = ?", waiterRoleId);
        }

        if (baristaRoleId != null) {
            fromBarista = jdbcTemplate.update(
                    "UPDATE users u SET u.role_id = ? WHERE u.role_id = ?",
                    staffRoleId, baristaRoleId
            );
            deletedBarista = jdbcTemplate.update("DELETE FROM roles WHERE id = ?", baristaRoleId);
        }

        log.info("StaffRoleMigration: merged users waiter={} barista={} into STAFF, deleted roles waiter={} barista={}",
                fromWaiter, fromBarista, deletedWaiter, deletedBarista);
    }

    private Integer queryRoleId(String roleName) {
        return jdbcTemplate.query(
                "SELECT id FROM roles WHERE name = ? LIMIT 1",
                (rs, rowNum) -> rs.getInt("id"),
                roleName
        ).stream().findFirst().orElse(null);
    }

    private Integer ensureRole(String roleName) {
        Integer id = queryRoleId(roleName);
        if (id != null) return id;

        jdbcTemplate.update(
                "INSERT INTO roles(name, description, created_at, updated_at) VALUES(?, ?, NOW(), NOW())",
                roleName,
                roleName + " role"
        );
        return queryRoleId(roleName);
    }
}

