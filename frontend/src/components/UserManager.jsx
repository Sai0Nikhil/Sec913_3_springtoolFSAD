import React, { useEffect, useMemo, useState } from 'react';
import { apibaseurl, callApi } from '../lib';
import './AdminPages.css';

/**
 * Admin-only: list every user with their role mapping, status, and contact info.
 */
const UserManager = ({ token }) => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [filter, setFilter] = useState("");

    useEffect(() => { load(); }, []);

    function load() {
        setLoading(true);
        callApi("GET", apibaseurl + "/authservice/list", null, null, (res) => {
            setLoading(false);
            if (res && Array.isArray(res.users)) setUsers(res.users);
            else setUsers([]);
        }, token);
    }

    const filtered = useMemo(() => {
        const q = filter.trim().toLowerCase();
        if (!q) return users;
        return users.filter(u =>
            (u.fullname || "").toLowerCase().includes(q) ||
            (u.email || "").toLowerCase().includes(q) ||
            (u.rolename || "").toLowerCase().includes(q)
        );
    }, [users, filter]);

    function roleChipClass(name) {
        const n = (name || "").toLowerCase();
        if (n === "admin")   return "ap-role-chip ap-role-admin";
        if (n === "manager") return "ap-role-chip ap-role-manager";
        if (n === "user")    return "ap-role-chip ap-role-user";
        return "ap-role-chip";
    }

    return (
        <div className="ap">
            <div className="ap-section">
                <h3 className="ap-title">Users</h3>

                <div className="ap-field" style={{ marginBottom: 16 }}>
                    <input
                        type="text"
                        placeholder="Search by name, email or role…"
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                    />
                </div>

                {loading && <div className="ap-empty">Loading…</div>}
                {!loading && filtered.length === 0 && (
                    <div className="ap-empty">No users match.</div>
                )}
                {!loading && filtered.length > 0 && (
                    <table className="ap-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Phone</th>
                                <th>Role</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(u => (
                                <tr key={u.id}>
                                    <td style={{ color: 'var(--text-muted)' }}>#{u.id}</td>
                                    <td style={{ fontWeight: 600 }}>{u.fullname}</td>
                                    <td>{u.email}</td>
                                    <td>{u.phone}</td>
                                    <td>
                                        <span className={roleChipClass(u.rolename)}>
                                            {u.rolename || `Role #${u.role}`}
                                        </span>
                                    </td>
                                    <td>
                                        <span className={"ap-status " + (u.status === 1 ? "ap-status-Completed" : "ap-status-Pending")}>
                                            {u.status === 1 ? "Active" : "Inactive"}
                                        </span>
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

export default UserManager;
