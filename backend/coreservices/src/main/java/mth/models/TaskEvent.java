package mth.models;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** One row per state change on a task — append-only audit log. */
@Entity
@Table(name = "task_event")
public class TaskEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    Long id;

    @Column(name = "task_id", nullable = false)
    Long taskId;

    @Column(name = "actor_id")
    Long actorId;

    @Column(name = "actor_name", length = 120)
    String actorName;

    /** "CREATED" | "HANDOVER" | "ASSIGN" | "STATUS" | "DELETED" */
    @Column(length = 32, nullable = false)
    String action;

    @Column(name = "detail", length = 500)
    String detail;

    @Column(name = "created_at", nullable = false)
    LocalDateTime createdAt;

    public TaskEvent() { }
    public TaskEvent(Long taskId, Long actorId, String actorName, String action, String detail) {
        this.taskId = taskId;
        this.actorId = actorId;
        this.actorName = actorName;
        this.action = action;
        this.detail = detail;
        this.createdAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getTaskId() { return taskId; }
    public void setTaskId(Long taskId) { this.taskId = taskId; }
    public Long getActorId() { return actorId; }
    public void setActorId(Long actorId) { this.actorId = actorId; }
    public String getActorName() { return actorName; }
    public void setActorName(String actorName) { this.actorName = actorName; }
    public String getAction() { return action; }
    public void setAction(String action) { this.action = action; }
    public String getDetail() { return detail; }
    public void setDetail(String detail) { this.detail = detail; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
