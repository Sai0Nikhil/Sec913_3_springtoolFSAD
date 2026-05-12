package mth.controller;

import java.nio.charset.StandardCharsets;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import mth.services.ReportsService;

/**
 * CSV download endpoints. Each one streams a Content-Disposition: attachment
 * response so the browser auto-downloads. Excel/Sheets open these natively.
 */
@RestController
@RequestMapping("/reports")
@CrossOrigin(origins = "*")
public class ReportsController {

	@Autowired
	ReportsService RS;

	@GetMapping("/tasks/all.csv")
	public ResponseEntity<byte[]> tasksAll(@RequestHeader("Token") String token) {
		return wrap(safe(() -> RS.tasksAllCsv(token)), "tasks-all");
	}

	@GetMapping("/tasks/my.csv")
	public ResponseEntity<byte[]> tasksMy(@RequestHeader("Token") String token) {
		return wrap(safe(() -> RS.tasksMyCsv(token)), "my-tasks");
	}

	@GetMapping("/tasks/completion.csv")
	public ResponseEntity<byte[]> taskCompletion(@RequestHeader("Token") String token) {
		return wrap(safe(() -> RS.taskCompletionCsv(token)), "task-completion");
	}

	@GetMapping("/users.csv")
	public ResponseEntity<byte[]> users(@RequestHeader("Token") String token) {
		return wrap(safe(() -> RS.usersCsv(token)), "users");
	}

	@GetMapping("/mappings.csv")
	public ResponseEntity<byte[]> mappings(@RequestHeader("Token") String token) {
		return wrap(safe(() -> RS.mappingsCsv(token)), "role-mappings");
	}

	/* ----- helpers ----- */
	@FunctionalInterface
	private interface CsvSupplier { String get() throws Exception; }

	private String safe(CsvSupplier s) {
		try { return s.get(); }
		catch (IllegalStateException e) { return null; }   // 403
		catch (Exception e) { return ""; }                  // 500
	}

	private ResponseEntity<byte[]> wrap(String body, String basename) {
		if (body == null) return ResponseEntity.status(403).body("Forbidden".getBytes(StandardCharsets.UTF_8));
		String stamp = java.time.LocalDate.now().toString(); // YYYY-MM-DD
		String filename = basename + "-" + stamp + ".csv";

		HttpHeaders headers = new HttpHeaders();
		headers.setContentType(MediaType.parseMediaType("text/csv; charset=UTF-8"));
		headers.setContentDispositionFormData("attachment", filename);
		headers.setCacheControl("no-cache, no-store");
		return new ResponseEntity<>(body.getBytes(StandardCharsets.UTF_8), headers, 200);
	}
}
