package C2SE._1.Capstone2.config;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;

class SecurityConfigPublicRoutesTest {

    private static final Path SECURITY_CONFIG_FILE = Path.of(
            "src/main/java/C2SE/_1/Capstone2/config/SecurityConfig.java"
    );

    @Test
    @DisplayName("Không dùng wildcard permitAll cho toàn bộ /api/v1/public/**")
    void shouldNotUseBroadPublicWildcard() throws IOException {
        String source = Files.readString(SECURITY_CONFIG_FILE);
        assertThat(source).doesNotContain(".requestMatchers(\"/api/v1/public/**\").permitAll()");
    }

    @Test
    @DisplayName("Có whitelist cụ thể cho public endpoints bắt buộc")
    void shouldWhitelistRequiredPublicEndpoints() throws IOException {
        String source = Files.readString(SECURITY_CONFIG_FILE);
        assertThat(source)
                .contains(".requestMatchers(HttpMethod.GET, \"/api/v1/public/config/tax\").permitAll()")
                .contains(".requestMatchers(HttpMethod.GET, \"/api/v1/public/qr/**\").permitAll()")
                .contains(".requestMatchers(HttpMethod.POST, \"/api/v1/public/qr/**\").permitAll()")
                .contains(".requestMatchers(HttpMethod.POST, \"/api/v1/public/payments/webhook\").permitAll()")
                .contains(".requestMatchers(HttpMethod.POST, \"/api/v1/public/payments/payos/webhook\").permitAll()");
    }
}
