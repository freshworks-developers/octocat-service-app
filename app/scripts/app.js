document.onreadystatechange = function () {
  if (document.readyState === 'interactive') renderApp();
};

async function renderApp() {
  try {
    const _client = await app.initialized();
    window.client = _client;
    client.events.on('app.activated', renderSidebar);
  } catch (error) {
    console.error(error);
    await showNotification('danger', 'Unable to load the app');
  }
}

async function createIssue() {
  const {
    ticket: { id: ticketID, subject, description }
  } = await client.data.get('ticket');

  try {
    const dbKey = String(ticketID).substring(0, 30);
    const dbResponse = await client.db.get(dbKey);
    await showNotification(
      'warning',
      `A GitHub issue is already created for ticket ${dbResponse.ticketID}`
    );
  } catch (error) {
    if (!error.status || !error.message) {
      console.error('Unexpected error loading ticket mapping', error);
      return;
    }

    const body = JSON.stringify({ title: subject, body: description });
    const result = await client.request.invokeTemplate('createGithubIssue', { body });
    const responseJSON = JSON.parse(result.response);
    const { id: issueID, number: issueNumber } = responseJSON;
    const data = { ticketID, issueID, issueNumber };

    await Promise.all([
      client.db.set(String(issueID).substring(0, 30), { ...data }),
      client.db.set(String(ticketID).substring(0, 30), { ...data })
    ]);
    await showNotification('success', 'GitHub issue created successfully');
  }
}

function renderSidebar() {
  const pick = document.querySelector.bind(document);
  pick('.create-issue').addEventListener('fwClick', createIssue);
  pick('.issue-details').addEventListener('fwClick', async function showDetails() {
    try {
      await client.interface.trigger('showModal', {
        title: 'GitHub issue details',
        template: './views/modal.html'
      });
    } catch (modalError) {
      console.error('Unable to open issue modal', modalError);
    }
  });
}

async function showNotification(status, message) {
  await client.interface.trigger('showNotify', {
    type: status,
    message
  });
}
