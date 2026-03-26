package C2SE._1.Capstone2.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestTemplate;

@Configuration
public class MlServiceClientConfig {

    @Bean(name = "mlServiceRestTemplate")
    public RestTemplate mlServiceRestTemplate(@Value("${ml.service.timeout-ms:6000}") int timeoutMs) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        int t = Math.max(1000, timeoutMs);
        factory.setConnectTimeout(t);
        factory.setReadTimeout(t);
        return new RestTemplate(factory);
    }
}
