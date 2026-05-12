package mth.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import mth.models.Rolesmapping;
import mth.models.RolesmappingId;

@Repository
public interface RolesmappingRepository extends JpaRepository<Rolesmapping, RolesmappingId> {

    List<Rolesmapping> findByRole(Long role);

    @Modifying
    @Transactional
    void deleteByRole(Long role);

    /** Delete one specific (role, mid) row. */
    @Modifying
    @Transactional
    long deleteByRoleAndMid(Long role, Long mid);

    /**
     * Returns every row in rolesmapping along with the matching role name and menu name.
     * Uses a native query (PostgreSQL) so we don't rely on JPQL ad-hoc joins between
     * unrelated entities. LEFT JOIN keeps orphan rows visible — null role/menu names
     * are labelled "(missing)" by the UI.
     * Each row is an Object[] of: { roleId, roleName, menuId, menuName }.
     */
    @Query(value =
        "SELECT rm.role AS role_id, r.rolename AS role_name, rm.mid AS menu_id, m.menu AS menu_name " +
        "FROM rolesmapping rm " +
        "LEFT JOIN roles r ON r.role = rm.role " +
        "LEFT JOIN menus m ON m.mid  = rm.mid " +
        "ORDER BY rm.role ASC, rm.mid ASC",
        nativeQuery = true)
    List<Object[]> findAllMappingsWithNames();
}
