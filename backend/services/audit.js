// Audit trail — every scoring/rating/admin modification is recorded with actor,
// before/after state and an optional reason (spec §32).

/**
 * @param {import('pg').PoolClient|{query:Function}} db
 * @param {{actorId?:number|null, entity:string, entityId:string|number, action:string, before?:any, after?:any, reason?:string|null}} entry
 */
export async function audit(db, { actorId = null, entity, entityId, action, before = null, after = null, reason = null }) {
  await db.query(
    `INSERT INTO audit_log (actor_id, entity, entity_id, action, before, after, reason)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [actorId, entity, String(entityId), action, before === null ? null : JSON.stringify(before), after === null ? null : JSON.stringify(after), reason]
  );
}

export async function listAudit(db, { entity, entityId, limit = 50, offset = 0 } = {}) {
  const params = [];
  const where = [];
  if (entity) {
    params.push(entity);
    where.push(`entity = $${params.length}`);
  }
  if (entityId) {
    params.push(String(entityId));
    where.push(`entity_id = $${params.length}`);
  }
  params.push(Math.min(Number(limit) || 50, 200), Number(offset) || 0);
  const { rows } = await db.query(
    `SELECT a.*, u.name AS actor_name FROM audit_log a
     LEFT JOIN users u ON u.id = a.actor_id
     ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
     ORDER BY a.created_at DESC, a.id DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );
  return rows;
}
