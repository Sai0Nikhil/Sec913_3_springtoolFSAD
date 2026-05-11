package mth.services;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import mth.models.Users;
import mth.repository.UsersRepository;

@Service
public class UsersService {
	
	@Autowired
	UsersRepository UR;
	
	@Autowired
	JwtService JWT;
		
	public Object signup(Users U)
	{
		Map<String, Object> response = new HashMap<>();
		try
		{
			Object id = UR.checkByEmail(U.getEmail());
			if(id != null)
			{
				response.put("code", 501);
				response.put("message", "Email ID already registered");
				return response;
			}

			// Reject self-registration as Admin (role id 3) regardless of frontend.
			// Admin accounts must be promoted by an existing Admin from the Roles page.
			if (U.getRole() == 3) {
				response.put("code", 403);
				response.put("message", "Admin role cannot be selected at signup. Please choose another role.");
				return response;
			}

			// If no role was sent, default to User (1).
			if (U.getRole() <= 0) {
				U.setRole(1);
			}

			U.setStatus(1);   // active
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
			Object role = UR.validateCredentials(data.get("username").toString(), data.get("password").toString()); 	//Validate user name and password
			if(role != null)
			{
				response.put("code", 200);
				response.put("jwt", JWT.generateJWT(data.get("username"), role)); //Generate JWT token and return as response
			}
			else
			{
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
			if (role == null || role != 3) {
				response.put("code", 403);
				response.put("message", "Admin only");
				return response;
			}
			List<Object[]> rows = UR.listAllWithRole();
			List<Map<String, Object>> users = new java.util.ArrayList<>();
			for (Object[] r : rows) {
				Map<String, Object> u = new HashMap<>();
				u.put("id",       r[0]);
				u.put("fullname", r[1]);
				u.put("email",    r[2]);
				u.put("phone",    r[3]);
				u.put("role",     r[4]);
				u.put("rolename", r[5]);
				u.put("status",   r[6]);
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
	        response.put("fullname", U.getFullname());
	        response.put("role", U.getRole());
	        response.put("menulist", menuList);
		}catch(Exception e)
		{
			response.put("code", 500);
			response.put("message", e.getMessage());
		}
		return response;
	}
}
