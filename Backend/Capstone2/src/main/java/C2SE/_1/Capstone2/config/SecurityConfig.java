package C2SE._1.Capstone2.config;

import C2SE._1.Capstone2.entity.RoleName;
import C2SE._1.Capstone2.security.JwtAuthenticationEntryPoint;
import C2SE._1.Capstone2.security.JwtAuthenticationFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.beans.factory.annotation.Value;
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

    @Value("#{'${app.cors.allowed-origins:http://localhost:5173,http://localhost:5174,http://localhost:3000}'.split(',')}")
    private List<String> allowedOrigins;

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
                        .requestMatchers("/uploads/**").permitAll()
                        .requestMatchers("/ws/**").permitAll()
                        .requestMatchers("/swagger-ui/**", "/v3/api-docs/**", "/swagger-ui.html").permitAll()

                        // User management - ADMIN only
                        .requestMatchers("/api/v1/users/**").hasRole(RoleName.ADMIN.name())

                        // Menu & Category management - ADMIN, MANAGER
                        .requestMatchers(HttpMethod.POST, "/api/v1/menu/**").hasAnyRole(RoleName.ADMIN.name(), RoleName.MANAGER.name())
                        .requestMatchers(HttpMethod.PUT, "/api/v1/menu/**").hasAnyRole(RoleName.ADMIN.name(), RoleName.MANAGER.name())
                        .requestMatchers(HttpMethod.DELETE, "/api/v1/menu/**").hasAnyRole(RoleName.ADMIN.name(), RoleName.MANAGER.name())
                        .requestMatchers(HttpMethod.GET, "/api/v1/menu/**").authenticated()

                        .requestMatchers(HttpMethod.POST, "/api/v1/categories/**").hasAnyRole(RoleName.ADMIN.name(), RoleName.MANAGER.name())
                        .requestMatchers(HttpMethod.PUT, "/api/v1/categories/**").hasAnyRole(RoleName.ADMIN.name(), RoleName.MANAGER.name())
                        .requestMatchers(HttpMethod.DELETE, "/api/v1/categories/**").hasAnyRole(RoleName.ADMIN.name(), RoleName.MANAGER.name())
                        .requestMatchers(HttpMethod.GET, "/api/v1/categories/**").authenticated()

                        // Recipes - ADMIN, MANAGER
                        .requestMatchers(HttpMethod.POST, "/api/v1/recipes/**").hasAnyRole(RoleName.ADMIN.name(), RoleName.MANAGER.name())
                        .requestMatchers(HttpMethod.PUT, "/api/v1/recipes/**").hasAnyRole(RoleName.ADMIN.name(), RoleName.MANAGER.name())
                        .requestMatchers(HttpMethod.DELETE, "/api/v1/recipes/**").hasAnyRole(RoleName.ADMIN.name(), RoleName.MANAGER.name())
                        .requestMatchers(HttpMethod.GET, "/api/v1/recipes/**").authenticated()

                        // Ingredients - authenticated users can view
                        .requestMatchers(HttpMethod.GET, "/api/v1/ingredients/**").authenticated()

                        // Orders
                        .requestMatchers(HttpMethod.GET, "/api/v1/orders/**").hasAnyRole(
                                RoleName.ADMIN.name(),
                                RoleName.MANAGER.name(),
                                RoleName.BARISTA.name(),
                                RoleName.WAITER.name()
                        )
                        .requestMatchers(HttpMethod.POST, "/api/v1/orders/**").hasAnyRole(
                                RoleName.ADMIN.name(),
                                RoleName.MANAGER.name(),
                                RoleName.WAITER.name()
                        )
                        .requestMatchers(HttpMethod.PUT, "/api/v1/orders/**").hasAnyRole(
                                RoleName.ADMIN.name(),
                                RoleName.MANAGER.name(),
                                RoleName.BARISTA.name(),
                                RoleName.WAITER.name()
                        )

                        // Dining Tables - GET: authenticated, CUD: ADMIN/MANAGER
                        .requestMatchers(HttpMethod.GET, "/api/v1/tables/**").authenticated()
                        .requestMatchers(HttpMethod.POST, "/api/v1/tables/**").hasAnyRole(RoleName.ADMIN.name(), RoleName.MANAGER.name())
                        .requestMatchers(HttpMethod.PUT, "/api/v1/tables/**").hasAnyRole(RoleName.ADMIN.name(), RoleName.MANAGER.name())
                        .requestMatchers(HttpMethod.DELETE, "/api/v1/tables/**").hasAnyRole(RoleName.ADMIN.name(), RoleName.MANAGER.name())

                        // Settings
                        .requestMatchers(HttpMethod.GET, "/api/v1/settings/**").hasAnyRole(
                                RoleName.ADMIN.name(),
                                RoleName.MANAGER.name(),
                                RoleName.BARISTA.name(),
                                RoleName.WAITER.name()
                        )
                        .requestMatchers(HttpMethod.POST, "/api/v1/settings/**").hasRole(RoleName.ADMIN.name())
                        .requestMatchers(HttpMethod.DELETE, "/api/v1/settings/**").hasRole(RoleName.ADMIN.name())

                        // Sales
                        .requestMatchers(HttpMethod.GET, "/api/v1/sales/**").hasAnyRole(
                                RoleName.ADMIN.name(),
                                RoleName.MANAGER.name(),
                                RoleName.BARISTA.name(),
                                RoleName.WAITER.name()
                        )
                        .requestMatchers(HttpMethod.POST, "/api/v1/sales/**").hasAnyRole(
                                RoleName.ADMIN.name(),
                                RoleName.MANAGER.name(),
                                RoleName.WAITER.name()
                        )

                        // Inventory - ADMIN, MANAGER
                        .requestMatchers("/api/v1/inventory/**").hasAnyRole(RoleName.ADMIN.name(), RoleName.MANAGER.name())

                        // Reports - ADMIN, MANAGER
                        .requestMatchers("/api/v1/reports/**").hasAnyRole(RoleName.ADMIN.name(), RoleName.MANAGER.name())

                        // Customer feedbacks - ADMIN, MANAGER
                        .requestMatchers(HttpMethod.GET, "/api/v1/feedbacks/**").hasAnyRole(RoleName.ADMIN.name(), RoleName.MANAGER.name())

                        // Weather - GET: authenticated, POST: ADMIN/MANAGER
                        .requestMatchers(HttpMethod.GET, "/api/v1/weather/**").authenticated()
                        .requestMatchers(HttpMethod.POST, "/api/v1/weather/**").hasAnyRole(RoleName.ADMIN.name(), RoleName.MANAGER.name())

                        // Events - GET: authenticated, CUD: ADMIN/MANAGER
                        .requestMatchers(HttpMethod.GET, "/api/v1/events/**").authenticated()
                        .requestMatchers(HttpMethod.POST, "/api/v1/events/**").hasAnyRole(RoleName.ADMIN.name(), RoleName.MANAGER.name())
                        .requestMatchers(HttpMethod.PUT, "/api/v1/events/**").hasAnyRole(RoleName.ADMIN.name(), RoleName.MANAGER.name())
                        .requestMatchers(HttpMethod.DELETE, "/api/v1/events/**").hasAnyRole(RoleName.ADMIN.name(), RoleName.MANAGER.name())

                        // Holidays - GET: authenticated, CUD: ADMIN/MANAGER
                        .requestMatchers(HttpMethod.GET, "/api/v1/holidays/**").authenticated()
                        .requestMatchers(HttpMethod.POST, "/api/v1/holidays/**").hasAnyRole(RoleName.ADMIN.name(), RoleName.MANAGER.name())
                        .requestMatchers(HttpMethod.PUT, "/api/v1/holidays/**").hasAnyRole(RoleName.ADMIN.name(), RoleName.MANAGER.name())
                        .requestMatchers(HttpMethod.DELETE, "/api/v1/holidays/**").hasAnyRole(RoleName.ADMIN.name(), RoleName.MANAGER.name())

                        .anyRequest().authenticated()
                );

        http.addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(allowedOrigins);
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("*"));
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
