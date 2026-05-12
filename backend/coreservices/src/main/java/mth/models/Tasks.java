package mth.models;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "tasks")
public class Tasks {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    Long id;

    @Column(nullable = false, length = 200)
    String title;

    @Column(columnDefinition = "TEXT")
    String description;

    /** "Pending" | "InProgress" | "Completed" */
    @Column(length = 20)
    String status;

    /** "ROLE" or "USER" — which kind of assignee `assigneeId` refers to. */
    @Column(name = "assignee_type", length = 8)
    String assigneeType;

    @Column(name = "assignee_id")
    Long assigneeId;

    /** users.id of the admin who created the task. */
    @Column(name = "created_by")
    Long createdBy;

    @Column(name = "created_at")
    LocalDateTime createdAt;

    @Column(name = "due_date")
    LocalDateTime dueDate;

    /** Date the task is scheduled to be worked on (separate from due date). */
    @Column(name = "work_date")
    LocalDateTime workDate;

    /** Time allocated to the task in hours/minutes. */
    @Column(name = "hours")
    Integer hours;

    @Column(name = "minutes")
    Integer minutes;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getAssigneeType() { return assigneeType; }
    public void setAssigneeType(String assigneeType) { this.assigneeType = assigneeType; }
    public Long getAssigneeId() { return assigneeId; }
    public void setAssigneeId(Long assigneeId) { this.assigneeId = assigneeId; }
    public Long getCreatedBy() { return createdBy; }
    public void setCreatedBy(Long createdBy) { this.createdBy = createdBy; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public LocalDateTime getDueDate() { return dueDate; }
    public void setDueDate(LocalDateTime dueDate) { this.dueDate = dueDate; }
    public LocalDateTime getWorkDate() { return workDate; }
    public void setWorkDate(LocalDateTime workDate) { this.workDate = workDate; }
    public Integer getHours() { return hours; }
    public void setHours(Integer hours) { this.hours = hours; }
    public Integer getMinutes() { return minutes; }
    public void setMinutes(Integer minutes) { this.minutes = minutes; }
}
