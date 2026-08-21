# ONEXSO Local Dev — Port Assignments

Canonical copy lives in `HRMS-Backend-v1/PORTS.md` — keep this in sync with it.

| App                | URL                                    | Repo                                      |
|--------------------|-----------------------------------------|--------------------------------------------|
| Backend API        | `https://localhost:7229`                | `HRMS-Backend-v1`                           |
| Tenant App         | `https://{tenant}.localhost:4200`       | `front end-org/Hrms--Web-application---front-end---v1` |
| Platform Admin     | `https://admin.localhost:4300`          | `platform-administration` (this repo)       |

This app (`platform-administration`) always runs on **4300**. Don't run it or the tenant app on
each other's port — only one dev server can bind a given port at a time, and the "wrong app
answers on this port" failure mode shows up as a browser certificate error
(`NET::ERR_CERT_COMMON_NAME_INVALID`), not an obvious "port in use" message.
