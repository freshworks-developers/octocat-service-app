document.onreadystatechange = async function () {
  if (document.readyState !== 'interactive') {
    return;
  }

  const pick = document.querySelector.bind(document);
  const body = pick('.app-body');

  try {
    const client = await app.initialized();
    const {
      ticket: { id: ticketID }
    } = await client.data.get('ticket');
    const { issueNumber } = await client.db.get(String(ticketID).substring(0, 30));
    const result = await client.request.invokeTemplate('getGithubIssue', {
      context: { issueNumber }
    });
    const { url, number, title, body: desc } = JSON.parse(result.response);

    body.insertAdjacentHTML(
      'afterbegin',
      `<h2>${title}</h2>
      <fw-label color="blue" value="Issue Number: ${number}"></fw-label>
      <br>
      <code>URL: ${url}</code>
      <h3>Description</h3>
      <p>${desc}</p>`
    );
  } catch {
    body.insertAdjacentHTML(
      'afterbegin',
      '<p>No GitHub issue is linked to this ticket yet.</p>'
    );
  }
};
