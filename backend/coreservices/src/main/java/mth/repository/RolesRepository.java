package mth.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import mth.models.Roles;

@Repository
public interface RolesRepository extends JpaRepository<Roles, Long> {

	@Query("select coalesce(max(R.role), 0) from Roles R")
	public Long getMaxRoleId();
}
