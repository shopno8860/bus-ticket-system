import AppRoutes from '../routes/AppRoutes';
import '../index.css';
import { Toaster } from 'react-hot-toast';

function App() {
  return (
    <>
      <AppRoutes />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3500,
          style: {
            background: 'linear-gradient(90deg, #0f2027, #203a43, #2c5364)',
            color: '#ffffff',
            borderRadius: '12px',
            boxShadow: '0 6px 18px rgba(0,0,0,0.28)',
            border: '1px solid rgba(255,255,255,0.1)',
          },
        }}
      />
    </>
  );
}

export default App;
