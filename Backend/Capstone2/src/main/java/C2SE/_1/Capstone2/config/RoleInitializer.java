package C2SE._1.Capstone2.config;

import C2SE._1.Capstone2.entity.Role;
import C2SE._1.Capstone2.entity.RoleName;
import C2SE._1.Capstone2.repository.RoleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@RequiredArgsConstructor
@Slf4j
@ConditionalOnProperty(name = "app.roles.sync-enabled", havingValue = "true", matchIfMissing = true)
public class RoleInitializer implements CommandLineRunner {

    private final RoleRepository roleRepository;

    @Override
    @Transactional
    public void run(String... args) {
        int created = 0;
        for (RoleName roleName : RoleName.activeRoles()) {
            if (roleRepository.findByName(roleName).isEmpty()) {
                roleRepository.save(Role.builder()
                        .name(roleName)
                        .description(roleName.name() + " role")
                        .build());
                created++;
            }
        }
        if (created > 0) {
            log.info("RoleInitializer created {} missing roles", created);
        }
    }
}

