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
          className: 'custom-toast',
          success: {
            className: 'custom-toast custom-toast--rgb',
          },
          error: {
            className: 'custom-toast custom-toast--error',
          },
        }}
      />
    </>
  );
}

export default App;
