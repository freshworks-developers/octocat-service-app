import { describe, expect, test } from 'vitest';
import {
  buildIssueBody,
  buildIssueLabels,
  buildIssuePayload,
  labelPriority,
  labelSource,
  labelStatus,
  mergeTicketSnapshot,
  patchTicketFromEvent,
  readAssignee,
  readDescription,
  readRequester,
  stripHtml,
  ticketDbKey,
  truncateText
} from '../app/utils/github.js';

describe('github utils', () => {
  const ticket = {
    id: 42,
    subject: 'Login fails on mobile',
    description: '<p>User cannot sign in on iOS.</p>',
    description_text: 'User cannot sign in on iOS.',
    status: 2,
    priority: 4,
    type: 'Incident',
    source: 3,
    tags: ['mobile', 'auth'],
    created_at: '2024-06-01T10:00:00Z',
    updated_at: '2024-06-02T11:00:00Z',
    requester: { name: 'Jane', email: 'jane@example.com' },
    responder: { name: 'Alex', email: 'alex@example.com' }
  };

  const contact = { name: 'Jane', email: 'jane@example.com' };

  test('labelStatus maps Freshdesk codes', () => {
    expect(labelStatus(2)).toBe('Open');
    expect(labelStatus(5)).toBe('Closed');
  });

  test('labelPriority maps Freshdesk codes', () => {
    expect(labelPriority(4)).toBe('Urgent');
  });

  test('labelSource maps channel codes', () => {
    expect(labelSource(3)).toBe('Phone');
  });

  test('stripHtml removes markup', () => {
    expect(stripHtml('<b>Hello</b> world')).toBe('Hello world');
  });

  test('truncateText shortens long strings', () => {
    expect(truncateText('abcdefghij', 5)).toBe('abcd…');
  });

  test('ticketDbKey respects max length', () => {
    expect(ticketDbKey(12345)).toBe('12345');
  });

  test('readRequester and readAssignee format names', () => {
    expect(readRequester(ticket, contact)).toBe('Jane (jane@example.com)');
    expect(readAssignee(ticket)).toBe('Alex (alex@example.com)');
  });

  test('readDescription prefers plain text', () => {
    expect(readDescription(ticket)).toBe('User cannot sign in on iOS.');
  });

  test('buildIssueLabels includes status, priority, and tags', () => {
    const labels = buildIssueLabels(ticket);
    expect(labels).toContain('status-open');
    expect(labels).toContain('priority-urgent');
    expect(labels).toContain('mobile');
  });

  test('buildIssueBody includes ticket metadata', () => {
    const body = buildIssueBody({ ticket, contact });
    expect(body).toContain('Ticket #42');
    expect(body).toContain('**Assignee:** Alex (alex@example.com)');
    expect(body).toContain('mobile, auth');
  });

  test('buildIssuePayload maps GitHub issue fields', () => {
    const payload = buildIssuePayload({
      ticket,
      contact,
      iparams: { github_assignee: 'dev-bot' }
    });
    expect(payload.title).toBe('Login fails on mobile');
    expect(payload.assignees).toEqual(['dev-bot']);
    expect(payload.labels.length).toBeGreaterThan(0);
    expect(payload.body).toContain('User cannot sign in on iOS.');
  });

  test('buildIssuePayload uses custom title and description', () => {
    const payload = buildIssuePayload({
      ticket,
      contact,
      title: 'Custom title',
      body: 'Custom body text'
    });
    expect(payload.title).toBe('Custom title');
    expect(payload.body).toBe('Custom body text');
  });

  test('patchTicketFromEvent updates status from change event', () => {
    const updated = patchTicketFromEvent(ticket, {
      type: 'ticket.statusChanged',
      helper: {
        getData: () => ({ newValue: 3 })
      }
    });
    expect(updated.status).toBe(3);
    expect(labelStatus(updated.status)).toBe('Pending');
  });

  test('mergeTicketSnapshot prefers event status over stale snapshot', () => {
    const merged = mergeTicketSnapshot(
      { ...ticket, status: 3 },
      { ...ticket, status: 2 },
      {
        type: 'ticket.statusChanged',
        helper: {
          getData: () => ({ newValue: 3 })
        }
      }
    );
    expect(merged.status).toBe(3);
  });
});
