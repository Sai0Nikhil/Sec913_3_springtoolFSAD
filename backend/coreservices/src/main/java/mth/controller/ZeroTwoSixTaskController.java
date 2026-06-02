package mth.controller;

import java.util.Date;
import java.util.HashMap;
import java.util.Map;

import javax.crypto.SecretKey;

import org.springframework.web.bind.annotation.*;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.MalformedJwtException;
import io.jsonwebtoken.security.Keys;
import io.jsonwebtoken.security.SignatureException;

/**
 * Class task – 02 June 2025
 *
 * POST /0206task/generate  → accept {username, password, location} → return JWT
 * POST /0206task/decode    → accept {token}                        → return claims or error
 */
@RestController
@RequestMapping("/0206task")
@CrossOrigin(origins = "*")
public class ZeroTwoSixTaskController {

    // Same secret key as JwtService so tokens are interoperable if needed
    private static final String SECRET = "qwertyuiopasdfghjklzxcvbnmQWERTYUIOPASDFGHJKLZXCVBNM0987654321";
    private static final SecretKey KEY  = Keys.hmacShaKeyFor(SECRET.getBytes());

    // ------------------------------------------------------------------
    // POST /0206task/generate
    // Body: { "username": "...", "password": "...", "location": "..." }
    // ------------------------------------------------------------------
    @PostMapping("/generate")
    public Map<String, Object> generate(@RequestBody Map<String, String> body) {
        Map<String, Object> resp = new HashMap<>();
        String username = body.getOrDefault("username", "").trim();
        String password = body.getOrDefault("password", "").trim();
        String location = body.getOrDefault("location", "").trim();

        if (username.isEmpty() || password.isEmpty() || location.isEmpty()) {
            resp.put("code", 400);
            resp.put("message", "username, password and location are all required");
            return resp;
        }

        try {
            Map<String, Object> claims = new HashMap<>();
            claims.put("username", username);
            claims.put("password", password);
            claims.put("location", location);

            String token = Jwts.builder()
                    .claims(claims)
                    .issuedAt(new Date())
                    .expiration(new Date(System.currentTimeMillis() + 86_400_000L)) // 24 h
                    .signWith(KEY)
                    .compact();

            resp.put("code", 200);
            resp.put("message", "Token generated successfully");
            resp.put("token", token);
        } catch (Exception e) {
            resp.put("code", 500);
            resp.put("message", "Failed to generate token: " + e.getMessage());
        }
        return resp;
    }

    // ------------------------------------------------------------------
    // POST /0206task/decode
    // Body: { "token": "..." }
    // ------------------------------------------------------------------
    @PostMapping("/decode")
    public Map<String, Object> decode(@RequestBody Map<String, String> body) {
        Map<String, Object> resp = new HashMap<>();
        String token = body.getOrDefault("token", "").trim();

        if (token.isEmpty()) {
            resp.put("code", 400);
            resp.put("message", "token is required");
            return resp;
        }

        try {
            Claims claims = Jwts.parser()
                    .verifyWith(KEY)
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();

            Date expiration = claims.getExpiration();
            if (expiration != null && expiration.before(new Date())) {
                resp.put("code", 401);
                resp.put("message", "Token has expired");
                return resp;
            }

            resp.put("code", 200);
            resp.put("message", "Token is valid");
            resp.put("username", claims.get("username"));
            resp.put("password", claims.get("password"));
            resp.put("location", claims.get("location"));
            resp.put("issuedAt",   claims.getIssuedAt()   != null ? claims.getIssuedAt().toString()   : null);
            resp.put("expiration", claims.getExpiration() != null ? claims.getExpiration().toString() : null);

        } catch (ExpiredJwtException e) {
            resp.put("code", 401);
            resp.put("message", "Token has expired");
        } catch (SignatureException e) {
            resp.put("code", 401);
            resp.put("message", "Invalid token signature — token was tampered or generated with a different key");
        } catch (MalformedJwtException e) {
            resp.put("code", 400);
            resp.put("message", "Malformed token — not a valid JWT structure");
        } catch (Exception e) {
            resp.put("code", 400);
            resp.put("message", "Token rejected: " + e.getMessage());
        }
        return resp;
    }
}
