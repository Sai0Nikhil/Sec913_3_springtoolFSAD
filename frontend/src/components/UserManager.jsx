import React, { useEffect, useMemo, useState } from 'react';
import { apibaseurl, callApi } from '../lib';
import './AdminPages.css';
import PageHeader from './PageHeader';
import { downloadCsv, downloadPdfTable } from '../exports.js';

const UserManager = ({ token }) => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [filter, setFilter] = useState("");

    // Pagination
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

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

    // Reset to first page whenever the filter/page-size changes
    useEffect(() => { setPage(1); }, [filter, pageSize]);

    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * pageSize;
    const end = Math.min(start + pageSize, total);
    const pageRows = filtered.slice(start, end);

    function exportUsersPdf() {
        downloadPdfTable({
            title: "Users",
            subtitle: (filter ? "Filtered by \"" + filter + "\"  •  " : "") + filtered.length + " row(s)",
            columns: [
                { header: "ID",     dataKey: "id" },
                { header: "Name",   dataKey: "fullname" },
                { header: "Email",  dataKey: "email" },
                { header: "Phone",  dataKey: "phone" },
                { header: "Role",   dataKey: "rolename" },
                { header: "Status", dataKey: "_status" }
            ],
            rows: filtered.map(u => ({ ...u, _status: u.status === 1 ? "Active" : "Inactive" })),
            filename: "users"
        });
    }

    function roleChipClass(name) {
        const n = (name || "").toLowerCase();
        if (n === "admin")   return "ap-role-chip ap-role-admin";
        if (n === "manager") return "ap-role-chip ap-role-manager";
        if (n === "user")    return "ap-role-chip ap-role-user";
        return "ap-role-chip";
    }

    // Build a compact page-number strip: first, ellipsis, neighbors, ellipsis, last
    function pagesList() {
        const arr = [];
        const add = (v) => arr.push(v);
        if (totalPages <= 7) {
            for (let i = 1; i <= totalPages; i++) add(i);
        } else {
            add(1);
            if (safePage > 3) add("…");
            const lo = Math.max(2, safePage - 1);
            const hi = Math.min(totalPages - 1, safePage + 1);
            for (let i = lo; i <= hi; i++) add(i);
            if (safePage < totalPages - 2) add("…");
            add(totalPages);
        }
        return arr;
    }

    return (
        <>
        <PageHeader
            crumbs={["Admin", "User Manager"]}
            title="Users"
            subtitle="All registered users with their role mapping. Search, page through, and inspect."
        />
        <div className="ap">
            <div className="ap-section">
                <div className="ap-section-head">
                    <h3 className="ap-title">Users</h3>
                    <div className="ap-export-actions">
                        <button className="ap-export-btn ap-export-csv"
                            onClick={() => downloadCsv("/reports/users.csv", "users.csv", token)}
                            title="Download CSV"
                        >⤓ CSV</button>
                        <button className="ap-export-btn ap-export-pdf"
                            onClick={() => exportUsersPdf()}
                            title="Download PDF"
                        >⤓ PDF</button>
                    </div>
                </div>

                <div className="ap-toolbar">
                    <input
                        type="text"
                        className="ap-search"
                        placeholder="Search by name, email or role…"
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                    />
                    <div className="ap-page-size">
                        <label>Rows per page</label>
                        <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}>
                            <option value={5}>5</option>
                            <option value={10}>10</option>
                            <option value={20}>20</option>
                            <option value={50}>50</option>
                        </select>
                    </div>
                </div>

                {loading && <div className="ap-empty">Loading…</div>}
                {!loading && total === 0 && (
                    <div className="ap-empty">{filter ? "No users match." : "No users yet."}</div>
                )}
                {!loading && total > 0 && (
                    <>
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
                                {pageRows.map(u => (
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

                        <div className="ap-pagination">
                            <div className="ap-pagination-info">
                                Showing <strong>{start + 1}</strong>–<strong>{end}</strong> of <strong>{total}</strong>
                            </div>
                            <div className="ap-pagination-controls">
                                <button className="ap-ghost"
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={safePage <= 1}
                                >‹ Prev</button>
                                {pagesList().map((p, i) =>
                                    p === "…"
                                        ? <span key={"e" + i} className="ap-page-ellipsis">…</span>
                                        : <button
                                              key={p}
                                              className={"ap-page-btn " + (p === safePage ? "is-active" : "")}
                                              onClick={() => setPage(p)}
                                          >{p}</button>
                                )}
                                <button className="ap-ghost"
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    disabled={safePage >= totalPages}
                                >Next ›</button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
        </>
    );
};

export default UserManager;
