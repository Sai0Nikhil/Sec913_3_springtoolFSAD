package mth.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import mth.models.TaskEvent;

@Repository
public interface TaskEventRepository extends JpaRepository<TaskEvent, Long> {

    /** Oldest → newest so the UI shows the task's life as a chronological timeline. */
    List<TaskEvent> findByTaskIdOrderByCreatedAtAsc(Long taskId);
}
