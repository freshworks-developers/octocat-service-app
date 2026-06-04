import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FwButton,
  FwInlineMessage,
  FwInput,
  FwLabel,
  FwTextarea
} from '@freshworks/crayons/react';
import {
  buildIssuePayload,
  createGithubIssue,
  fetchGithubIssue,
  fetchTicketSnapshot,
  getLinkedIssue,
  labelPriority,
  labelStatus,
  loadTicketContext,
  mergeTicketSnapshot,
  patchTicketFromEvent,
  readDescription,
  saveLinkedIssue,
  stripHtml,
  TICKET_SYNC_EVENTS,
  truncateText
} from '../utils/github';

function AppLogo() {
  return (
    <img
      className="gh-app-logo"
      src="styles/images/logo.png"
      alt="Freshdesk to GitHub Issues"
      width="28"
      height="28"
    />
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="gh-detail-row">
      <span className="gh-detail-label">{label}</span>
      <span className="gh-detail-value">{value || 'N/A'}</span>
    </div>
  );
}

function GitHubSidebar({ client }) {
  const [ticket, setTicket] = useState(null);
  const [contact, setContact] = useState(null);
  const [iparams, setIparams] = useState({});
  const [linkedIssue, setLinkedIssue] = useState(null);
  const [remoteIssue, setRemoteIssue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [issueTitle, setIssueTitle] = useState('');
  const [issueDescription, setIssueDescription] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

  const notify = async (type, text) => {
    try {
      await client.interface.trigger('showNotify', { type, message: text });
    } catch {
      /* ignore */
    }
  };

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const ctx = await loadTicketContext(client);
      setTicket(ctx.ticket);
      setContact(ctx.contact);
      setIparams(ctx.iparams);
      setIssueTitle(ctx.ticket.subject || `Ticket #${ctx.ticket.id}`);
      setIssueDescription(readDescription(ctx.ticket));

      const linked = await getLinkedIssue(client, ctx.ticket.id);
      setLinkedIssue(linked);

      if (linked?.issueNumber) {
        try {
          const remote = await fetchGithubIssue(client, linked.issueNumber);
          setRemoteIssue(remote);
        } catch (err) {
          console.error('[GitHub Issues] Fetch remote issue error:', err);
          setRemoteIssue(null);
        }
      } else {
        setRemoteIssue(null);
      }
    } catch (err) {
      console.error('[GitHub Issues] Load error:', err);
      setMessage('Unable to load ticket data.');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  }, [client]);

  const syncTicket = useCallback(
    async (event) => {
      try {
        if (event) {
          setTicket((prev) => (prev ? patchTicketFromEvent(prev, event) : prev));
        }

        const { ticket: incoming, contact: incomingContact } =
          await fetchTicketSnapshot(client);

        setTicket((prev) => mergeTicketSnapshot(prev, incoming, event));
        setContact(incomingContact);
      } catch (err) {
        console.error('[GitHub Issues] Sync ticket error:', err);
      }
    },
    [client]
  );

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    TICKET_SYNC_EVENTS.forEach((name) => {
      client.events.on(name, syncTicket);
    });

    return () => {
      if (typeof client.events.off === 'function') {
        TICKET_SYNC_EVENTS.forEach((name) => {
          client.events.off(name, syncTicket);
        });
      }
    };
  }, [client, syncTicket]);

  const issuePayload = useMemo(() => {
    if (!ticket) {
      return null;
    }
    return buildIssuePayload({
      ticket,
      contact,
      iparams,
      title: issueTitle,
      body: issueDescription
    });
  }, [ticket, contact, iparams, issueTitle, issueDescription]);

  const handleCreateIssue = async () => {
    if (!ticket || !issuePayload || !issueTitle.trim()) {
      return;
    }

    if (linkedIssue?.issueNumber) {
      setMessage(`Issue #${linkedIssue.issueNumber} is already linked to this ticket.`);
      setMessageType('warning');
      await notify('warning', 'A GitHub issue is already linked to this ticket.');
      return;
    }

    setCreating(true);
    setMessage('Creating GitHub issue…');
    setMessageType('info');

    try {
      const response = await createGithubIssue(client, issuePayload);
      const data = {
        ticketID: ticket.id,
        issueID: response.id,
        issueNumber: response.number
      };

      await saveLinkedIssue(client, ticket.id, data);
      setLinkedIssue(data);
      setRemoteIssue(response);
      setMessage(`Created issue #${response.number} in ${iparams.github_repo || 'repository'}.`);
      setMessageType('success');
      await notify('success', 'GitHub issue created successfully.');
    } catch (err) {
      console.error('[GitHub Issues] Create error:', err);
      setMessage('Failed to create issue. Check OAuth, repo access, and iparams.');
      setMessageType('error');
      await notify('danger', 'Failed to create GitHub issue.');
    } finally {
      setCreating(false);
    }
  };

  const openGithubIssue = () => {
    const url = remoteIssue?.html_url || remoteIssue?.url;
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  if (loading) {
    return <p className="gh-loading">Loading Freshdesk → GitHub Issues…</p>;
  }

  return (
    <div className="gh-sidebar">
      <header className="gh-header">
        <div className="gh-header-logo">
          <AppLogo />
        </div>
        <div>
          <h1 className="gh-title">GitHub Issues</h1>
          <p className="gh-subtitle">Freshdesk → GitHub</p>
        </div>
      </header>

      {ticket ? (
        <>
          <section className="gh-card">
            <p className="gh-ticket-id">Ticket #{ticket.id}</p>
            <p className="gh-ticket-subject">{ticket.subject || 'No subject'}</p>
            <div className="gh-label-row">
              <FwLabel value={`Status: ${labelStatus(ticket.status)}`} color="blue" />
              <FwLabel
                value={`Priority: ${labelPriority(ticket.priority)}`}
                color="yellow"
              />
            </div>
          </section>

          {!linkedIssue?.issueNumber ? (
            <section className="gh-card gh-section">
              <h2 className="gh-section-title">New GitHub issue</h2>
              <FwInput
                label="Issue title"
                value={issueTitle}
                required
                onFwInput={(e) => setIssueTitle(e.detail.value)}
              />
              <FwTextarea
                label="Description"
                value={issueDescription}
                rows={4}
                onFwInput={(e) => setIssueDescription(e.detail.value)}
              />
            </section>
          ) : null}

          {linkedIssue?.issueNumber ? (
            <section className="gh-card gh-section gh-linked">
              <h2 className="gh-section-title">Linked GitHub issue</h2>
              <DetailRow label="Issue" value={`#${linkedIssue.issueNumber}`} />
              {remoteIssue ? (
                <>
                  <DetailRow label="State" value={remoteIssue.state} />
                  <DetailRow label="Title" value={remoteIssue.title} />
                  {remoteIssue.user?.login ? (
                    <DetailRow label="Author" value={remoteIssue.user.login} />
                  ) : null}
                  {remoteIssue.assignee?.login ? (
                    <DetailRow label="GitHub assignee" value={remoteIssue.assignee.login} />
                  ) : null}
                  <DetailRow
                    label="Labels"
                    value={
                      Array.isArray(remoteIssue.labels) && remoteIssue.labels.length
                        ? remoteIssue.labels.map((l) => l.name).join(', ')
                        : 'None'
                    }
                  />
                  <p className="gh-body-preview">
                    {truncateText(stripHtml(remoteIssue.body), 180)}
                  </p>
                </>
              ) : (
                <p className="gh-muted">Issue linked locally — open on GitHub for full details.</p>
              )}
            </section>
          ) : null}
        </>
      ) : (
        <p className="gh-muted">No ticket data available.</p>
      )}

      <div className="gh-actions">
        <FwButton
          color="primary"
          loading={creating}
          disabled={Boolean(linkedIssue?.issueNumber) || !issueTitle.trim()}
          onFwClick={handleCreateIssue}
        >
          Create GitHub issue
        </FwButton>
        {linkedIssue?.issueNumber ? (
          <FwButton color="link" onFwClick={openGithubIssue}>
            Open issue on GitHub
          </FwButton>
        ) : null}
      </div>

      {message ? (
        <FwInlineMessage type={messageType || 'info'} closable={false}>
          {message}
        </FwInlineMessage>
      ) : null}
    </div>
  );
}

export default GitHubSidebar;
