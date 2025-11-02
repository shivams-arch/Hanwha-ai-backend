# Operations Checklist (Production)

## Monitoring
- [ ] Aggregate application logs (Winston -> stdout)
- [ ] Track API latency, error rates, socket disconnects
- [ ] Set up uptime monitoring on `/health`

## Alerting
- [ ] Alert on 5xx spikes / rate-limit abuse / auth failures
- [ ] Notify on Redis/DB connection errors (via container logs or APM)

## Metrics To Track
- HTTP 2xx/4xx/5xx counts
- Average response time & Socket.io connect/disconnect counts
- Redis cache hit rate for calculations & dashboard
- AI message volume (chat endpoints + n8n responses)

## Weekly Tasks
- [ ] Rotate JWT/n8n secrets if required
- [ ] Review Redis memory usage / prune old keys
- [ ] Check database vacuum & analyze performance
- [ ] Verify backup jobs succeed (PostgreSQL dump + Redis AOF)

## Incident Response
1. Collect logs (`docker logs` or platform equivalent)
2. Use `/health` endpoint to check API status
3. Check Redis (`redis-cli ping`) and Postgres (`pg_isready`)
4. Review n8n workflow executions/logs
5. If needed, re-deploy latest Docker image (`docker pull && docker run`)

## Post-Deployment Verification
- [ ] `/health` returns 200 with environment & version
- [ ] Auth → `POST /auth/login` + `/users/profile`
- [ ] `/dashboard/overview` returns payload
- [ ] `/chat/message` round trip works (requires n8n)
- [ ] Socket client receives `dashboard:update` event when a transaction is added

## Playbooks
- **Redis Flush**: `redis-cli FLUSHALL` (only if caches corrupted)
- **DB Migration Rollback**: `ts-node src/scripts/migrate.ts --revert`
- **AI Webhook Failure**: Check `PHASE6_COMPLETE.md` for context, ensure `N8N_API_KEY` matches
