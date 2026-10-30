-- 0009: replace nbs_recommendations in one transaction (issue #203).
--
-- pipeline/07_load.py replaced this table with a delete followed by an insert
-- as two separate requests. If the insert failed, the table was left empty, and
-- /api/v1/recommendations answered from the database with count 0 instead of
-- falling back to the snapshot.
--
-- A function body runs in a single transaction, so the delete is undone if the
-- insert fails and the previous rows stay in place. The loader calls it with
-- client.rpc("replace_nbs_recommendations", {"rows": [...]}).
--
-- security invoker, and execute granted to service_role only: this deletes every
-- row, so the anon key the browser holds must not be able to call it. The row
-- level security policies from 0005 already stop anon writes; the revoke makes
-- that true of the function as well.

create or replace function replace_nbs_recommendations(rows jsonb)
returns integer
language plpgsql
security invoker
as $$
declare
    inserted integer;
begin
    delete from nbs_recommendations where true;

    insert into nbs_recommendations
        (ward_id, grid_id, intervention, rationale, citation, priority, cell_count)
    select r.ward_id, r.grid_id, r.intervention, r.rationale, r.citation, r.priority, r.cell_count
    from jsonb_to_recordset(rows) as r(
        ward_id      text,
        grid_id      text,
        intervention text,
        rationale    text,
        citation     text,
        priority     integer,
        cell_count   integer
    );

    get diagnostics inserted = row_count;
    return inserted;
end;
$$;

revoke all on function replace_nbs_recommendations(jsonb) from public, anon, authenticated;
grant execute on function replace_nbs_recommendations(jsonb) to service_role;
