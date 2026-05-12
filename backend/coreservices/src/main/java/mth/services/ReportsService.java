package mth.services;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import mth.models.Tasks;
import mth.models.Users;
import mth.repository.RolesRepository;
import mth.repository.RolesmappingRepository;
import mth.repository.TasksRepository;
import mth.repository.UsersRepository;
import mth.util.CsvUtil;

@Service
public class ReportsService {

	@Autowired TasksRepository       tasksRepo;
	@Autowired UsersRepository       usersRepo;
	@Autowired RolesRepository       rolesRepo;
	@Autowired RolesmappingRepository mappingRepo;
	@Autowired JwtService            JWT;

	/* ------------------------------------------------------------------ */
	/* TASKS                                                              */
	/* ------------------------------------------------------------------ */

	/** Admin: every task. */
	public String tasksAllCsv(String token) throws Exception {
		Map<String, Object> claims = JWT.validateJWT(token);
		Integer role = ((Number) claims.get("role")).intValue();
		if (role == null || role != 3) throw new IllegalStateException("Admin only");
		return buildTasksCsv(tasksRepo.findAllOrdered());
	}

	/** Anyone: tasks assigned to them (directly or by role). */
	public String tasksMyCsv(String token) throws Exception {
		Map<String, Object> claims = JWT.validateJWT(token);
		String email = (String) claims.get("username");
		Users me = (Users) usersRepo.findByEmail(email);
		if (me == null) throw new IllegalStateException("User not found");
		return buildTasksCsv(tasksRepo.findVisibleTo(me.getId(), (long) me.getRole()));
	}

	/** Admin: only Completed tasks across the system. */
	public String taskCompletionCsv(String token) throws Exception {
		Map<String, Object> claims = JWT.validateJWT(token);
		Integer role = ((Number) claims.get("role")).intValue();
		if (role == null || role != 3) throw new IllegalStateException("Admin only");
		List<Tasks> all = tasksRepo.findAllOrdered();
		List<Tasks> done = new ArrayList<>();
		for (Tasks t : all) if ("Completed".equals(t.getStatus())) done.add(t);
		return buildTasksCsv(done);
	}

	private String buildTasksCsv(List<Tasks> rows) {
		List<String> headers = Arrays.asList(
			"ID", "Title", "Description", "Status",
			"Assignee Type", "Assignee", "Created By",
			"Hours", "Minutes", "Work Date", "Due Date", "Created At"
		);
		List<List<Object>> data = new ArrayList<>();
		for (Tasks t : rows) {
			String assignee = "";
			if ("ROLE".equals(t.getAssigneeType()) && t.getAssigneeId() != null) {
				assignee = rolesRepo.findById(t.getAssigneeId()).map(r -> r.getRolename()).orElse("");
			} else if ("USER".equals(t.getAssigneeType()) && t.getAssigneeId() != null) {
				assignee = usersRepo.findById(t.getAssigneeId()).map(u -> u.getFullname()).orElse("");
			}
			String creator = "";
			if (t.getCreatedBy() != null) {
				creator = usersRepo.findById(t.getCreatedBy()).map(u -> u.getFullname()).orElse("");
			}
			data.add(Arrays.<Object>asList(
				t.getId(),
				t.getTitle(),
				t.getDescription() == null ? "" : t.getDescription(),
				t.getStatus(),
				t.getAssigneeType(),
				assignee,
				creator,
				t.getHours()   == null ? "" : t.getHours(),
				t.getMinutes() == null ? "" : t.getMinutes(),
				t.getWorkDate() == null ? "" : t.getWorkDate().toString(),
				t.getDueDate()  == null ? "" : t.getDueDate().toString(),
				t.getCreatedAt()== null ? "" : t.getCreatedAt().toString()
			));
		}
		return CsvUtil.build(headers, data);
	}

	/* ------------------------------------------------------------------ */
	/* USERS                                                              */
	/* ------------------------------------------------------------------ */

	public String usersCsv(String token) throws Exception {
		Map<String, Object> claims = JWT.validateJWT(token);
		Integer role = ((Number) claims.get("role")).intValue();
		if (role == null || role != 3) throw new IllegalStateException("Admin only");

		List<String> headers = Arrays.asList("ID", "Full Name", "Email", "Phone", "Role", "Role Name", "Status");
		List<List<Object>> data = new ArrayList<>();
		for (Object[] r : usersRepo.listAllWithRole()) {
			data.add(Arrays.<Object>asList(
				r[0], r[1], r[2], r[3], r[4], r[5],
				(Integer.valueOf(1).equals(r[6])) ? "Active" : "Inactive"
			));
		}
		return CsvUtil.build(headers, data);
	}

	/* ------------------------------------------------------------------ */
	/* ROLE ↔ MENU MAPPINGS                                               */
	/* ------------------------------------------------------------------ */

	public String mappingsCsv(String token) throws Exception {
		Map<String, Object> claims = JWT.validateJWT(token);
		Integer role = ((Number) claims.get("role")).intValue();
		if (role == null || role != 3) throw new IllegalStateException("Admin only");

		List<String> headers = Arrays.asList("Role ID", "Role Name", "Menu ID", "Menu");
		List<List<Object>> data = new ArrayList<>();
		for (Object[] r : mappingRepo.findAllMappingsWithNames()) {
			data.add(Arrays.<Object>asList(r[0], r[1], r[2], r[3]));
		}
		return CsvUtil.build(headers, data);
	}
}
