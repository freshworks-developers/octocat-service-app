Use Cases - DevBridge Engineering / Octocat GitHub Issues
=========================================================

Company Overview
----------------

**DevBridge Engineering** runs product support on **Freshdesk** and **Freshservice** while engineering tracks bugs in **GitHub**. Agents and IT staff need to escalate tickets to GitHub issues without copying fields manually or leaving the ticket sidebar.

* * * * *

Use Case Scenarios
------------------

### 1\. Escalate a Support Ticket to GitHub

**Scenario**: A customer reports a reproducible bug. The agent has triaged in Freshdesk but engineering works exclusively from GitHub Issues.

**Use Case**: The sidebar pre-fills **Issue title** and **Description** from ticket subject and body via `client.data.get('ticket')`. The agent edits the text, then invokes `createGithubIssue` through a Request Template with OAuth-injected credentials. The linked issue number persists in `client.db` for the ticket.

* * * * *

### 2\. Live Ticket Property Sync in the Sidebar

**Scenario**: Agents change status or priority while discussing an open GitHub issue. The sidebar summary must stay current without a manual refresh.

**Use Case**: `GitHubSidebar` listens to Freshdesk **Events API** handlers (`ticket.propertiesUpdated`, priority/type/group changes). `patchTicketFromEvent` merges incoming payload fields so status and priority labels update in real time as agents work the ticket.

* * * * *

### 3\. OAuth to GitHub Without Exposing Tokens

**Scenario**: The organization requires repo-scoped access for issue creation but forbids PATs in frontend code or agent-visible storage.

**Use Case**: Admins register a GitHub OAuth App and enter Client ID/Secret through `oauth_iparams`. Freshworks stores tokens server-side; Request Templates inject the access token when calling `POST /repos/{owner}/{repo}/issues`. Agents authorize once at install.

* * * * *

### 4\. View and Open the Linked Issue

**Scenario**: A tier-2 agent picks up a ticket that already has an engineering issue attached and needs the GitHub URL immediately.

**Use Case**: After creation, issue metadata is stored under the ticket ID in **key-value storage**. On load, `getLinkedIssue` and `fetchGithubIssue` retrieve local and remote state. **Open issue on GitHub** opens the canonical issue page in a new tab.

* * * * *

### 5\. One Sidebar on Freshdesk and Freshservice

**Scenario**: DevBridge uses Freshdesk for external support and Freshservice for internal IT. Both teams want the same GitHub escalation workflow.

**Use Case**: The manifest registers `ticket_sidebar` on **support_ticket** and **service_ticket** with one React Meta entry (`index.html`). Shared `github.js` helpers build issue bodies from ticket snapshots on either product.
