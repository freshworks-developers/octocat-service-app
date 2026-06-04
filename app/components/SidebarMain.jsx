import React, { useLayoutEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { defineCustomElements } from '@freshworks/crayons/loader';
import '@freshworks/crayons/css/crayons-min.css';
import GitHubSidebar from './GitHubSidebar';

defineCustomElements();

const SidebarMain = () => {
  const [child, setChild] = useState(
    <p className="gh-loading">Loading GitHub Issues…</p>
  );

  useLayoutEffect(() => {
    window.app.initialized().then((client) => {
      window.client = client;
      const resize = () =>
        client.instance.resize({ height: '560px', width: '300px' }).catch(() => {});
      resize();
      client.events.on('app.activated', resize);
      setChild(<GitHubSidebar client={client} />);
    });
  }, []);

  return <div className="gh-root">{child}</div>;
};

const root = createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <SidebarMain />
  </React.StrictMode>
);
