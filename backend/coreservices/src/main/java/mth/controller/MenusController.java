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

import mth.models.Menus;
import mth.repository.MenusRepository;

@RestController
@RequestMapping("/menus")
@CrossOrigin(origins = "*")
public class MenusController {

	@Autowired
	MenusRepository repo;

	@GetMapping
	public List<Menus> getMenus() {
		return repo.findAll();
	}

	@PostMapping
	public Object addMenu(@RequestBody Menus menu) {
		Map<String, Object> response = new HashMap<>();
		try {
			String name = menu.getMenu() == null ? "" : menu.getMenu().trim();
			if (name.length() < 2 || name.length() > 50) {
				response.put("code", 400);
				response.put("message", "Menu name must be 2-50 characters.");
				return response;
			}
			if (name.matches("^\\d+$")) {
				response.put("code", 400);
				response.put("message", "Menu name can't be only digits.");
				return response;
			}
			boolean duplicate = repo.findAll().stream()
				.anyMatch(m -> m.getMenu() != null && m.getMenu().equalsIgnoreCase(name));
			if (duplicate) {
				response.put("code", 409);
				response.put("message", "A menu with that name already exists.");
				return response;
			}
			menu.setMenu(name);
			if (menu.getMid() == null) {
				Long nextId = repo.getMaxMenuId() + 1;
				menu.setMid(nextId);
			}
			if (menu.getIcon() == null || menu.getIcon().trim().isEmpty()) {
				menu.setIcon("menu.png");
			}
			repo.save(menu);
			response.put("code", 200);
			response.put("message", "Menu added successfully");
			response.put("menu", menu);
		} catch (Exception e) {
			response.put("code", 500);
			response.put("message", e.getMessage());
		}
		return response;
	}
}
