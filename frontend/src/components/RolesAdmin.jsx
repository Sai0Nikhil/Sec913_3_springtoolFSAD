import React, { useEffect, useState } from 'react';
import { apibaseurl, callApi } from '../lib';
import './RolesAdmin.css';

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

    useEffect(() => {
        loadRoles();
        loadMenus();
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
            } else if (typeof res === "string") {
                alert(res);
            } else {
                alert((res && res.message) || "Failed to save mapping");
            }
        }, token);
    }

    return (
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
        </div>
    );
};

export default RolesAdmin;
