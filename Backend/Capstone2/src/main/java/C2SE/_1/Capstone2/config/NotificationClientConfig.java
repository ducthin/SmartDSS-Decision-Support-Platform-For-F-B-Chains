package C2SE._1.Capstone2.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestTemplate;

@Configuration
public class NotificationClientConfig {

    @Bean(name = "notificationRestTemplate")
    public RestTemplate notificationRestTemplate(@Value("${app.notification.timeout-ms:8000}") int timeoutMs) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        int safeTimeoutMs = Math.max(1000, timeoutMs);
        factory.setConnectTimeout(Math.min(safeTimeoutMs, 5000));
        factory.setReadTimeout(safeTimeoutMs);
        return new RestTemplate(factory);
    }
}
