package mth.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import mth.models.Tasks;

@Repository
public interface TasksRepository extends JpaRepository<Tasks, Long> {

    /**
     * Tasks visible to a specific user — assigned directly to them by user id,
     * OR assigned to their role.
     */
    @Query("select T from Tasks T " +
           "where (T.assigneeType = 'USER' and T.assigneeId = :userId) " +
           "   or (T.assigneeType = 'ROLE' and T.assigneeId = :role) " +
           "order by " +
           "  case when T.status = 'Completed' then 1 else 0 end asc, " +
           "  T.id desc")
    List<Tasks> findVisibleTo(@Param("userId") Long userId, @Param("role") Long role);

    @Query("select T from Tasks T order by " +
           "  case when T.status = 'Completed' then 1 else 0 end asc, " +
           "  T.id desc")
    List<Tasks> findAllOrdered();
}
