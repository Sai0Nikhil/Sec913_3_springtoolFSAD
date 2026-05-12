package mth.controller;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import mth.models.Roles;
import mth.repository.RolesRepository;

@RestController
@RequestMapping("/roles")
@CrossOrigin(origins = "*")
public class RolesController {

	@Autowired
	RolesRepository repo;

	@GetMapping
	public List<Roles> getRoles() {
		return repo.findAll();
	}

	@PostMapping
	public Object addRole(@RequestBody Roles role) {
		Map<String, Object> response = new HashMap<>();
		try {
			String name = role.getRolename() == null ? "" : role.getRolename().trim();
			if (name.isEmpty() || name.length() > 50) {
				response.put("code", 400);
				response.put("message", "Role name is required (max 50 chars).");
				return response;
			}
			// Reject pure-numeric or duplicate (case-insensitive) names
			if (name.matches("^\\d+$")) {
				response.put("code", 400);
				response.put("message", "Role name can't be only digits.");
				return response;
			}
			boolean duplicate = repo.findAll().stream()
				.anyMatch(r -> r.getRolename() != null && r.getRolename().equalsIgnoreCase(name));
			if (duplicate) {
				response.put("code", 409);
				response.put("message", "A role with that name already exists.");
				return response;
			}
			role.setRolename(name);
			if (role.getRole() == null) {
				Long nextId = repo.getMaxRoleId() + 1;
				role.setRole(nextId);
			}
			repo.save(role);
			response.put("code", 200);
			response.put("message", "Role added successfully");
			response.put("role", role);
		} catch (Exception e) {
			response.put("code", 500);
			response.put("message", e.getMessage());
		}
		return response;
	}
}
