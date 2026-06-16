# Freshdesk to GitHub Issues

Create GitHub issues from Freshdesk or Freshservice ticket sidebars using OAuth and the Request method. Built with **React Meta** and **Crayons**.

![Freshdesk to GitHub Issues — create GitHub issues from the ticket sidebar](app/styles/images/github-banner.png)

## Description

DevBridge Engineering escalates reproducible bugs from Freshdesk and Freshservice tickets directly into GitHub Issues. See [`usecase.md`](usecase.md) for the full DevBridge operational scenarios.

### Core Functionality

1. **Ticket sidebar** — create GitHub issues without leaving Freshdesk or Freshservice
2. **Live ticket sync** — status and priority update when you change ticket properties
3. **Editable issue form** — set title and description before creating the issue
4. **OAuth to GitHub** — secure access via GitHub OAuth App
5. **Linked issue view** — open the created issue on GitHub from the sidebar

## Features

- **Ticket sidebar** — create GitHub issues without leaving Freshdesk or Freshservice
- **Live ticket sync** — status and priority update when you change ticket properties
- **Editable issue form** — set title and description before creating the issue
- **OAuth to GitHub** — secure access via GitHub OAuth App
- **Linked issue view** — open the created issue on GitHub from the sidebar

## User Interfaces

| Surface | Placement | Behavior |
| --- | --- | --- |
| `app/index.html` | `support_ticket.ticket_sidebar` | Create and view linked GitHub issues on Freshdesk |
| `app/index.html` | `service_ticket.ticket_sidebar` | Same workflow on Freshservice tickets |

## Platform 3.0 Features Used

### 1. OAuth 2.0 — GitHub Integration

`config/oauth_config.json` registers GitHub OAuth with `repo` scope. Client ID and secret are collected via `oauth_iparams` during installation.

### 2. Request Methods — Create and Fetch Issues

| Template | Purpose |
| --- | --- |
| `createGithubIssue` | POST new issue to configured `owner/repo` |
| `getGithubIssue` | GET issue details by number |

### 3. Data & Events APIs — Live Ticket Context

`client.data.get('ticket')` and contact context seed the issue form. **Events API** listeners keep status and priority in sync when ticket properties change.

### 4. Key-Value Storage — Linked Issue Persistence

`client.db` stores the GitHub issue number and URL keyed by Freshdesk ticket ID so agents can reopen the sidebar and continue from the linked issue.

### 5. Crayons UI Components

The app uses Freshworks Crayons v4 design system:

| Component | Usage |
| --- | --- |
| `FwButton` | Create issue and open on GitHub |
| `FwInput` / `FwTextarea` | Editable issue title and description |
| `FwLabel` | Ticket field labels |
| `FwInlineMessage` | Success and error feedback |

## Project Structure

```
octocat-service-app/
├── app/
│   ├── index.html              # React Meta entry
│   ├── components/             # SidebarMain, GitHubSidebar
│   ├── utils/github.js         # Issue payload, events, client.db helpers
│   └── styles/
├── config/
│   ├── iparams.json            # github_repo, github_assignee
│   ├── oauth_config.json       # GitHub OAuth + oauth_iparams
│   └── requests.json           # createGithubIssue, getGithubIssue
├── tests/
│   └── github.test.js
├── manifest.json
├── usecase.md
└── README.md
```

## Prerequisites

- [Freshworks CLI (FDK)](https://developers.freshworks.com/docs/app-sdk/v3.0/support_ticket/basic-dev-tools/freshworks-cli/) v10.1.2 or later
- Node.js v24.x
- A Freshdesk or Freshservice trial account
- A GitHub account with permission to create issues in the target repository

Enable global apps before local development:

```bash
fdk config set global_apps.enabled true
```

---

## Configure GitHub

### Step 1 — Create a GitHub OAuth App

1. Sign in to GitHub and open **Settings → Developer settings → OAuth Apps → New OAuth App**.
2. Fill in the form:

| Field | Local development | Production (marketplace) |
| --- | --- | --- |
| **Application name** | e.g. `Freshdesk GitHub Issues (dev)` | e.g. `Freshdesk GitHub Issues` |
| **Homepage URL** | `http://localhost:10001` | Your app or company URL |
| **Authorization callback URL** | `http://localhost:10001/auth/callback` | `https://oauth.freshdev.io/auth/callback` |

3. Click **Register application**.
4. Copy the **Client ID**.
5. Click **Generate a new client secret** and copy the **Client secret** (shown once).

**Scopes:** The app requests **`repo`** so it can create issues in your target repository. The authorizing GitHub user must have write access to that repo.

**Tip:** For local dev, only `http://localhost:10001/auth/callback` is required. Add the Freshworks production callback before you publish to the marketplace.

### Step 2 — Prepare the target repository

1. Choose the repo where issues should be created (format: `owner/repo`, e.g. `my-org/product-backlog`).
2. Confirm the GitHub account you will authorize can **create issues** in that repo.
3. Optional: note a GitHub **username** to assign new issues to (installation iparam `github_assignee`).

### Step 3 — Run the app locally

```bash
npm install
fdk run
```

Keep this terminal running. Only one app can use port `10001` at a time.

### Step 4 — Complete installation settings

Open [http://localhost:10001/custom_configs](http://localhost:10001/custom_configs):

1. **GitHub OAuth Client ID** — paste from Step 1.
2. **GitHub OAuth Client Secret** — paste from Step 1.
3. Click **Authorize** and approve access on GitHub.
4. **GitHub repository** — enter `owner/repo` for the target repo.
5. **Default GitHub assignee** (optional) — GitHub username for new issues.

Save the installation page after all fields are set.

### Step 5 — Test in Freshdesk or Freshservice

1. With **`fdk run`** still running, open a ticket with **`?dev=true`**:
   - **Freshdesk:** `https://<your-domain>.freshdesk.com/a/tickets/<id>?dev=true`
   - **Freshservice:** `https://<your-domain>.freshservice.com/a/tickets/<id>?dev=true`
2. In the ticket **right sidebar**, open the **Apps** panel and select this app.
3. Review the ticket summary (status and priority stay in sync with the ticket).
4. Edit **Issue title** and **Description**, then click **Create GitHub issue**.
5. Use **Open issue on GitHub** to view the linked issue.

If the iframe is blank, allow **insecure localhost** in your browser (see Freshworks dev docs → Test your app).

---

## OAuth redirect URIs (Freshworks)

| Environment | Redirect URI |
| --- | --- |
| Local | `http://localhost:10001/auth/callback` |
| Production | `https://oauth.freshdev.io/auth/callback` |

---

## Troubleshooting

### App not visible

- **`fdk run` must be running** in this app folder (not another app on port `10001`).
- URL must include **`?dev=true`** (or `&dev=true`).
- Open the **Apps** section in the ticket sidebar.
- Restart **`fdk run`** after changing `manifest.json`.

### OAuth / `Failed to obtain access token`

- Client ID or secret is wrong — re-enter on `custom_configs` and authorize again.
- Callback URL in GitHub must match **`http://localhost:10001/auth/callback`** exactly for local dev.
- OAuth app owner must have access to the **github_repo** you configured.
- Stale local OAuth — stop `fdk run`, delete `.fdk/localstore`, run again, and re-authorize.

### Issue creation fails

- Confirm OAuth is authorized and **github_repo** is valid (`owner/repo`).
- Authorizing user needs **issue write** permission on the repo.
- Check browser console and `log/fdk.log` for API errors from GitHub.

---

## Testing

```bash
fdk validate
npm run fdk-unit-test
```

Reset local OAuth and installation parameters when re-testing:

```bash
rm .fdk/store.sqlite
fdk run
```

---

## Key Learnings

1. **OAuth tokens stay server-side** — Request Templates inject GitHub access tokens; React never handles secrets.
2. **Persist links in client.db** — store issue number per ticket so tier-2 agents see existing escalations on open.
3. **Events keep UI fresh** — subscribe to ticket property events so sidebar status matches the ticket without reload.
4. **Cross-product manifest** — one React Meta bundle on `support_ticket` and `service_ticket` covers Freshdesk and Freshservice.

---

## Resources

- [OAuth for third-party services](https://developers.freshworks.com/docs/app-sdk/v3.0/common/advanced-interfaces/oauth/)
- [Request methods](https://developers.freshworks.com/docs/app-sdk/v3.0/support_ticket/advanced-interfaces/request-method/)
- [Events method](https://developers.freshworks.com/docs/app-sdk/v3.0/support_ticket/front-end-apps/events-method/)
- [Key-value storage (client.db)](https://developers.freshworks.com/docs/app-sdk/v3.0/support_ticket/front-end-apps/client-db/)
- [React Meta apps](https://developers.freshworks.com/docs/app-sdk/v3.0/support_ticket/front-end-apps/react-meta/)
