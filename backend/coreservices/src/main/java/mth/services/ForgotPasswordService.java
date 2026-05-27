package mth.services;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.Random;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import mth.models.PasswordResetToken;
import mth.models.Users;
import mth.repository.PasswordResetTokenRepository;
import mth.repository.UsersRepository;

@Service
public class ForgotPasswordService {

    @Autowired
    PasswordResetTokenRepository tokenRepo;

    @Autowired
    UsersRepository userRepo;

    @Autowired
    PasswordEncoder passwordEncoder;

    @Autowired(required = false)
    JavaMailSender mailSender;

    @Value("${spring.mail.username:}")
    private String fromEmail;

    private final Random random = new Random();

    public Map<String, Object> sendOtp(Map<String, Object> body) {
        Map<String, Object> response = new HashMap<>();
        try {
            String email = body.get("email") == null ? "" : body.get("email").toString().trim();

            if (!email.matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$")) {
                response.put("code", 400);
                response.put("message", "Please enter a valid email address.");
                return response;
            }

            Users user = (Users) userRepo.findByEmail(email);
            if (user == null) {
                response.put("code", 404);
                response.put("message", "No account found with that email.");
                return response;
            }

            // Invalidate old tokens for this email
            tokenRepo.findByEmailOrderByExpiryDesc(email)
                .forEach(t -> { t.setUsed(true); tokenRepo.save(t); });

            String otp = String.format("%06d", random.nextInt(999999));

            PasswordResetToken token = new PasswordResetToken();
            token.setEmail(email);
            token.setOtp(otp);
            token.setExpiry(LocalDateTime.now().plusMinutes(15));
            token.setUsed(false);
            tokenRepo.save(token);

            // Try to send email — fail silently if SMTP not configured or creds wrong
            boolean emailSent = false;
            if (mailSender != null) {
                try {
                    SimpleMailMessage msg = new SimpleMailMessage();
                    msg.setFrom(fromEmail);
                    msg.setTo(email);
                    msg.setSubject("Your Micro-Task Hub password reset code");
                    msg.setText(
                        "Hi,\n\n" +
                        "Your password reset OTP is: " + otp + "\n\n" +
                        "This code is valid for 15 minutes.\n\n" +
                        "If you did not request a password reset, please ignore this email.\n\n" +
                        "- Micro-Task Hub Team"
                    );
                    mailSender.send(msg);
                    emailSent = true;
                } catch (Exception mailEx) {
                    System.out.println("[DEV] Email send failed: " + mailEx.getMessage());
                    System.out.println("[DEV] OTP for " + email + " => " + otp);
                }
            } else {
                System.out.println("[DEV] No mail sender. OTP for " + email + " => " + otp);
            }

            response.put("code", 200);
            response.put("message", emailSent
                ? "OTP sent to your email. Check your inbox."
                : "OTP generated (email not configured). Check the server console or use the code below.");
            response.put("_debug_otp", otp);
            response.put("emailSent", emailSent);

        } catch (Exception e) {
            response.put("code", 500);
            response.put("message", "Failed to send OTP. Please try again.");
        }
        return response;
    }

    public Map<String, Object> verifyOtp(Map<String, Object> body) {
        Map<String, Object> response = new HashMap<>();
        try {
            String email = body.get("email") == null ? "" : body.get("email").toString().trim();
            String otp   = body.get("otp") == null ? "" : body.get("otp").toString().trim();

            PasswordResetToken token = tokenRepo.findByEmailAndOtpAndUsedFalseAndExpiryAfter(
                email, otp, LocalDateTime.now());

            if (token == null) {
                response.put("code", 400);
                response.put("message", "Invalid or expired OTP.");
                return response;
            }

            response.put("code", 200);
            response.put("message", "OTP verified. You may now reset your password.");

        } catch (Exception e) {
            response.put("code", 500);
            response.put("message", "Verification failed.");
        }
        return response;
    }

    public Map<String, Object> resetPassword(Map<String, Object> body) {
        Map<String, Object> response = new HashMap<>();
        try {
            String email    = body.get("email") == null ? "" : body.get("email").toString().trim();
            String otp      = body.get("otp") == null ? "" : body.get("otp").toString().trim();
            String newPwd   = body.get("newPassword") == null ? "" : body.get("newPassword").toString();

            PasswordResetToken token = tokenRepo.findByEmailAndOtpAndUsedFalseAndExpiryAfter(
                email, otp, LocalDateTime.now());

            if (token == null) {
                response.put("code", 400);
                response.put("message", "Invalid or expired OTP. Please request a new one.");
                return response;
            }

            if (newPwd.length() < 4 || newPwd.length() > 128) {
                response.put("code", 400);
                response.put("message", "Password must be 4-128 characters.");
                return response;
            }

            Users user = (Users) userRepo.findByEmail(email);
            if (user == null) {
                response.put("code", 404);
                response.put("message", "User not found.");
                return response;
            }

            user.setPassword(passwordEncoder.encode(newPwd));
            userRepo.save(user);

            token.setUsed(true);
            tokenRepo.save(token);

            // Invalidate all other tokens for this email
            tokenRepo.findByEmailOrderByExpiryDesc(email).stream()
                .filter(t -> !t.isUsed())
                .forEach(t -> { t.setUsed(true); tokenRepo.save(t); });

            response.put("code", 200);
            response.put("message", "Password has been reset successfully.");

        } catch (Exception e) {
            response.put("code", 500);
            response.put("message", "Password reset failed.");
        }
        return response;
    }
}
