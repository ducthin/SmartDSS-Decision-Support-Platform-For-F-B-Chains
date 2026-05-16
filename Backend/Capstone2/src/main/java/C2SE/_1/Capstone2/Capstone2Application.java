package C2SE._1.Capstone2;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

import jakarta.annotation.PostConstruct;
import java.util.TimeZone;

@SpringBootApplication
@EnableScheduling
public class Capstone2Application {

	@PostConstruct
	public void init() {
		// Thiết lập múi giờ mặc định cho toàn bộ ứng dụng (kể cả khi chạy trên VPS múi giờ UTC)
		TimeZone.setDefault(TimeZone.getTimeZone("Asia/Ho_Chi_Minh"));
	}

	public static void main(String[] args) {
		SpringApplication.run(Capstone2Application.class, args);
	}

}
