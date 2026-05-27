package mth.models;

import java.time.LocalDateTime;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table
public class PasswordResetToken {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    Long id;

    String email;

    String otp;

    LocalDateTime expiry;

    boolean used;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getOtp() { return otp; }
    public void setOtp(String otp) { this.otp = otp; }

    public LocalDateTime getExpiry() { return expiry; }
    public void setExpiry(LocalDateTime expiry) { this.expiry = expiry; }

    public boolean isUsed() { return used; }
    public void setUsed(boolean used) { this.used = used; }
}
