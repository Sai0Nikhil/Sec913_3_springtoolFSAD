package mth.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import mth.models.Users;

@Repository
public interface UsersRepository extends JpaRepository<Users, Long> {
	
	/**
	 * @deprecated Plaintext password comparison. Kept only for backwards
	 *             compatibility; do not call. Sign-in now loads the user via
	 *             {@link #findByEmail(String)} and verifies the password with
	 *             {@code BCryptPasswordEncoder.matches(...)}.
	 */
	@Deprecated
	@Query("select U.role from Users U where U.email=:username and U.password=:password")
	public Object validateCredentials(@Param("username") String username, @Param("password") String password);
	
	@Query("select U.id from Users U where U.email=:email")
	public Object checkByEmail(@Param("email") String email);
	
	@Query("select U from Users U where U.email=:email")
	public Object findByEmail(@Param("email") String email);
	
	@Query("select M from Menus M join Rolesmapping R on M.mid=R.mid where R.role=:role")
	public List<Object> getMenus(@Param("role") Long role);

	/**
	 * Admin view: list every user with their role name attached.
	 * Native query because Users.role is int and Roles.role is bigint —
	 * JPQL ad-hoc joins between mismatched types are flaky across versions.
	 * Returns Object[]: { id, fullname, email, phone, role, rolename, status }
	 */
	@Query(value =
		"SELECT u.id, u.fullname, u.email, u.phone, u.role, r.rolename, u.status, " +
		"       COALESCE(u.can_assign_tasks, 0) AS can_assign_tasks " +
		"FROM users u LEFT JOIN roles r ON r.role = u.role " +
		"ORDER BY u.id ASC",
		nativeQuery = true)
	public List<Object[]> listAllWithRole();
}
