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
import mth.services.UsersService;
@CrossOrigin(origins = "*")
@RestController
@RequestMapping("/authservice")
public class UsersController {

	@Autowired
	UsersService US;
	
	@CrossOrigin(origins = "*")
	
	@PostMapping("/signup")
	public Object signup(@RequestBody Users U)
	{
		return US.signup(U);
	}
	
	@PostMapping("/signin")
	public Object signin(@RequestBody Map<String, Object> data)
	{
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
}
