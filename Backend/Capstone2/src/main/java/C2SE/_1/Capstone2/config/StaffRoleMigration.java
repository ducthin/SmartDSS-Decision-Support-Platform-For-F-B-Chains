package C2SE._1.Capstone2.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * One-time migration to remove legacy STAFF role in DB.
 * Reassigns STAFF users to WAITER by default (or BARISTA if username contains 'barista'),
 * then removes STAFF role record.
 */
@Component
@RequiredArgsConstructor
@Slf4j
@ConditionalOnProperty(name = "app.roles.migrate-remove-staff", havingValue = "true", matchIfMissing = true)
public class StaffRoleMigration implements CommandLineRunner {

    private final JdbcTemplate jdbcTemplate;

    @Override
    @Transactional
    public void run(String... args) {
        Integer staffRoleId = queryRoleId("STAFF");
        if (staffRoleId == null) return;

        Integer waiterRoleId = ensureRole("WAITER");
        Integer baristaRoleId = ensureRole("BARISTA");

        int toBarista = jdbcTemplate.update(
                "UPDATE users u SET u.role_id = ? WHERE u.role_id = ? AND LOWER(u.username) LIKE '%barista%'",
                baristaRoleId, staffRoleId
        );
        int toWaiter = jdbcTemplate.update(
                "UPDATE users u SET u.role_id = ? WHERE u.role_id = ?",
                waiterRoleId, staffRoleId
        );

        int deleted = jdbcTemplate.update("DELETE FROM roles WHERE id = ?", staffRoleId);
        log.info("StaffRoleMigration: reassigned {} to BARISTA, {} to WAITER, deleted STAFF role={}",
                toBarista, toWaiter, deleted);
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

