import React, { useEffect, useState } from 'react';
import { apibaseurl, callApi } from '../lib';
import './RolesAdmin.css';
import PageHeader from './PageHeader';

const RolesAdmin = ({ token }) => {
    const [roles, setRoles] = useState([]);
    const [menus, setMenus] = useState([]);

    const [newRole, setNewRole] = useState("");
    const [newMenu, setNewMenu] = useState("");

    const [selectedRole, setSelectedRole] = useState("");
    const [selectedMenuIds, setSelectedMenuIds] = useState([]);

    // "Show Mappings" panel
    const [showMappings, setShowMappings] = useState(false);
    const [allMappings, setAllMappings] = useState([]);
    const [loadingMappings, setLoadingMappings] = useState(false);

    // "Delete Mappings" panel (separate from Show Mappings)
    const [deleteList, setDeleteList] = useState([]);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [deleteFilter, setDeleteFilter] = useState(""); // role id filter, "" = all

    useEffect(() => {
        loadRoles();
        loadMenus();
        loadDeleteList();
    }, []);

    function loadRoles() {
        callApi("GET", apibaseurl + "/roles", null, null, (res) => {
            if (Array.isArray(res)) setRoles(res);
        }, token);
    }

    function loadMenus() {
        callApi("GET", apibaseurl + "/menus", null, null, (res) => {
            if (Array.isArray(res)) setMenus(res);
        }, token);
    }

    function loadMappingsForRole(roleId) {
        if (!roleId) {
            setSelectedMenuIds([]);
            return;
        }
        callApi("GET", apibaseurl + "/mapping/" + roleId, null, null, (res) => {
            if (Array.isArray(res)) {
                setSelectedMenuIds(res.map((m) => Number(m.mid)));
            } else {
                setSelectedMenuIds([]);
            }
        }, token);
    }

    function addRole() {
        if (newRole.trim() === "") {
            alert("Please enter a role name");
            return;
        }
        callApi("POST", apibaseurl + "/roles", { rolename: newRole.trim() }, null, (res) => {
            if (res.code === 200) {
                setNewRole("");
                loadRoles();
            } else {
                alert(res.message || "Failed to add role");
            }
        }, token);
    }

    function addMenu() {
        if (newMenu.trim() === "") {
            alert("Please enter a menu name");
            return;
        }
        callApi("POST", apibaseurl + "/menus", { menu: newMenu.trim(), icon: "menu.png" }, null, (res) => {
            if (res.code === 200) {
                setNewMenu("");
                loadMenus();
            } else {
                alert(res.message || "Failed to add menu");
            }
        }, token);
    }

    function handleRoleSelect(e) {
        const v = e.target.value;
        setSelectedRole(v);
        loadMappingsForRole(v);
    }

    function toggleMenu(mid) {
        setSelectedMenuIds((prev) =>
            prev.includes(mid) ? prev.filter((x) => x !== mid) : [...prev, mid]
        );
    }

    function loadAllMappings() {
        setLoadingMappings(true);
        callApi("GET", apibaseurl + "/mapping/list-all", null, null, (res) => {
            setLoadingMappings(false);
            if (Array.isArray(res)) {
                setAllMappings(res);
            } else {
                console.warn("Unexpected /mapping/list-all response:", res);
                setAllMappings([]);
            }
        }, token);
    }

    function toggleShowMappings() {
        const next = !showMappings;
        setShowMappings(next);
        if (next) loadAllMappings();
    }

    function loadDeleteList() {
        setDeleteLoading(true);
        callApi("GET", apibaseurl + "/mapping/list-all", null, null, (res) => {
            setDeleteLoading(false);
            if (Array.isArray(res)) setDeleteList(res);
            else setDeleteList([]);
        }, token);
    }

    function deleteOneMapping(roleId, mid, roleLabel, menuLabel) {
        if (!confirm(`Remove mapping  ${roleLabel}  →  ${menuLabel} ?`)) return;
        callApi("DELETE", apibaseurl + "/mapping/" + roleId + "/" + mid, null, null, (res) => {
            if (res && res.code === 200) {
                loadDeleteList();
                if (showMappings) loadAllMappings(); // keep "Show Mappings" in sync
            } else {
                alert((res && res.message) || "Failed to delete mapping");
            }
        }, token);
    }

    function saveMapping() {
        if (!selectedRole) {
            alert("Please select a role");
            return;
        }
        const payload = selectedMenuIds.map((mid) => ({
            role: Number(selectedRole),
            mid: Number(mid)
        }));

        if (payload.length === 0) {
            if (!confirm("No menus selected. This will not change current mapping. Continue?")) return;
        }

        callApi("POST", apibaseurl + "/mapping", payload, null, (res) => {
            if (res && res.code === 200) {
                alert("Mappings saved successfully");
                if (showMappings) loadAllMappings();
                loadDeleteList();
            } else if (typeof res === "string") {
                alert(res);
            } else {
                alert((res && res.message) || "Failed to save mapping");
            }
        }, token);
    }

    return (
        <>
        <PageHeader
            crumbs={["Admin", "Role Manager"]}
            title="Role Manager"
            subtitle="Add roles, add menus, map menus to roles. Scroll down to delete individual mappings."
        />
        <div className="roles-admin">
            {/* --- Roles section --- */}
            <div className="ra-section">
                <div className="ra-row">
                    <label className="ra-title">Roles</label>
                    <input
                        type="text"
                        value={newRole}
                        placeholder="Enter role name"
                        onChange={(e) => setNewRole(e.target.value)}
                    />
                    <button onClick={addRole}>Add Role</button>
                </div>
            </div>

            {/* --- Menu section --- */}
            <div className="ra-section">
                <div className="ra-row">
                    <label className="ra-title">Menu</label>
                    <input
                        type="text"
                        value={newMenu}
                        placeholder="Enter menu name"
                        onChange={(e) => setNewMenu(e.target.value)}
                    />
                    <button onClick={addMenu}>Add</button>
                </div>
            </div>

            {/* --- Map Menu with Roles section --- */}
            <div className="ra-section">
                <div className="ra-map">
                    <div className="ra-map-left">
                        <label className="ra-title">Map Menu with Roles</label>
                        <select value={selectedRole} onChange={handleRoleSelect}>
                            <option value="">Select Role</option>
                            {roles.map((r) => (
                                <option key={r.role} value={r.role}>{r.rolename}</option>
                            ))}
                        </select>

                        <button
                            type="button"
                            className={"ra-show-mappings " + (showMappings ? "open" : "")}
                            onClick={toggleShowMappings}
                        >
                            <span>Show Mappings</span>
                            <span className="ra-caret">{showMappings ? "▴" : "▾"}</span>
                        </button>

                        {showMappings && (
                            <div className="ra-mappings-list">
                                {loadingMappings && <div className="ra-mappings-empty">Loading…</div>}
                                {!loadingMappings && allMappings.length === 0 && (
                                    <div className="ra-mappings-empty">No mappings yet.</div>
                                )}
                                {!loadingMappings && allMappings.map((m, i) => {
                                    const roleLabel = m.roleName ? m.roleName : `(missing role #${m.roleId})`;
                                    const menuLabel = m.menu ? m.menu : `(missing menu #${m.mid})`;
                                    const isOrphan = !m.roleName || !m.menu;
                                    return (
                                        <div
                                            className={"ra-mapping-row " + (isOrphan ? "orphan" : "")}
                                            key={`${m.roleId}-${m.mid}-${i}`}
                                        >
                                            <span className="ra-mapping-role">{roleLabel}</span>
                                            <span className="ra-mapping-arrow">→</span>
                                            <span className="ra-mapping-menu">{menuLabel}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                    <div className="ra-map-right">
                        <div className="ra-checkbox-area">
                            {menus.length === 0 && <div className="ra-empty">No menus available — add one above.</div>}
                            {menus.map((m) => (
                                <label className="ra-check" key={m.mid}>
                                    <input
                                        type="checkbox"
                                        checked={selectedMenuIds.includes(Number(m.mid))}
                                        onChange={() => toggleMenu(Number(m.mid))}
                                    />
                                    {m.menu}
                                </label>
                            ))}
                        </div>
                        <button className="ra-save" onClick={saveMapping}>Add</button>
                    </div>
                </div>
            </div>

            {/* --- Delete Mappings (scroll down for this) --- */}
            <div className="ra-section ra-delete-section">
                <label className="ra-title">Delete Mappings</label>

                <div className="ra-delete-toolbar">
                    <div className="ra-delete-filter">
                        <label className="ra-delete-filter-label">Filter by role</label>
                        <select
                            value={deleteFilter}
                            onChange={(e) => setDeleteFilter(e.target.value)}
                        >
                            <option value="">All roles</option>
                            {roles.map(r => (
                                <option key={r.role} value={r.role}>{r.rolename}</option>
                            ))}
                        </select>
                    </div>
                    <button
                        type="button"
                        className="ra-delete-refresh"
                        onClick={loadDeleteList}
                        title="Refresh"
                    >↻ Refresh</button>
                </div>

                <div className="ra-delete-list">
                    {deleteLoading && <div className="ra-mappings-empty">Loading…</div>}
                    {!deleteLoading && (() => {
                        const filtered = deleteFilter === ""
                            ? deleteList
                            : deleteList.filter(m => Number(m.roleId) === Number(deleteFilter));
                        if (filtered.length === 0) {
                            return <div className="ra-mappings-empty">No mappings to delete.</div>;
                        }
                        return filtered.map((m, i) => {
                            const roleLabel = m.roleName ? m.roleName : `(missing role #${m.roleId})`;
                            const menuLabel = m.menu     ? m.menu     : `(missing menu #${m.mid})`;
                            const isOrphan = !m.roleName || !m.menu;
                            return (
                                <div
                                    className={"ra-delete-row " + (isOrphan ? "orphan" : "")}
                                    key={`${m.roleId}-${m.mid}-${i}`}
                                >
                                    <div className="ra-delete-info">
                                        <span className="ra-delete-role">{roleLabel}</span>
                                        <span className="ra-mapping-arrow">→</span>
                                        <span className="ra-delete-menu">{menuLabel}</span>
                                    </div>
                                    <button
                                        type="button"
                                        className="ra-delete-btn"
                                        onClick={() => deleteOneMapping(m.roleId, m.mid, roleLabel, menuLabel)}
                                        title="Delete mapping"
                                    >× Delete</button>
                                </div>
                            );
                        });
                    })()}
                </div>
            </div>
        </div>
        </>
    );
};

export default RolesAdmin;
