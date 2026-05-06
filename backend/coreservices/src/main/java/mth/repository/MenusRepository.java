package mth.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import mth.models.Menus;

@Repository
public interface MenusRepository extends JpaRepository<Menus, Long> {

	@Query("select coalesce(max(M.mid), 0) from Menus M")
	public Long getMaxMenuId();
}
