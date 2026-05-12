package mth.services;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import mth.models.Roles;
import mth.models.Tasks;
import mth.models.Users;
import mth.repository.RolesRepository;
import mth.repository.TasksRepository;
import mth.repository.UsersRepository;

@Service
public class TasksService {

	@Autowired TasksRepository repo;
	@Autowired UsersRepository usersRepo;
	@Autowired RolesRepository rolesRepo;
	@Autowired JwtService JWT;

	/**
	 * Create a new task. Admin only.
	 * Body: { title, description, assigneeType ("ROLE"|"USER"), assigneeId, dueDate? }
	 */
	@Transactional
	public Object create(Map<String, Object> body, String token) {
		Map<String, Object> response = new HashMap<>();
		try {
			Map<String, Object> claims = JWT.validateJWT(token);
			Integer role = ((Number) claims.get("role")).intValue();
			String email = (String) claims.get("username");

			if (role == null || role != 3) {
				response.put("code", 403);
				response.put("message", "Only Admin can create tasks");
				return response;
			}

			String title = body.get("title") == null ? "" : body.get("title").toString().trim();
			if (title.isEmpty() || title.length() > 200) {
				response.put("code", 400);
				response.put("message", "Title is required (max 200 chars).");
				return response;
			}
			String description = body.get("description") == null ? "" : body.get("description").toString();
			if (description.length() > 2000) {
				response.put("code", 400);
				response.put("message", "Description is too long (max 2000 chars).");
				return response;
			}
			String type = body.get("assigneeType") == null ? "" : body.get("assigneeType").toString().toUpperCase();
			if (!type.equals("ROLE") && !type.equals("USER")) {
				response.put("code", 400);
				response.put("message", "assigneeType must be ROLE or USER");
				return response;
			}
			Long assigneeId = body.get("assigneeId") == null ? null : Long.valueOf(body.get("assigneeId").toString());
			if (assigneeId == null) {
				response.put("code", 400);
				response.put("message", "assigneeId is required");
				return response;
			}

			// Range-check hours / minutes if provided
			Integer hoursVal = null, minutesVal = null;
			if (body.get("hours") != null && !body.get("hours").toString().isEmpty()) {
				try { hoursVal = Integer.parseInt(body.get("hours").toString()); }
				catch (Exception e) {
					response.put("code", 400);
					response.put("message", "Hours must be a number.");
					return response;
				}
				if (hoursVal < 0 || hoursVal > 999) {
					response.put("code", 400);
					response.put("message", "Hours must be between 0 and 999.");
					return response;
				}
			}
			if (body.get("minutes") != null && !body.get("minutes").toString().isEmpty()) {
				try { minutesVal = Integer.parseInt(body.get("minutes").toString()); }
				catch (Exception e) {
					response.put("code", 400);
					response.put("message", "Minutes must be a number.");
					return response;
				}
				if (minutesVal < 0 || minutesVal > 59) {
					response.put("code", 400);
					response.put("message", "Minutes must be between 0 and 59.");
					return response;
				}
			}

			Users creator = (Users) usersRepo.findByEmail(email);

			Tasks t = new Tasks();
			t.setTitle(title);
			t.setDescription(body.get("description") == null ? "" : body.get("description").toString());
			t.setStatus("Pending");
			t.setAssigneeType(type);
			t.setAssigneeId(assigneeId);
			t.setCreatedBy(creator != null ? creator.getId() : null);
			t.setCreatedAt(LocalDateTime.now());

			Object due = body.get("dueDate");
			if (due != null && !due.toString().isEmpty()) {
				try { t.setDueDate(LocalDateTime.parse(due.toString())); }
				catch (Exception ignore) { /* leave null */ }
			}
			Object work = body.get("workDate");
			if (work != null && !work.toString().isEmpty()) {
				try { t.setWorkDate(LocalDateTime.parse(work.toString())); }
				catch (Exception ignore) { /* leave null */ }
			}
			if (body.get("hours") != null) {
				try { t.setHours(Integer.parseInt(body.get("hours").toString())); }
				catch (Exception ignore) { }
			}
			if (body.get("minutes") != null) {
				try { t.setMinutes(Integer.parseInt(body.get("minutes").toString())); }
				catch (Exception ignore) { }
			}

			repo.save(t);

			response.put("code", 200);
			response.put("message", "Task created");
			response.put("task", enrich(t));
		} catch (Exception e) {
			response.put("code", 500);
			response.put("message", e.getMessage());
		}
		return response;
	}

	/** Admin: full list of every task with assignee names enriched. */
	public Object listAll(String token) {
		Map<String, Object> response = new HashMap<>();
		try {
			Map<String, Object> claims = JWT.validateJWT(token);
			Integer role = ((Number) claims.get("role")).intValue();
			if (role == null || role != 3) {
				response.put("code", 403);
				response.put("message", "Admin only");
				return response;
			}
			List<Map<String, Object>> enriched = new ArrayList<>();
			for (Tasks t : repo.findAllOrdered()) enriched.add(enrich(t));
			response.put("code", 200);
			response.put("tasks", enriched);
		} catch (Exception e) {
			response.put("code", 500);
			response.put("message", e.getMessage());
		}
		return response;
	}

	/** Tasks visible to the JWT user — directly assigned OR by role. */
	public Object listMine(String token) {
		Map<String, Object> response = new HashMap<>();
		try {
			Map<String, Object> claims = JWT.validateJWT(token);
			String email = (String) claims.get("username");
			Users me = (Users) usersRepo.findByEmail(email);
			if (me == null) {
				response.put("code", 404);
				response.put("message", "User not found");
				return response;
			}
			List<Tasks> mine = repo.findVisibleTo(me.getId(), (long) me.getRole());
			List<Map<String, Object>> enriched = new ArrayList<>();
			for (Tasks t : mine) enriched.add(enrich(t));
			response.put("code", 200);
			response.put("tasks", enriched);
		} catch (Exception e) {
			response.put("code", 500);
			response.put("message", e.getMessage());
		}
		return response;
	}

	/**
	 * Assign an existing task to a user with date + hours + minutes.
	 * Body: { userId, workDate, hours, minutes }
	 * Admin only.
	 */
	@Transactional
	public Object assign(Long id, Map<String, Object> body, String token) {
		Map<String, Object> response = new HashMap<>();
		try {
			Map<String, Object> claims = JWT.validateJWT(token);
			Integer role = ((Number) claims.get("role")).intValue();
			if (role == null || role != 3) {
				response.put("code", 403);
				response.put("message", "Admin only");
				return response;
			}
			Tasks t = repo.findById(id).orElse(null);
			if (t == null) {
				response.put("code", 404);
				response.put("message", "Task not found");
				return response;
			}
			if (body.get("userId") != null) {
				try {
					Long uid = Long.valueOf(body.get("userId").toString());
					t.setAssigneeType("USER");
					t.setAssigneeId(uid);
				} catch (Exception ignore) { }
			}
			if (body.get("workDate") != null && !body.get("workDate").toString().isEmpty()) {
				try { t.setWorkDate(LocalDateTime.parse(body.get("workDate").toString())); }
				catch (Exception ignore) { }
			}
			if (body.get("hours") != null) {
				try { t.setHours(Integer.parseInt(body.get("hours").toString())); }
				catch (Exception ignore) { }
			}
			if (body.get("minutes") != null) {
				try { t.setMinutes(Integer.parseInt(body.get("minutes").toString())); }
				catch (Exception ignore) { }
			}
			repo.save(t);
			response.put("code", 200);
			response.put("message", "Task assigned");
			response.put("task", enrich(t));
		} catch (Exception e) {
			response.put("code", 500);
			response.put("message", e.getMessage());
		}
		return response;
	}

	/** Update task status — assignee or admin only. Body: { status } */
	@Transactional
	public Object updateStatus(Long id, Map<String, Object> body, String token) {
		Map<String, Object> response = new HashMap<>();
		try {
			Map<String, Object> claims = JWT.validateJWT(token);
			String email = (String) claims.get("username");
			Integer role = ((Number) claims.get("role")).intValue();
			Users me = (Users) usersRepo.findByEmail(email);

			Tasks t = repo.findById(id).orElse(null);
			if (t == null) {
				response.put("code", 404);
				response.put("message", "Task not found");
				return response;
			}

			boolean isAdmin = role != null && role == 3;
			boolean isAssignedByUser = "USER".equals(t.getAssigneeType()) && me != null && t.getAssigneeId().equals(me.getId());
			boolean isAssignedByRole = "ROLE".equals(t.getAssigneeType()) && me != null && t.getAssigneeId().equals((long) me.getRole());
			if (!isAdmin && !isAssignedByUser && !isAssignedByRole) {
				response.put("code", 403);
				response.put("message", "Not allowed to update this task");
				return response;
			}

			String newStatus = body.get("status") == null ? "" : body.get("status").toString();
			if (!newStatus.equals("Pending") && !newStatus.equals("InProgress") && !newStatus.equals("Completed")) {
				response.put("code", 400);
				response.put("message", "status must be Pending | InProgress | Completed");
				return response;
			}
			t.setStatus(newStatus);
			repo.save(t);

			response.put("code", 200);
			response.put("message", "Status updated");
			response.put("task", enrich(t));
		} catch (Exception e) {
			response.put("code", 500);
			response.put("message", e.getMessage());
		}
		return response;
	}

	/** Admin only — delete a task. */
	@Transactional
	public Object delete(Long id, String token) {
		Map<String, Object> response = new HashMap<>();
		try {
			Map<String, Object> claims = JWT.validateJWT(token);
			Integer role = ((Number) claims.get("role")).intValue();
			if (role == null || role != 3) {
				response.put("code", 403);
				response.put("message", "Admin only");
				return response;
			}
			if (!repo.findById(id).isPresent()) {
				response.put("code", 404);
				response.put("message", "Task not found");
				return response;
			}
			repo.deleteById(id);
			response.put("code", 200);
			response.put("message", "Task deleted");
		} catch (Exception e) {
			response.put("code", 500);
			response.put("message", e.getMessage());
		}
		return response;
	}

	/** Adds assigneeName + creatorName so the UI doesn't have to do lookups. */
	private Map<String, Object> enrich(Tasks t) {
		Map<String, Object> m = new HashMap<>();
		m.put("id", t.getId());
		m.put("title", t.getTitle());
		m.put("description", t.getDescription());
		m.put("status", t.getStatus());
		m.put("assigneeType", t.getAssigneeType());
		m.put("assigneeId", t.getAssigneeId());
		m.put("createdBy", t.getCreatedBy());
		m.put("createdAt", t.getCreatedAt() != null ? t.getCreatedAt().toString() : null);
		m.put("dueDate",   t.getDueDate()   != null ? t.getDueDate().toString()   : null);
		m.put("workDate",  t.getWorkDate()  != null ? t.getWorkDate().toString()  : null);
		m.put("hours",     t.getHours());
		m.put("minutes",   t.getMinutes());

		String assigneeName = null;
		if ("ROLE".equals(t.getAssigneeType()) && t.getAssigneeId() != null) {
			Roles r = rolesRepo.findById(t.getAssigneeId()).orElse(null);
			assigneeName = r != null ? r.getRolename() : ("Role #" + t.getAssigneeId());
		} else if ("USER".equals(t.getAssigneeType()) && t.getAssigneeId() != null) {
			Users u = usersRepo.findById(t.getAssigneeId()).orElse(null);
			assigneeName = u != null ? u.getFullname() : ("User #" + t.getAssigneeId());
		}
		m.put("assigneeName", assigneeName);

		String creatorName = null;
		if (t.getCreatedBy() != null) {
			Users c = usersRepo.findById(t.getCreatedBy()).orElse(null);
			creatorName = c != null ? c.getFullname() : null;
		}
		m.put("creatorName", creatorName);
		return m;
	}
}
