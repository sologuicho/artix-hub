import { Outlet } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import FloatingActionButton from '../components/FloatingActionButton';

const Layout = () => {
  return (
    <div className="min-h-screen transition-colors duration-300 flex flex-col">
      <Header />
      <main className="flex-grow relative">
        <Outlet />
        <FloatingActionButton />
      </main>
      <Footer />
    </div>
  );
};

export default Layout;

