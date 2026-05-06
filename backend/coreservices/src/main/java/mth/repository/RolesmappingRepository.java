package mth.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
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
}
