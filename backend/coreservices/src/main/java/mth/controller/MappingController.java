package mth.controller;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import mth.models.Rolesmapping;
import mth.repository.RolesmappingRepository;

@RestController
@RequestMapping("/mapping")
@CrossOrigin(origins = "*")
public class MappingController {

    @Autowired
    RolesmappingRepository repo;

    @GetMapping("/{role}")
    public List<Rolesmapping> getRoleMappings(@PathVariable Long role) {
        return repo.findByRole(role);
    }

    @PostMapping
    @Transactional
    public Object saveMappings(@RequestBody List<Rolesmapping> mappings) {
        Map<String, Object> response = new HashMap<>();
        try {
            if (mappings != null && mappings.size() > 0) {
                Long role = mappings.get(0).getRole();
                repo.deleteByRole(role);
                repo.saveAll(mappings);
            }
            response.put("code", 200);
            response.put("message", "Mappings saved successfully");
        } catch (Exception e) {
            response.put("code", 500);
            response.put("message", e.getMessage());
        }
        return response;
    }

    /**
     * Returns every role↔menu mapping with names attached.
     */
    @GetMapping("/list-all")
    public List<Map<String, Object>> listAllMappings() {
        List<Object[]> rows = repo.findAllMappingsWithNames();
        List<Map<String, Object>> out = new ArrayList<>(rows.size());
        for (Object[] r : rows) {
            Map<String, Object> entry = new HashMap<>();
            entry.put("roleId",   r[0]);
            entry.put("roleName", r[1]);
            entry.put("mid",      r[2]);
            entry.put("menu",     r[3]);
            out.add(entry);
        }
        return out;
    }
}
