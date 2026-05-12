package mth.config;

import java.util.List;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import mth.models.Menus;
import mth.models.Roles;
import mth.models.Rolesmapping;
import mth.repository.MenusRepository;
import mth.repository.RolesRepository;
import mth.repository.RolesmappingRepository;

/**
 * Seeds the "Role Manager" admin menu and maps it to the Admin role (id 3)
 * on application startup if it isn't already present.
 *
 * Idempotent: only inserts when the rows are missing.
 */
@Component
public class DataInitializer implements CommandLineRunner {

	private static final String ROLE_MANAGER_MENU = "Role Manager";

	@Autowired
	private MenusRepository menusRepo;

	@Autowired
	private RolesRepository rolesRepo;

	@Autowired
	private RolesmappingRepository mappingRepo;

	@Override
	public void run(String... args) throws Exception {
		try {
			// 1. Ensure "Role Manager" menu exists
			List<Menus> allMenus = menusRepo.findAll();
			Optional<Menus> roleManagerOpt = allMenus.stream()
					.filter(m -> m.getMenu() != null && m.getMenu().equalsIgnoreCase(ROLE_MANAGER_MENU))
					.findFirst();

			Menus roleManagerMenu;
			if (roleManagerOpt.isPresent()) {
				roleManagerMenu = roleManagerOpt.get();
				System.out.println("[DataInitializer] '" + ROLE_MANAGER_MENU + "' menu already present (mid=" + roleManagerMenu.getMid() + ")");
			} else {
				roleManagerMenu = new Menus();
				Long nextMid = (menusRepo.getMaxMenuId() == null ? 0L : menusRepo.getMaxMenuId()) + 1;
				roleManagerMenu.setMid(nextMid);
				roleManagerMenu.setMenu(ROLE_MANAGER_MENU);
				roleManagerMenu.setIcon("usermanager.png");
				menusRepo.save(roleManagerMenu);
				System.out.println("[DataInitializer] Inserted '" + ROLE_MANAGER_MENU + "' menu with mid=" + nextMid);
			}

			// 2. Ensure Admin role (id 3) exists
			Optional<Roles> adminOpt = rolesRepo.findById(3L);
			if (!adminOpt.isPresent()) {
				Roles admin = new Roles();
				admin.setRole(3L);
				admin.setRolename("Admin");
				rolesRepo.save(admin);
				System.out.println("[DataInitializer] Inserted default Admin role (id=3)");
			}

			// 3. Map "Role Manager" to Admin if not already mapped
			List<Rolesmapping> existing = mappingRepo.findByRole(3L);
			boolean alreadyMapped = existing.stream()
					.anyMatch(rm -> rm.getMid() != null && rm.getMid().equals(roleManagerMenu.getMid()));

			if (!alreadyMapped) {
				Rolesmapping rm = new Rolesmapping();
				rm.setRole(3L);
				rm.setMid(roleManagerMenu.getMid());
				mappingRepo.save(rm);
				System.out.println("[DataInitializer] Mapped '" + ROLE_MANAGER_MENU + "' menu (mid="
						+ roleManagerMenu.getMid() + ") to Admin role (3)");
			} else {
				System.out.println("[DataInitializer] '" + ROLE_MANAGER_MENU + "' menu already mapped to Admin role.");
			}
		} catch (Exception e) {
			System.err.println("[DataInitializer] Seed failed: " + e.getMessage());
			e.printStackTrace();
		}
	}
}
