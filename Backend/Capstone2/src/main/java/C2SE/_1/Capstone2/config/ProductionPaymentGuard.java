package C2SE._1.Capstone2.config;

import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.Locale;

@Component
public class ProductionPaymentGuard {

    @Value("${spring.profiles.active:}")
    private String activeProfiles;

    @Value("${app.payment.webhook.secret:}")
    private String webhookSecret;

    @Value("${app.payment.webhook.allow-insecure:false}")
    private boolean allowInsecureWebhook;

    @Value("${app.payment.payos.client-id:}")
    private String payosClientId;

    @Value("${app.payment.payos.api-key:}")
    private String payosApiKey;

    @Value("${app.payment.payos.checksum-key:}")
    private String payosChecksumKey;

    @PostConstruct
    void validate() {
        if (!isProductionProfile()) {
            return;
        }

        if (isBlank(webhookSecret)) {
            throw new IllegalStateException("Missing APP_PAYMENT_WEBHOOK_SECRET in production profile");
        }
        if (allowInsecureWebhook) {
            throw new IllegalStateException("APP_PAYMENT_WEBHOOK_ALLOW_INSECURE must be false in production profile");
        }
        if (isBlank(payosClientId) || isBlank(payosApiKey) || isBlank(payosChecksumKey)) {
            throw new IllegalStateException("Missing PayOS credentials in production profile");
        }
    }

    private boolean isProductionProfile() {
        if (isBlank(activeProfiles)) {
            return false;
        }
        String normalized = activeProfiles.toLowerCase(Locale.ROOT);
        return normalized.contains("prod") || normalized.contains("production");
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
