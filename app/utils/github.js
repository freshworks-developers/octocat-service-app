export const STATUS_MAP = {
  2: 'Open',
  3: 'Pending',
  4: 'Resolved',
  5: 'Closed',
  Open: 'Open',
  Pending: 'Pending',
  Resolved: 'Resolved',
  Closed: 'Closed'
};

export const PRIORITY_MAP = {
  1: 'Low',
  2: 'Medium',
  3: 'High',
  4: 'Urgent',
  Low: 'Low',
  Medium: 'Medium',
  High: 'High',
  Urgent: 'Urgent'
};

export const SOURCE_MAP = {
  1: 'Email',
  2: 'Portal',
  3: 'Phone',
  7: 'Chat',
  9: 'Feedback Widget',
  10: 'Outbound Email'
};

export function labelStatus(value) {
  return STATUS_MAP[value] || String(value || 'N/A');
}

export function labelPriority(value) {
  return PRIORITY_MAP[value] || String(value || 'N/A');
}

export function labelSource(value) {
  return SOURCE_MAP[value] || String(value || 'N/A');
}

export function stripHtml(value) {
  if (!value || typeof value !== 'string') {
    return '';
  }
  return value
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function truncateText(value, max = 160) {
  const text = String(value || '').trim();
  if (text.length <= max) {
    return text;
  }
  return `${text.slice(0, max - 1)}…`;
}

export function ticketDbKey(ticketId) {
  return String(ticketId).substr(0, 30);
}

export function readRequester(ticket, contact) {
  const name = contact?.name || ticket.requester?.name || '';
  const email = contact?.email || ticket.requester?.email || '';
  if (name && email) {
    return `${name} (${email})`;
  }
  return name || email || 'N/A';
}

export function readAssignee(ticket) {
  const name = ticket.responder?.name || ticket.assignee?.name || '';
  const email = ticket.responder?.email || ticket.assignee?.email || '';
  if (name && email) {
    return `${name} (${email})`;
  }
  return name || email || 'Unassigned';
}

export function readDescription(ticket) {
  return (
    stripHtml(ticket.description_text) ||
    stripHtml(ticket.description) ||
    'No description provided.'
  );
}

export function buildIssueLabels(ticket) {
  const labels = [];
  const statusSlug = `status-${labelStatus(ticket.status)}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  const prioritySlug = `priority-${labelPriority(ticket.priority)}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  if (statusSlug) {
    labels.push(statusSlug);
  }
  if (prioritySlug) {
    labels.push(prioritySlug);
  }

  if (Array.isArray(ticket.tags)) {
    ticket.tags
      .filter(Boolean)
      .slice(0, 8)
      .forEach((tag) => {
        const slug = String(tag)
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '');
        if (slug && !labels.includes(slug)) {
          labels.push(slug);
        }
      });
  }

  return labels.slice(0, 10);
}

export function buildIssueBody({ ticket, contact }) {
  const lines = [
    `## Ticket #${ticket.id}`,
    '',
    readDescription(ticket),
    '',
    '---',
    '### Ticket metadata',
    `- **Status:** ${labelStatus(ticket.status)}`,
    `- **Priority:** ${labelPriority(ticket.priority)}`,
    `- **Type:** ${ticket.type || 'N/A'}`,
    `- **Source:** ${labelSource(ticket.source)}`,
    `- **Requester:** ${readRequester(ticket, contact)}`,
    `- **Assignee:** ${readAssignee(ticket)}`
  ];

  if (Array.isArray(ticket.tags) && ticket.tags.length) {
    lines.push(`- **Tags:** ${ticket.tags.join(', ')}`);
  }

  if (ticket.created_at) {
    lines.push(`- **Created:** ${ticket.created_at}`);
  }

  if (ticket.updated_at) {
    lines.push(`- **Updated:** ${ticket.updated_at}`);
  }

  if (ticket.due_by) {
    lines.push(`- **Due by:** ${ticket.due_by}`);
  }

  return lines.join('\n');
}

export function buildIssuePayload({ ticket, contact, iparams = {}, title, body }) {
  const payload = {
    title: String(title ?? '').trim() || ticket.subject || `Ticket #${ticket.id}`,
    body: String(body ?? '').trim() || buildIssueBody({ ticket, contact }),
    labels: buildIssueLabels(ticket)
  };

  const assignee = String(iparams.github_assignee || '').trim();
  if (assignee) {
    payload.assignees = [assignee];
  }

  return payload;
}

export const TICKET_SYNC_EVENTS = [
  'ticket.propertiesLoaded',
  'ticket.propertiesUpdated',
  'ticket.statusChanged',
  'ticket.priorityChanged',
  'ticket.typeChanged',
  'ticket.agentChanged',
  'ticket.groupChanged',
  'ticket.subjectChanged'
];

function readEventValue(data, keys) {
  for (const key of keys) {
    if (data[key] !== undefined && data[key] !== null && data[key] !== '') {
      return data[key];
    }
  }
  return undefined;
}

export function patchTicketFromEvent(ticket, event) {
  if (!ticket || !event?.helper?.getData) {
    return ticket;
  }

  const data = event.helper.getData();
  if (!data || typeof data !== 'object') {
    return ticket;
  }

  const next = { ...ticket };

  switch (event.type) {
    case 'ticket.statusChanged': {
      const value = readEventValue(data, ['newValue', 'new', 'status', 'value']);
      if (value !== undefined) {
        next.status = value;
      }
      break;
    }
    case 'ticket.priorityChanged': {
      const value = readEventValue(data, ['newValue', 'new', 'priority', 'value']);
      if (value !== undefined) {
        next.priority = value;
      }
      break;
    }
    case 'ticket.typeChanged': {
      const value = readEventValue(data, ['newValue', 'new', 'type', 'value']);
      if (value !== undefined) {
        next.type = value;
      }
      break;
    }
    case 'ticket.subjectChanged': {
      const value = readEventValue(data, ['newValue', 'new', 'subject', 'value']);
      if (value !== undefined) {
        next.subject = value;
      }
      break;
    }
    default:
      break;
  }

  return next;
}

export function mergeTicketSnapshot(current, incoming, event) {
  const merged = { ...incoming };
  if (!event) {
    return merged;
  }

  const patched = patchTicketFromEvent(current, event);
  if (event.type === 'ticket.statusChanged' && patched.status !== incoming.status) {
    merged.status = patched.status;
  }
  if (event.type === 'ticket.priorityChanged' && patched.priority !== incoming.priority) {
    merged.priority = patched.priority;
  }
  if (event.type === 'ticket.typeChanged' && patched.type !== incoming.type) {
    merged.type = patched.type;
  }
  if (event.type === 'ticket.subjectChanged' && patched.subject !== incoming.subject) {
    merged.subject = patched.subject;
  }

  return merged;
}

export async function fetchTicketSnapshot(client) {
  const { ticket } = await client.data.get('ticket');
  let contact = null;

  try {
    const data = await client.data.get('contact');
    contact = data.contact;
  } catch {
    contact = null;
  }

  return { ticket, contact };
}

export async function loadTicketContext(client) {
  const { ticket, contact } = await fetchTicketSnapshot(client);

  let iparams = {};
  try {
    iparams = await client.iparams.get();
  } catch {
    iparams = {};
  }

  return { ticket, contact, iparams };
}

export async function getLinkedIssue(client, ticketId) {
  try {
    return await client.db.get(ticketDbKey(ticketId));
  } catch {
    return null;
  }
}

export async function saveLinkedIssue(client, ticketId, issueData) {
  const key = ticketDbKey(ticketId);
  await Promise.all([
    client.db.set(String(issueData.issueID), { ...issueData }),
    client.db.set(key, { ...issueData })
  ]);
}

export async function fetchGithubIssue(client, issueNumber) {
  const result = await client.request.invokeTemplate('getGithubIssue', {
    context: { issueNumber }
  });
  return JSON.parse(result.response);
}

export async function createGithubIssue(client, payload) {
  const result = await client.request.invokeTemplate('createGithubIssue', {
    body: JSON.stringify(payload)
  });
  return JSON.parse(result.response);
}
