import { useLayoutEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import WidgetView from './pages/WidgetView';
import MainView from './pages/MainView';

function App() {
  const location = useLocation();

  useLayoutEffect(() => {
    console.log('[App] Current route:', location.pathname);
    const isWidgetRoute = location.pathname === '/widget';
    document.documentElement.classList.toggle('widget-route', isWidgetRoute);
    document.body.classList.toggle('widget-route', isWidgetRoute);

    return () => {
      document.documentElement.classList.remove('widget-route');
      document.body.classList.remove('widget-route');
    };
  }, [location]);

  return (
    <Routes>
      <Route path="/widget" element={<WidgetView />} />
      <Route path="/" element={<MainView />} />
    </Routes>
  );
}

export default App;
