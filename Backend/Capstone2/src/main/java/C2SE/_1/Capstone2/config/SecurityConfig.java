package C2SE._1.Capstone2.config;

import C2SE._1.Capstone2.security.JwtAuthenticationEntryPoint;
import C2SE._1.Capstone2.security.JwtAuthenticationFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationEntryPoint authenticationEntryPoint;
    private final JwtAuthenticationFilter jwtAuthenticationFilter;

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration authConfig) throws Exception {
        return authConfig.getAuthenticationManager();
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .csrf(csrf -> csrf.disable())
                .exceptionHandling(ex -> ex.authenticationEntryPoint(authenticationEntryPoint))
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        // Public endpoints
                        .requestMatchers("/api/v1/auth/**").permitAll()
                        .requestMatchers("/api/v1/public/**").permitAll()
                        .requestMatchers("/swagger-ui/**", "/v3/api-docs/**", "/swagger-ui.html").permitAll()

                        // User management - ADMIN only
                        .requestMatchers("/api/v1/users/**").hasRole("ADMIN")

                        // Menu & Category management - ADMIN, MANAGER
                        .requestMatchers(HttpMethod.POST, "/api/v1/menu/**").hasAnyRole("ADMIN", "MANAGER")
                        .requestMatchers(HttpMethod.PUT, "/api/v1/menu/**").hasAnyRole("ADMIN", "MANAGER")
                        .requestMatchers(HttpMethod.DELETE, "/api/v1/menu/**").hasAnyRole("ADMIN", "MANAGER")
                        .requestMatchers(HttpMethod.GET, "/api/v1/menu/**").authenticated()

                        .requestMatchers(HttpMethod.POST, "/api/v1/categories/**").hasAnyRole("ADMIN", "MANAGER")
                        .requestMatchers(HttpMethod.PUT, "/api/v1/categories/**").hasAnyRole("ADMIN", "MANAGER")
                        .requestMatchers(HttpMethod.DELETE, "/api/v1/categories/**").hasAnyRole("ADMIN", "MANAGER")
                        .requestMatchers(HttpMethod.GET, "/api/v1/categories/**").authenticated()

                        // Recipes - ADMIN, MANAGER
                        .requestMatchers(HttpMethod.POST, "/api/v1/recipes/**").hasAnyRole("ADMIN", "MANAGER")
                        .requestMatchers(HttpMethod.PUT, "/api/v1/recipes/**").hasAnyRole("ADMIN", "MANAGER")
                        .requestMatchers(HttpMethod.DELETE, "/api/v1/recipes/**").hasAnyRole("ADMIN", "MANAGER")
                        .requestMatchers(HttpMethod.GET, "/api/v1/recipes/**").authenticated()

                        // Ingredients - authenticated users can view
                        .requestMatchers(HttpMethod.GET, "/api/v1/ingredients/**").authenticated()

                        // Orders - all authenticated users (STAFF can create/view)
                        .requestMatchers("/api/v1/orders/**").authenticated()

                        // Dining Tables - GET: authenticated, CUD: ADMIN/MANAGER
                        .requestMatchers(HttpMethod.GET, "/api/v1/tables/**").authenticated()
                        .requestMatchers(HttpMethod.POST, "/api/v1/tables/**").hasAnyRole("ADMIN", "MANAGER")
                        .requestMatchers(HttpMethod.PUT, "/api/v1/tables/**").hasAnyRole("ADMIN", "MANAGER")
                        .requestMatchers(HttpMethod.DELETE, "/api/v1/tables/**").hasAnyRole("ADMIN", "MANAGER")

                        // Sales - all authenticated users
                        .requestMatchers("/api/v1/sales/**").authenticated()

                        // Inventory - ADMIN, MANAGER
                        .requestMatchers("/api/v1/inventory/**").hasAnyRole("ADMIN", "MANAGER")

                        // Reports - ADMIN, MANAGER
                        .requestMatchers("/api/v1/reports/**").hasAnyRole("ADMIN", "MANAGER")

                        // Weather - GET: authenticated, POST: ADMIN/MANAGER
                        .requestMatchers(HttpMethod.GET, "/api/v1/weather/**").authenticated()
                        .requestMatchers(HttpMethod.POST, "/api/v1/weather/**").hasAnyRole("ADMIN", "MANAGER")

                        // Events - GET: authenticated, CUD: ADMIN/MANAGER
                        .requestMatchers(HttpMethod.GET, "/api/v1/events/**").authenticated()
                        .requestMatchers(HttpMethod.POST, "/api/v1/events/**").hasAnyRole("ADMIN", "MANAGER")
                        .requestMatchers(HttpMethod.PUT, "/api/v1/events/**").hasAnyRole("ADMIN", "MANAGER")
                        .requestMatchers(HttpMethod.DELETE, "/api/v1/events/**").hasAnyRole("ADMIN", "MANAGER")

                        // Holidays - GET: authenticated, CUD: ADMIN/MANAGER
                        .requestMatchers(HttpMethod.GET, "/api/v1/holidays/**").authenticated()
                        .requestMatchers(HttpMethod.POST, "/api/v1/holidays/**").hasAnyRole("ADMIN", "MANAGER")
                        .requestMatchers(HttpMethod.PUT, "/api/v1/holidays/**").hasAnyRole("ADMIN", "MANAGER")
                        .requestMatchers(HttpMethod.DELETE, "/api/v1/holidays/**").hasAnyRole("ADMIN", "MANAGER")

                        .anyRequest().authenticated()
                );

        http.addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(List.of("http://localhost:5173", "http://localhost:5174", "http://localhost:3000"));
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("*"));
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
