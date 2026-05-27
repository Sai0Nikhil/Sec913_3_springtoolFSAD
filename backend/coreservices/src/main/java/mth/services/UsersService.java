package mth.services;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import mth.models.Users;
import mth.repository.UsersRepository;

@Service
public class UsersService {
	
	@Autowired
	UsersRepository UR;
	
	@Autowired
	JwtService JWT;

	@Autowired
	PasswordEncoder passwordEncoder;

	/**
	 * BCrypt hashes always start with $2a$ / $2b$ / $2y$ and are 60 chars long.
	 * Anything else is treated as a legacy plaintext password and rehashed on
	 * the next successful login or password change.
	 */
	private boolean isBcryptHash(String s) {
		return s != null && s.length() == 60
			&& (s.startsWith("$2a$") || s.startsWith("$2b$") || s.startsWith("$2y$"));
	}
		
	public Object signup(Users U)
	{
		Map<String, Object> response = new HashMap<>();
		try
		{
			// ---- Server-side validation (don't trust the client) ----
			String fullname = U.getFullname() == null ? "" : U.getFullname().trim();
			String email    = U.getEmail()    == null ? "" : U.getEmail().trim();
			String phone    = U.getPhone()    == null ? "" : U.getPhone().trim();
			String password = U.getPassword() == null ? "" : U.getPassword();

			if (fullname.isEmpty() || fullname.length() > 100) {
				response.put("code", 400);
				response.put("message", "Full name is required (max 100 chars).");
				return response;
			}
			if (!email.matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$") || email.length() > 120) {
				response.put("code", 400);
				response.put("message", "Please enter a valid email address.");
				return response;
			}
			if (!phone.matches("^\\d{6,15}$")) {
				response.put("code", 400);
				response.put("message", "Phone must be 6-15 digits, no spaces or symbols.");
				return response;
			}
			if (password.length() < 4 || password.length() > 128) {
				response.put("code", 400);
				response.put("message", "Password must be 4-128 characters.");
				return response;
			}

			Object id = UR.checkByEmail(email);
			if(id != null) {
				response.put("code", 501);
				response.put("message", "Email ID already registered");
				return response;
			}

			// Reject self-registration as Admin (role id 3)
			if (U.getRole() == 3) {
				response.put("code", 403);
				response.put("message", "Admin role cannot be selected at signup. Please choose another role.");
				return response;
			}

			// If no role was sent, default to User (1).
			if (U.getRole() <= 0) {
				U.setRole(1);
			}

			U.setFullname(fullname);
			U.setEmail(email);
			U.setPhone(phone);
			U.setStatus(1);
			// Store the BCrypt hash, never the raw password.
			U.setPassword(passwordEncoder.encode(password));
			UR.save(U);

			response.put("code", 200);
			response.put("message", "User account has been created.");
		}catch(Exception e)
		{
			response.put("code", 500);
			response.put("message", e.getMessage());
		}
		return response;
	}
	
	public Object signin(Map<String, Object> data)
	{
		Map<String, Object> response = new HashMap<>();
		try
		{
			String username = data.get("username") == null ? "" : data.get("username").toString().trim();
			String password = data.get("password") == null ? "" : data.get("password").toString();

			Users U = (Users) UR.findByEmail(username);
			boolean ok = false;
			if (U != null && U.getPassword() != null) {
				if (isBcryptHash(U.getPassword())) {
					ok = passwordEncoder.matches(password, U.getPassword());
				} else {
					// Legacy plaintext row -- accept once, then upgrade in place.
					ok = U.getPassword().equals(password);
					if (ok) {
						U.setPassword(passwordEncoder.encode(password));
						try { UR.save(U); } catch (Exception ignore) { /* upgrade is best-effort */ }
					}
				}
			}

			if (ok) {
				response.put("code", 200);
				response.put("jwt", JWT.generateJWT(username, U.getRole())); // sign with the stored role
			} else {
				response.put("code", 404);
				response.put("message", "Invalid Credentials!");
			}
		}catch(Exception e)
		{
			response.put("code", 500);
			response.put("message", e.getMessage());
		}
		return response;
	}
	
	public Object listAllUsers(String token)
	{
		Map<String, Object> response = new HashMap<>();
		try
		{
			Map<String, Object> claims = JWT.validateJWT(token);
			Integer role = ((Number) claims.get("role")).intValue();
			String email = (String) claims.get("username");
			Users actor = (Users) UR.findByEmail(email);
			boolean isAdmin   = role != null && role == 3;
			boolean isManager = role != null && role == 2;
			boolean canAssign = actor != null && actor.getCanAssignTasks() == 1;
			if (!isAdmin && !isManager && !canAssign) {
				response.put("code", 403);
				response.put("message", "Not authorized");
				return response;
			}
			List<Object[]> rows = UR.listAllWithRole();
			List<Map<String, Object>> users = new java.util.ArrayList<>();
			for (Object[] r : rows) {
				Map<String, Object> u = new HashMap<>();
				u.put("id",              r[0]);
				u.put("fullname",        r[1]);
				u.put("email",           r[2]);
				u.put("phone",           r[3]);
				u.put("role",            r[4]);
				u.put("rolename",        r[5]);
				u.put("status",          r[6]);
				u.put("canAssignTasks",  r.length > 7 ? r[7] : 0);
				users.add(u);
			}
			response.put("code", 200);
			response.put("users", users);
		} catch (Exception e) {
			response.put("code", 500);
			response.put("message", e.getMessage());
		}
		return response;
	}

	/**
	 * Update the current user's profile fields they're allowed to change.
	 * Body: { fullname?, phone? }
	 */
	public Object updateMe(String token, Map<String, Object> body) {
		Map<String, Object> response = new HashMap<>();
		try {
			Map<String, Object> claims = JWT.validateJWT(token);
			String email = (String) claims.get("username");
			Users U = (Users) UR.findByEmail(email);
			if (U == null) {
				response.put("code", 404);
				response.put("message", "User not found");
				return response;
			}

			Object nObj = body.get("fullname");
			Object pObj = body.get("phone");

			if (nObj != null) {
				String name = nObj.toString().trim();
				if (name.isEmpty() || name.length() > 100) {
					response.put("code", 400);
					response.put("message", "Full name is required (max 100 chars).");
					return response;
				}
				U.setFullname(name);
			}
			if (pObj != null) {
				String phone = pObj.toString().trim();
				if (!phone.matches("^\\d{6,15}$")) {
					response.put("code", 400);
					response.put("message", "Phone must be 6-15 digits, no spaces or symbols.");
					return response;
				}
				U.setPhone(phone);
			}

			UR.save(U);

			response.put("code", 200);
			response.put("message", "Profile updated");
			response.put("fullname", U.getFullname());
			response.put("phone",    U.getPhone());
		} catch (Exception e) {
			response.put("code", 500);
			response.put("message", e.getMessage());
		}
		return response;
	}

	/**
	 * Change the current user's password. Body: { oldPassword, newPassword }
	 */
	public Object changePassword(String token, Map<String, Object> body) {
		Map<String, Object> response = new HashMap<>();
		try {
			Map<String, Object> claims = JWT.validateJWT(token);
			String email = (String) claims.get("username");
			Users U = (Users) UR.findByEmail(email);
			if (U == null) {
				response.put("code", 404);
				response.put("message", "User not found");
				return response;
			}

			String oldP = body.get("oldPassword") == null ? "" : body.get("oldPassword").toString();
			String newP = body.get("newPassword") == null ? "" : body.get("newPassword").toString();

			if (oldP.isEmpty() || newP.isEmpty()) {
				response.put("code", 400);
				response.put("message", "Old and new passwords are required.");
				return response;
			}
			boolean oldOk;
			if (isBcryptHash(U.getPassword())) {
				oldOk = passwordEncoder.matches(oldP, U.getPassword());
			} else {
				oldOk = U.getPassword() != null && U.getPassword().equals(oldP);
			}
			if (!oldOk) {
				response.put("code", 403);
				response.put("message", "Current password is incorrect.");
				return response;
			}
			if (newP.length() < 4 || newP.length() > 128) {
				response.put("code", 400);
				response.put("message", "New password must be 4-128 characters.");
				return response;
			}
			if (newP.equals(oldP)) {
				response.put("code", 400);
				response.put("message", "New password must be different from current password.");
				return response;
			}

			U.setPassword(passwordEncoder.encode(newP));
			UR.save(U);

			response.put("code", 200);
			response.put("message", "Password updated successfully");
		} catch (Exception e) {
			response.put("code", 500);
			response.put("message", e.getMessage());
		}
		return response;
	}

	/**
	 * Admin-only: grant or revoke "can assign tasks" permission on a user.
	 * Body: { canAssignTasks: 0 | 1 }
	 */
	public Object setCanAssign(String token, Long userId, Map<String, Object> body) {
		Map<String, Object> response = new HashMap<>();
		try {
			Map<String, Object> claims = JWT.validateJWT(token);
			Integer role = ((Number) claims.get("role")).intValue();
			if (role == null || role != 3) {
				response.put("code", 403);
				response.put("message", "Admin only");
				return response;
			}

			Users target = UR.findById(userId).orElse(null);
			if (target == null) {
				response.put("code", 404);
				response.put("message", "User not found");
				return response;
			}

			int val = 0;
			if (body.get("canAssignTasks") != null) {
				try { val = Integer.parseInt(body.get("canAssignTasks").toString()); }
				catch (Exception e) { val = "true".equalsIgnoreCase(body.get("canAssignTasks").toString()) ? 1 : 0; }
			}
			target.setCanAssignTasks(val == 1 ? 1 : 0);
			UR.save(target);

			response.put("code", 200);
			response.put("message", val == 1 ? "Granted assign permission" : "Revoked assign permission");
			response.put("canAssignTasks", target.getCanAssignTasks());
		} catch (Exception e) {
			response.put("code", 500);
			response.put("message", e.getMessage());
		}
		return response;
	}

	public Object uinfo(String token)
	{
		Map<String, Object> response = new HashMap<>();
		try
		{
			Map<String, Object> payload = JWT.validateJWT(token);
	        String email = (String) payload.get("username");
	        Users U = (Users) UR.findByEmail(email);

	        List<Object> menuList = UR.getMenus(Long.valueOf(U.getRole()));

	        response.put("code", 200);
	        response.put("id", U.getId());
	        response.put("fullname", U.getFullname());
	        response.put("email", U.getEmail());
	        response.put("phone", U.getPhone());
	        response.put("role", U.getRole());
	        response.put("status", U.getStatus());
	        response.put("canAssignTasks", U.getCanAssignTasks());
	        response.put("menulist", menuList);
		}catch(Exception e)
		{
			response.put("code", 500);
			response.put("message", e.getMessage());
		}
		return response;
	}
}
