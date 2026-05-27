package mth.controller;

import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import mth.models.Users;
import mth.services.CaptchaService;
import mth.services.ForgotPasswordService;
import mth.services.UsersService;
@CrossOrigin(origins = "*")
@RestController
@RequestMapping("/authservice")
public class UsersController {

	@Autowired
	UsersService US;

	@Autowired
	ForgotPasswordService forgotPasswordService;

	@Autowired
	CaptchaService captchaService;
	
	@CrossOrigin(origins = "*")
	
	@PostMapping("/signup")
	public Object signup(@RequestBody Map<String, Object> body)
	{
		String captchaToken = body.get("captchaToken") == null ? "" : body.get("captchaToken").toString();
		if (!captchaService.verify(captchaToken)) {
			Map<String, Object> err = new java.util.HashMap<>();
			err.put("code", 403);
			err.put("message", "Captcha verification failed.");
			return err;
		}
		// Build Users object from body fields the endpoint expects
		Users U = new Users();
		if (body.get("fullname") != null) U.setFullname(body.get("fullname").toString());
		if (body.get("email") != null)    U.setEmail(body.get("email").toString());
		if (body.get("phone") != null)    U.setPhone(body.get("phone").toString());
		if (body.get("password") != null) U.setPassword(body.get("password").toString());
		if (body.get("role") != null)     U.setRole(Integer.parseInt(body.get("role").toString()));
		return US.signup(U);
	}
	
	@PostMapping("/signin")
	public Object signin(@RequestBody Map<String, Object> data)
	{
		String captchaToken = data.get("captchaToken") == null ? "" : data.get("captchaToken").toString();
		if (!captchaService.verify(captchaToken)) {
			Map<String, Object> err = new java.util.HashMap<>();
			err.put("code", 403);
			err.put("message", "Captcha verification failed.");
			return err;
		}
		return US.signin(data);
	}
	
	@GetMapping("/uinfo")
	public Object uinfo(@RequestHeader("Token") String token)
	{
		return US.uinfo(token);
	}

	@org.springframework.web.bind.annotation.PatchMapping("/me")
	public Object updateMe(@RequestHeader("Token") String token,
	                       @RequestBody Map<String, Object> body)
	{
		return US.updateMe(token, body);
	}

	@PostMapping("/password")
	public Object changePassword(@RequestHeader("Token") String token,
	                             @RequestBody Map<String, Object> body)
	{
		return US.changePassword(token, body);
	}

	// ---- Forgot Password / Reset Flow ----

	@PostMapping("/forgot-password")
	public Object forgotPassword(@RequestBody Map<String, Object> body)
	{
		return forgotPasswordService.sendOtp(body);
	}

	@PostMapping("/verify-reset-otp")
	public Object verifyResetOtp(@RequestBody Map<String, Object> body)
	{
		return forgotPasswordService.verifyOtp(body);
	}

	@PostMapping("/reset-password")
	public Object resetPassword(@RequestBody Map<String, Object> body)
	{
		return forgotPasswordService.resetPassword(body);
	}
	
	
	@GetMapping("/test")
	public String testMethod()
	{
		return "Welcome I'm fine";
	}

	/**
	 * Admin-only: list every user with their role name attached.
	 * Returns: { code, users: [ { id, fullname, email, phone, role, rolename, status }, ... ] }
	 */
	@GetMapping("/list")
	public Object listUsers(@RequestHeader("Token") String token)
	{
		return US.listAllUsers(token);
	}

	/** Admin only — grant/revoke a user's permission to assign admin-created tasks. */
	@org.springframework.web.bind.annotation.PatchMapping("/users/{id}/can-assign")
	public Object setCanAssign(@org.springframework.web.bind.annotation.PathVariable Long id,
	                           @RequestBody Map<String, Object> body,
	                           @RequestHeader("Token") String token)
	{
		return US.setCanAssign(token, id, body);
	}
}
