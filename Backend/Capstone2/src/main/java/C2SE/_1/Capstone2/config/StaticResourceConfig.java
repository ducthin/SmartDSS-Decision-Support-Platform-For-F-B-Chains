package C2SE._1.Capstone2.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;

@Configuration
public class StaticResourceConfig implements WebMvcConfigurer {

    /**
     * Optional explicit upload directory path (set UPLOAD_DIR env var or app.upload.dir property).
     * If blank, falls back to auto-detecting from the JVM working directory.
     */
    @Value("${app.upload.dir:}")
    private String uploadDir;

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        List<String> locations = new ArrayList<>();

        if (uploadDir != null && !uploadDir.isBlank()) {
            // Use the explicitly configured path (most reliable)
            locations.add(toLocation(Paths.get(uploadDir)));
        } else {
            // Auto-detect: try all plausible paths relative to the JVM working directory.
            // The app may be launched from 'Code', 'Capstone2', or 'Backend/Capstone2'.
            Path cwd = Paths.get("").toAbsolutePath();
            locations.add(toLocation(cwd.resolve("uploads")));
            locations.add(toLocation(cwd.resolve("SmartDSS/Backend/Capstone2/uploads")));
            locations.add(toLocation(cwd.resolve("Capstone2/uploads")));
            locations.add(toLocation(cwd.resolve("Backend/Capstone2/uploads")));
        }

        registry.addResourceHandler("/uploads/**")
                .addResourceLocations(locations.toArray(new String[0]));
    }

    private String toLocation(Path path) {
        String p = path.toAbsolutePath().toString().replace("\\", "/");
        if (!p.startsWith("/")) {
            p = "/" + p;
        }
        if (!p.endsWith("/")) {
            p = p + "/";
        }
        return "file:" + p;
    }
}
