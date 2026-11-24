import ReactDOM from 'react-dom/client';

import { App } from '@/app/components/App';
import '@/app/utils/setupMonacoEnvironment';
import { hydrateMetadataStore } from '@/metadata-store/storage/metadataStoreStorage';
import '@fontsource/dm-mono/400.css';
import '@fontsource/dm-mono/500.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import 'crm-ui/style.css';
import 'crm-ui/theme-light.css';
import 'crm-ui/theme-dark.css';
import './index.css';

const renderApp = () => {
  const root = ReactDOM.createRoot(
    document.getElementById('root') ?? document.body,
  );

  root.render(<App />);
};

void hydrateMetadataStore().then(renderApp, renderApp);
