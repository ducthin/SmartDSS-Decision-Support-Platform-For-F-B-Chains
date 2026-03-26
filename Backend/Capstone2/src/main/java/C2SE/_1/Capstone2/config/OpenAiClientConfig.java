package C2SE._1.Capstone2.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestTemplate;

@Configuration
public class OpenAiClientConfig {

    @Bean(name = "openAiRestTemplate")
    public RestTemplate openAiRestTemplate(@Value("${openai.timeout-ms:45000}") int timeoutMs) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        int t = Math.max(5000, timeoutMs);
        factory.setConnectTimeout(Math.min(t, 15000));
        factory.setReadTimeout(t);
        return new RestTemplate(factory);
    }
}
