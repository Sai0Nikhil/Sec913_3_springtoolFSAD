import React, { useEffect, useState } from 'react';
import { apibaseurl, callApi } from '../lib';
import './AdminPages.css';

/**
 * Admin-only page to create tasks and assign them to a role or to a specific user,
 * plus a table of every task in the system.
 */
const TaskManager = ({ token }) => {
    const [roles, setRoles] = useState([]);
    const [users, setUsers] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(false);

    const empty = {
        title: "",
        description: "",
        assigneeType: "ROLE",  // ROLE | USER
        assigneeId: "",
        dueDate: ""
    };
    const [form, setForm] = useState(empty);

    useEffect(() => {
        loadRoles();
        loadUsers();
        loadTasks();
    }, []);

    function loadRoles() {
        callApi("GET", apibaseurl + "/roles", null, null, (res) => {
            if (Array.isArray(res)) setRoles(res);
        }, token);
    }
    function loadUsers() {
        callApi("GET", apibaseurl + "/authservice/list", null, null, (res) => {
            if (res && Array.isArray(res.users)) setUsers(res.users);
        }, token);
    }
    function loadTasks() {
        setLoading(true);
        callApi("GET", apibaseurl + "/tasks/all", null, null, (res) => {
            setLoading(false);
            if (res && Array.isArray(res.tasks)) setTasks(res.tasks);
            else setTasks([]);
        }, token);
    }

    function onChange(e) {
        const { name, value } = e.target;
        if (name === "assigneeType") {
            setForm({ ...form, assigneeType: value, assigneeId: "" });
        } else {
            setForm({ ...form, [name]: value });
        }
    }

    function submit() {
        if (!form.title.trim()) { alert("Title is required"); return; }
        if (!form.assigneeId) { alert("Pick an assignee"); return; }

        const payload = {
            title: form.title.trim(),
            description: form.description.trim(),
            assigneeType: form.assigneeType,
            assigneeId: Number(form.assigneeId),
            dueDate: form.dueDate ? form.dueDate + "T23:59:00" : ""
        };
        callApi("POST", apibaseurl + "/tasks", payload, null, (res) => {
            if (res && res.code === 200) {
                setForm(empty);
                loadTasks();
            } else {
                alert((res && res.message) || "Failed to create task");
            }
        }, token);
    }

    function setStatus(t, newStatus) {
        callApi("PATCH", apibaseurl + "/tasks/" + t.id + "/status",
            { status: newStatus }, null, (res) => {
                if (res && res.code === 200) loadTasks();
                else alert((res && res.message) || "Failed to update");
            }, token);
    }

    function remove(t) {
        if (!confirm(`Delete task "${t.title}"?`)) return;
        callApi("DELETE", apibaseurl + "/tasks/" + t.id, null, null, (res) => {
            if (res && res.code === 200) loadTasks();
            else alert((res && res.message) || "Failed to delete");
        }, token);
    }

    function fmt(d) {
        if (!d) return "—";
        try { const dt = new Date(d); if (isNaN(dt)) return d; return dt.toLocaleString(); }
        catch { return d; }
    }

    return (
        <div className="ap">
            <div className="ap-section">
                <h3 className="ap-title">Create New Task</h3>
                <div className="ap-form">
                    <div className="ap-field ap-full">
                        <label>Title*</label>
                        <input name="title" value={form.title} onChange={onChange} placeholder="e.g. Update Q2 invoice template" />
                    </div>
                    <div className="ap-field ap-full">
                        <label>Description</label>
                        <textarea name="description" value={form.description} onChange={onChange} placeholder="Optional details" />
                    </div>
                    <div className="ap-field">
                        <label>Assign To</label>
                        <select name="assigneeType" value={form.assigneeType} onChange={onChange}>
                            <option value="ROLE">A role</option>
                            <option value="USER">A specific user</option>
                        </select>
                    </div>
                    <div className="ap-field">
                        <label>{form.assigneeType === "ROLE" ? "Role*" : "User*"}</label>
                        <select name="assigneeId" value={form.assigneeId} onChange={onChange}>
                            <option value="">Select…</option>
                            {form.assigneeType === "ROLE"
                                ? roles.map(r => <option key={r.role} value={r.role}>{r.rolename}</option>)
                                : users.map(u => <option key={u.id} value={u.id}>{u.fullname} ({u.email})</option>)
                            }
                        </select>
                    </div>
                    <div className="ap-field">
                        <label>Due Date</label>
                        <input type="date" name="dueDate" value={form.dueDate} onChange={onChange} />
                    </div>
                    <div className="ap-form-actions">
                        <button type="button" className="ap-ghost" onClick={() => setForm(empty)}>Reset</button>
                        <button type="button" className="ap-primary" onClick={submit}>Create Task</button>
                    </div>
                </div>
            </div>

            <div className="ap-section">
                <h3 className="ap-title">All Tasks</h3>
                {loading && <div className="ap-empty">Loading…</div>}
                {!loading && tasks.length === 0 && (
                    <div className="ap-empty">No tasks yet — create one above.</div>
                )}
                {!loading && tasks.length > 0 && (
                    <table className="ap-table">
                        <thead>
                            <tr>
                                <th>Title</th>
                                <th>Assignee</th>
                                <th>Status</th>
                                <th>Due</th>
                                <th>Created</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {tasks.map(t => (
                                <tr key={t.id}>
                                    <td>
                                        <div style={{ fontWeight: 600 }}>{t.title}</div>
                                        {t.description && <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 2 }}>{t.description}</div>}
                                    </td>
                                    <td>
                                        <span className="ap-assignee">
                                            <span className="ap-assignee-type">{t.assigneeType}</span>
                                            {t.assigneeName || "—"}
                                        </span>
                                    </td>
                                    <td><span className={"ap-status ap-status-" + t.status}>{t.status}</span></td>
                                    <td>{fmt(t.dueDate)}</td>
                                    <td>{fmt(t.createdAt)}</td>
                                    <td>
                                        <div className="ap-row-actions">
                                            {t.status !== "Completed" && (
                                                <button className="ap-ghost" onClick={() => setStatus(t, "Completed")}>Mark Done</button>
                                            )}
                                            <button className="ap-danger" onClick={() => remove(t)}>Delete</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export default TaskManager;
