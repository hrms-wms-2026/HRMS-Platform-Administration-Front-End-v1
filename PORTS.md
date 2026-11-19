# ONEXSO Local Dev — Port Assignments

Canonical copy lives in `HRMS-Backend-v1/PORTS.md` — keep this in sync with it.

| App                | URL                                      | Repo                                                   |
|--------------------|-------------------------------------------|---------------------------------------------------------|
| Backend API        | `https://onexso.com:7229`                 | `HRMS-Backend-v1`                                        |
| Tenant App         | `https://{tenant}.onexso.com:4200`        | `Hrms--Web-application---front-end---v1`                 |
| Platform Admin     | `https://admin.onexso.com:4300`           | `HRMS-Platform-Administration-Front-End-v1` (this repo)  |

This app (`platform-administration`) always runs on **4300**. Don't run it or the tenant app on
each other's port — only one dev server can bind a given port at a time, and the "wrong app
answers on this port" failure mode doesn't look like an obvious port conflict: it can surface as
a certificate mismatch error, or as the wrong app's UI simply loading on that hostname.
