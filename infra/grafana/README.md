# Grafana Dashboards

Auto-provisioned dashboards untuk monitoring Sipera production.

## Dashboards (per service)

- `identity.json` — login rate, OTP send/validate, JWT issuance, failure breakdown
- `master.json` — query throughput, cache hit ratio
- `permohonan.json` — submissions/day, approval rate, state transitions
- `spatial.json` — intersect query duration, cache hit, GeoServer health
- `gateway.json` — req/s per route, upstream health, feature-flag state
- `system.json` — CPU, memory, disk, network per container

## Import

Mount this folder to Grafana's provisioning path:

```yaml
volumes:
  - ./infra/grafana:/etc/grafana/provisioning/dashboards
```
