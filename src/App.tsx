import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { ThemeProvider } from './components/ThemeProvider';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { Clubs } from './pages/Clubs';
import { Founder } from './pages/Founder';

function App() {
  return (
    <ThemeProvider>
      <AppProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="clubs" element={<Clubs />} />
              <Route path="founder" element={<Founder />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AppProvider>
    </ThemeProvider>
  );
}

export default App
