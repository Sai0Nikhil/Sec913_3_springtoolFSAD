package mth.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

/**
 * Exposes a single {@link PasswordEncoder} bean backed by BCrypt.
 *
 * We pull in {@code spring-security-crypto} only for {@link BCryptPasswordEncoder};
 * the rest of Spring Security (filter chain, AuthenticationManager, etc.) is
 * intentionally NOT enabled — auth is still handled by our own JWT layer.
 *
 * Strength 10 is the library default (~80 ms / hash on modern hardware), which
 * is a sensible balance between login latency and brute-force resistance.
 */
@Configuration
public class SecurityConfig {

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(10);
    }
}
