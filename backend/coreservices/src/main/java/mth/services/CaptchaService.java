package mth.services;

import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

@Service
public class CaptchaService {

    @Value("${captcha.enabled:false}")
    private boolean enabled;

    @Value("${captcha.secret:}")
    private String secret;

    private final RestTemplate restTemplate = new RestTemplate();

    private static final String VERIFY_URL = "https://www.google.com/recaptcha/api/siteverify";

    public boolean verify(String captchaToken) {
        if (!enabled) return true;
        if (captchaToken == null || captchaToken.isBlank()) return false;

        try {
            String url = VERIFY_URL + "?secret=" + secret + "&response=" + captchaToken;
            Map<String, Object> response = restTemplate.postForObject(url, null, Map.class);
            if (response != null && Boolean.TRUE.equals(response.get("success"))) {
                return true;
            }
        } catch (Exception e) {
            // log and deny on error
        }
        return false;
    }
}
