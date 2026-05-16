package mth.controller;

import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import mth.services.TasksService;

@RestController
@RequestMapping("/tasks")
@CrossOrigin(origins = "*")
public class TasksController {

	@Autowired
	TasksService TS;

	@PostMapping
	public Object create(@RequestBody Map<String, Object> body,
	                     @RequestHeader("Token") String token) {
		return TS.create(body, token);
	}

	@PostMapping("/bulk")
	public Object bulkCreate(@RequestBody Map<String, Object> body,
	                         @RequestHeader("Token") String token) {
		return TS.bulkCreate(body, token);
	}

	@GetMapping("/all")
	public Object listAll(@RequestHeader("Token") String token) {
		return TS.listAll(token);
	}

	@GetMapping("/my")
	public Object listMine(@RequestHeader("Token") String token) {
		return TS.listMine(token);
	}

	@PatchMapping("/{id}/status")
	public Object updateStatus(@PathVariable Long id,
	                           @RequestBody Map<String, Object> body,
	                           @RequestHeader("Token") String token) {
		return TS.updateStatus(id, body, token);
	}

	@PatchMapping("/{id}/assign")
	public Object assign(@PathVariable Long id,
	                     @RequestBody Map<String, Object> body,
	                     @RequestHeader("Token") String token) {
		return TS.assign(id, body, token);
	}

	@DeleteMapping("/{id}")
	public Object delete(@PathVariable Long id,
	                     @RequestHeader("Token") String token) {
		return TS.delete(id, token);
	}

	@GetMapping("/notifications")
	public Object notifications(@RequestHeader("Token") String token) {
		return TS.pendingNotifications(token);
	}

	@PostMapping("/notifications/ack")
	public Object ackNotifications(@RequestHeader("Token") String token) {
		return TS.ackNotifications(token);
	}
}
