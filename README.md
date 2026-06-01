# Octocat service app

Freshservice ticket-sidebar app that creates a **GitHub issue** from the current ticket and stores the link in key-value storage. Agents escalate IT work to engineering without leaving Freshservice.

## Real-world use case

When a service desk ticket needs a code fix, agents often copy details into GitHub manually. This sample automates that handoff: one click creates an issue in your repo (via account OAuth), prevents duplicates per ticket, and lets agents view issue details in a modal.

## Features

- GitHub OAuth (account-level) for secure API access
- Create issue from ticket subject and description
- Key-value mapping between Freshservice ticket and GitHub issue
- Crayons UI in the ticket sidebar

## Prerequisites

- Freshservice dev account and [FDK 10.x](https://developers.freshworks.com/docs/app-sdk/v3.0/) on **Node.js 24.x**
- GitHub OAuth app credentials configured in `config/oauth_config.json`
- Target repository (`owner/repo`) entered at installation

## Installation parameters

| Parameter | Description |
|-----------|-------------|
| `github_repo` | Repository in `owner/name` form (e.g. `freshworks-developers/octocat-service-app`) |

During install, connect the GitHub OAuth account authorized for that repository.

## Setup and testing

1. Update `config/oauth_config.json` with your GitHub OAuth client ID and secret.
2. Run `fdk validate` and `fdk run` from this folder.
3. Configure iparams at `http://localhost:10001/custom_configs`.
4. Open a Freshservice ticket, load the sidebar (`?dev=true` locally), create an issue, then open **View issue details**.

## Project structure

- `manifest.json` — Platform 3.0 `service_ticket` sidebar + OAuth request templates
- `app/` — Sidebar and modal UI
- `config/requests.json` — GitHub REST templates
- `config/oauth_config.json` — GitHub OAuth integration

## License

See repository defaults.
