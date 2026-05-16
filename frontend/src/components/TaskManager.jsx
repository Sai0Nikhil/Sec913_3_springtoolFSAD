import React, { useEffect, useState } from 'react';
import { apibaseurl, callApi } from '../lib';
import './AdminPages.css';
import './TaskManager.css';
import PageHeader from './PageHeader';
import { downloadCsv, downloadPdfTable, fmtDateTime } from '../exports.js';

// Pull the current user's role from the JWT so we can adapt the UI.
function readRoleFromToken(t) {
    try {
        if (!t) return null;
        const parts = t.split('.');
        if (parts.length < 2) return null;
        const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
        return payload.role == null ? null : Number(payload.role);
    } catch { return null; }
}

const TaskManager = ({ token }) => {
    const [roles, setRoles] = useState([]);
    const [users, setUsers] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(false);
    const myRole = readRoleFromToken(token);
    const isAdmin = myRole === 3;

    // Handover/assign popover for the Manager's row-level button
    const [assignFor, setAssignFor] = useState(null);   // task id
    const [assignToUser, setAssignToUser] = useState("");

    const empty = {
        title: "",
        description: "",
        assigneeType: "ROLE",   // ROLE | USER
        assigneeId: "",
        dueDate: "",
        hours: "",
        minutes: ""
    };
    const [form, setForm] = useState(empty);
    const [filter, setFilter] = useState("all");

    // Bulk CSV import
    const [bulkPreview, setBulkPreview] = useState([]);     // parsed titles awaiting confirm
    const [bulkFileName, setBulkFileName] = useState("");
    const [bulkBusy, setBulkBusy] = useState(false);

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

    /** Picking an existing task from the dropdown copies its title into the manual input. */
    function onPickExisting(e) {
        const taskId = e.target.value;
        if (!taskId) return;
        const t = tasks.find(x => String(x.id) === String(taskId));
        if (!t) return;
        setForm(prev => ({
            ...prev,
            title: t.title || "",
            description: t.description || prev.description
        }));
    }

    function submit() {
        if (!form.title.trim()) { alert("Title is required"); return; }
        if (!form.assigneeId)    { alert("Pick an assignee"); return; }

        const payload = {
            title: form.title.trim(),
            description: form.description.trim(),
            assigneeType: form.assigneeType,
            assigneeId: Number(form.assigneeId),
            dueDate: form.dueDate ? form.dueDate + "T23:59:00" : "",
            workDate: form.dueDate ? form.dueDate + "T00:00:00" : "",
            hours:   form.hours   === "" ? null : Number(form.hours),
            minutes: form.minutes === "" ? null : Number(form.minutes)
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

    function onCsvPicked(e) {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        setBulkFileName(file.name);

        const reader = new FileReader();
        reader.onload = (ev) => {
            const raw = String(ev.target.result || "");
            // Single-column CSV — split on newlines, strip optional surrounding quotes,
            // ignore the first row if it looks like a header.
            const lines = raw
                .split(/\r?\n/)
                .map(l => l.trim())
                .map(l => l.replace(/^"(.*)"$/, "$1"))
                .filter(l => l.length > 0);
            if (lines.length === 0) {
                alert("That file is empty.");
                setBulkPreview([]);
                return;
            }
            // Skip a header if first row reads like "title" / "task" / "name"
            const first = lines[0].toLowerCase().replace(/[^a-z]/g, "");
            const skipHeader = first === "title" || first === "task" || first === "name" || first === "tasks";
            const titles = skipHeader ? lines.slice(1) : lines;
            setBulkPreview(titles);
        };
        reader.onerror = () => alert("Failed to read file.");
        reader.readAsText(file);
        // Allow re-uploading the same file
        e.target.value = "";
    }

    function submitBulk() {
        if (bulkPreview.length === 0) { alert("Nothing to import."); return; }
        if (!confirm(`Create ${bulkPreview.length} task(s) from "${bulkFileName}"? Each will land in the Assign queue.`)) return;
        setBulkBusy(true);
        callApi("POST", apibaseurl + "/tasks/bulk", { titles: bulkPreview }, null, (res) => {
            setBulkBusy(false);
            if (res && res.code === 200) {
                alert(
                    `Imported ${res.created} task(s).\n` +
                    `Skipped blank: ${res.skippedBlank ?? 0}\n` +
                    `Skipped too long: ${res.skippedTooLong ?? 0}` +
                    (res.errors && res.errors.length ? `\nErrors: ${res.errors.length}` : "")
                );
                setBulkPreview([]);
                setBulkFileName("");
                loadTasks();
            } else {
                alert((res && res.message) || "Bulk import failed.");
            }
        }, token);
    }

    function cancelBulk() {
        setBulkPreview([]);
        setBulkFileName("");
    }

    function openAssign(t) {
        setAssignFor(t.id);
        setAssignToUser("");
    }
    function cancelAssign() {
        setAssignFor(null);
        setAssignToUser("");
    }
    function confirmAssign(t) {
        if (!assignToUser) { alert("Pick a user."); return; }
        callApi("PATCH", apibaseurl + "/tasks/" + t.id + "/assign",
            { userId: Number(assignToUser) }, null, (res) => {
                if (res && res.code === 200) {
                    setAssignFor(null);
                    setAssignToUser("");
                    loadTasks();
                } else {
                    alert((res && res.message) || "Failed to assign");
                }
            }, token);
    }

    function exportTasksPdf(rows, currentFilter) {
        const list = currentFilter === "all" ? rows : rows.filter(t => t.status === currentFilter);
        downloadPdfTable({
            title: "Task Manager — All Tasks",
            subtitle:
                "Filter: " + (currentFilter === "all" ? "All" : currentFilter)
                + "  •  " + list.length + " row(s)",
            columns: [
                { header: "ID",       dataKey: "id" },
                { header: "Title",    dataKey: "title" },
                { header: "Status",   dataKey: "status" },
                { header: "Assignee", dataKey: "assigneeName" },
                { header: "Type",     dataKey: "assigneeType" },
                { header: "Hours",    dataKey: "hours" },
                { header: "Minutes",  dataKey: "minutes" },
                { header: "Due",      dataKey: "_due" },
                { header: "Created",  dataKey: "_created" }
            ],
            rows: list.map(t => ({
                ...t,
                _due:     fmtDateTime(t.workDate || t.dueDate),
                _created: fmtDateTime(t.createdAt)
            })),
            filename: "tasks-" + (currentFilter === "all" ? "all" : currentFilter.toLowerCase())
        });
    }

    return (
        <>
            <PageHeader
                crumbs={[isAdmin ? "Admin" : "Manager", "Task Manager"]}
                title={isAdmin ? "Task Manager" : "Tasks Delegated to You"}
                subtitle={isAdmin
                    ? "Create tasks and hand them to a Manager — or assign directly to a User."
                    : "Tasks the Admin handed to you. Assign each one to a User to send it down the line."}
            />

            <div className="ap">
                {isAdmin && (
                <div className="ap-section">
                    <h3 className="ap-title">Create New Task</h3>
                    <div className="ap-form">

                        {/* Task name with dropdown of existing + manual typing */}
                        <div className="ap-field ap-full">
                            <label>Task Name*</label>
                            <div className="tm-title-row">
                                <select
                                    className="tm-title-select"
                                    onChange={onPickExisting}
                                    value=""
                                    title="Pick an existing task to copy its name"
                                >
                                    <option value="">Pick existing…</option>
                                    {tasks.map(t => (
                                        <option key={t.id} value={t.id}>{t.title}</option>
                                    ))}
                                </select>
                                <input
                                    className="tm-title-input"
                                    name="title"
                                    placeholder="…or type a new task name"
                                    value={form.title}
                                    onChange={onChange}
                                />
                            </div>
                            <div className="tm-hint">Pick from the dropdown to copy an existing name, or just type a new one.</div>
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
                                    ? roles
                                        .filter(r => (r.rolename || "").toLowerCase() !== "admin" && Number(r.role) !== 3)
                                        .map(r => <option key={r.role} value={r.role}>{r.rolename}</option>)
                                    : users
                                        .filter(u => Number(u.role) !== 3)
                                        .map(u => <option key={u.id} value={u.id}>{u.fullname} ({u.email})</option>)
                                }
                            </select>
                        </div>

                        <div className="ap-field">
                            <label>Due / Work Date</label>
                            <input type="date" name="dueDate" value={form.dueDate} onChange={onChange} />
                        </div>
                        <div className="ap-field">
                            <label>Time allocated</label>
                            <div className="tm-time-row">
                                <input type="number" name="hours"   min="0" max="999" placeholder="Hours"   value={form.hours}   onChange={onChange} />
                                <input type="number" name="minutes" min="0" max="59"  placeholder="Minutes" value={form.minutes} onChange={onChange} />
                            </div>
                        </div>

                        <div className="ap-form-actions">
                            <button type="button" className="ap-ghost" onClick={() => setForm(empty)}>Reset</button>
                            <button type="button" className="ap-primary" onClick={submit}>Create Task</button>
                        </div>
                    </div>
                </div>
                )}

                {/* ===== Bulk CSV import (admin only) ===== */}
                {isAdmin && (
                <div className="ap-section tm-bulk-section">
                    <div className="ap-section-head">
                        <h3 className="ap-title">Bulk Import (CSV)</h3>
                        <div className="tm-bulk-hint">One task title per row · single column · header row optional</div>
                    </div>

                    <div className="tm-bulk-row">
                        <label className="tm-bulk-picker">
                            <input type="file" accept=".csv,text/csv,text/plain" onChange={onCsvPicked} />
                            <span className="tm-bulk-picker-btn">Choose CSV file</span>
                            <span className="tm-bulk-filename">{bulkFileName || "no file selected"}</span>
                        </label>
                    </div>

                    {bulkPreview.length > 0 && isAdmin && (
                        <div className="tm-bulk-preview">
                            <div className="tm-bulk-preview-head">
                                Preview · <strong>{bulkPreview.length}</strong> task(s) detected
                            </div>
                            <ol className="tm-bulk-list">
                                {bulkPreview.slice(0, 25).map((t, i) => (
                                    <li key={i}>{t}</li>
                                ))}
                                {bulkPreview.length > 25 && (
                                    <li className="tm-bulk-more">…and {bulkPreview.length - 25} more</li>
                                )}
                            </ol>
                            <div className="ap-form-actions">
                                <button className="ap-ghost" onClick={cancelBulk} disabled={bulkBusy}>Cancel</button>
                                <button className="ap-primary" onClick={submitBulk} disabled={bulkBusy}>
                                    {bulkBusy ? "Importing…" : `Import ${bulkPreview.length} task(s)`}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
                )}

                <div className="ap-section">
                    <div className="ap-section-head">
                        <h3 className="ap-title">{isAdmin ? "All Tasks" : "My Delegated Tasks"}</h3>
                        <div className="ap-export-actions">
                            <button className="ap-export-btn ap-export-csv"
                                onClick={() => downloadCsv("/reports/tasks/all.csv", "tasks-all.csv", token)}
                                title="Download CSV (opens in Excel)"
                            >⤓ CSV</button>
                            <button className="ap-export-btn ap-export-pdf"
                                onClick={() => exportTasksPdf(tasks, filter)}
                                title="Download PDF report"
                            >⤓ PDF</button>
                        </div>
                    </div>

                    {(() => {
                        const counts = {
                            all:        tasks.length,
                            Pending:    tasks.filter(t => t.status === "Pending").length,
                            InProgress: tasks.filter(t => t.status === "InProgress").length,
                            Completed:  tasks.filter(t => t.status === "Completed").length
                        };
                        return (
                            <div className="ap-tabs">
                                {["all", "Pending", "InProgress", "Completed"].map(k => (
                                    <button
                                        key={k}
                                        className={"ap-tab " + (filter === k ? "is-active" : "")}
                                        onClick={() => setFilter(k)}
                                    >
                                        {k === "all" ? "All" : (k === "InProgress" ? "In Progress" : k)}
                                        <span className="ap-tab-count">{counts[k]}</span>
                                    </button>
                                ))}
                            </div>
                        );
                    })()}

                    {loading && <div className="ap-empty">Loading…</div>}
                    {(() => {
                        const filtered = filter === "all" ? tasks : tasks.filter(t => t.status === filter);
                        if (!loading && filtered.length === 0) {
                            return <div className="ap-empty">{filter === "all" ? "No tasks yet — create one above." : "Nothing matches this filter."}</div>;
                        }
                        return null;
                    })()}
                    {!loading && (filter === "all" ? tasks : tasks.filter(t => t.status === filter)).length > 0 && (
                        <table className="ap-table">
                            <thead>
                                <tr>
                                    <th>Title</th>
                                    <th>Assignee</th>
                                    <th>Status</th>
                                    <th>Time</th>
                                    <th>Date</th>
                                    <th>Created</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {(filter === "all" ? tasks : tasks.filter(t => t.status === filter)).map(t => (
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
                                        <td>
                                            {(t.hours != null || t.minutes != null)
                                                ? `${t.hours || 0}h ${t.minutes || 0}m`
                                                : "—"}
                                        </td>
                                        <td>{fmt(t.workDate || t.dueDate)}</td>
                                        <td>{fmt(t.createdAt)}</td>
                                        <td>
                                            <div className="ap-row-actions">
                                                {!isAdmin && assignFor === t.id ? (
                                                    <>
                                                        <select
                                                            className="tm-title-select"
                                                            style={{ minWidth: 200 }}
                                                            value={assignToUser}
                                                            onChange={(e) => setAssignToUser(e.target.value)}
                                                        >
                                                            <option value="">Pick user…</option>
                                                            {users
                                                                .filter(u => Number(u.role) === 1)
                                                                .map(u => (
                                                                    <option key={u.id} value={u.id}>{u.fullname} ({u.email})</option>
                                                                ))}
                                                        </select>
                                                        <button className="ap-primary" onClick={() => confirmAssign(t)}>Confirm</button>
                                                        <button className="ap-ghost" onClick={cancelAssign}>Cancel</button>
                                                    </>
                                                ) : (
                                                    <>
                                                        {!isAdmin && (
                                                            <button className="ap-primary" onClick={() => openAssign(t)}>Assign to User →</button>
                                                        )}
                                                        {isAdmin && t.status !== "Completed" && (
                                                            <button className="ap-ghost" onClick={() => setStatus(t, "Completed")}>Mark Done</button>
                                                        )}
                                                        {isAdmin && (
                                                            <button className="ap-danger" onClick={() => remove(t)}>Delete</button>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </>
    );
};

export default TaskManager;
