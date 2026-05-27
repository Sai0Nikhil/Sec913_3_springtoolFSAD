package mth.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import mth.models.PasswordResetToken;

@Repository
public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, Long> {

    List<PasswordResetToken> findByEmailOrderByExpiryDesc(String email);

    PasswordResetToken findByEmailAndOtpAndUsedFalseAndExpiryAfter(String email, String otp, java.time.LocalDateTime now);
}
