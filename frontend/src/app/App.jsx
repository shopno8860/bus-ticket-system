import AppRoutes from '../routes/AppRoutes';
import '../index.css';
import { Toaster } from 'react-hot-toast';
import PageTitle from '../components/PageTitle';

function App() {
  return (
    <>
      <PageTitle />
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
