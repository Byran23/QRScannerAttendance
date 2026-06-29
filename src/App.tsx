import { useState, useEffect } from 'react';
import { LayoutDashboard, Users, ScanLine, ClipboardList, Menu, X, Sun, Moon, Wifi, WifiOff } from 'lucide-react';
import Dashboard from './components/Dashboard';
import AttendeeList from './components/AttendeeList';
import AddEditAttendee from './components/AddEditAttendee';
import QRScanner from './components/QRScanner';
import QRCodeView from './components/QRCodeView';
import AttendanceLog from './components/AttendanceLog';
import RegistrationForm from './components/RegistrationForm';
import { Page, Attendee } from './types';
import { useTheme } from './ThemeContext';
import { useData } from './DataContext';

const NAV_ITEMS = [
  { id: 'dashboard' as Page, label: 'Dashboard', icon: LayoutDashboard },
  { id: 'attendees' as Page, label: 'Attendees', icon: Users },
  { id: 'scanner' as Page, label: 'Scanner', icon: ScanLine },
  { id: 'log' as Page, label: 'Log', icon: ClipboardList },
];

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [pageData, setPageData] = useState<Attendee | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const { theme, toggleTheme, isDark } = useTheme();
  const { loading, synced } = useData();

  void theme;

  // Detect #register in URL — once in register mode, lock them in
  useEffect(() => {
    const checkHash = () => {
      if (window.location.hash === '#register') {
        setIsRegisterMode(true);
      }
    };
    checkHash();
    window.addEventListener('hashchange', checkHash);
    return () => window.removeEventListener('hashchange', checkHash);
  }, []);

  // If register mode, block any hash changes back to admin
  useEffect(() => {
    if (!isRegisterMode) return;
    const lockHash = () => {
      if (window.location.hash !== '#register') {
        window.location.hash = '#register';
      }
    };
    window.addEventListener('hashchange', lockHash);
    return () => window.removeEventListener('hashchange', lockHash);
  }, [isRegisterMode]);

  const navigate = (page: Page, data?: Attendee | null) => {
    setCurrentPage(page);
    setPageData(data ?? null);
    setMobileMenuOpen(false);
    setRefreshKey(k => k + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // If #register mode, show only the registration form — no way to admin
  if (isRegisterMode) {
    return <RegistrationForm />;
  }

  const renderPage = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-32">
          <div className="text-center">
            <div className="w-10 h-10 border-4 border-blue-200 dark:border-blue-800 border-t-blue-600 dark:border-t-blue-400 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-500 dark:text-slate-400 font-medium">Loading data…</p>
          </div>
        </div>
      );
    }

    switch (currentPage) {
      case 'dashboard':
        return <Dashboard key={refreshKey} onNavigate={navigate} />;
      case 'attendees':
        return <AttendeeList key={refreshKey} onNavigate={navigate} />;
      case 'add-attendee':
        return <AddEditAttendee key={refreshKey} onNavigate={navigate} />;
      case 'edit-attendee':
        return <AddEditAttendee key={refreshKey} onNavigate={navigate} editData={pageData} />;
      case 'scanner':
        return <QRScanner key={refreshKey} />;
      case 'qr-view':
        return pageData ? (
          <QRCodeView key={refreshKey} attendee={pageData} onNavigate={navigate} />
        ) : (
          <AttendeeList key={refreshKey} onNavigate={navigate} />
        );
      case 'log':
        return <AttendanceLog key={refreshKey} />;
      default:
        return <Dashboard key={refreshKey} onNavigate={navigate} />;
    }
  };


  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 transition-colors duration-300">
      {/* Top Bar */}
      <header className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 sticky top-0 z-50 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-colors text-gray-700 dark:text-gray-300"
            >
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-orange-500 rounded-xl flex items-center justify-center">
                <ScanLine size={20} className="text-white" />
              </div>
              <div>
                <h1 className="font-bold text-gray-800 dark:text-white text-lg leading-tight">AttendEase</h1>
                <p className="text-[10px] text-gray-400 dark:text-slate-500 leading-tight hidden sm:block">QR Attendance System</p>
              </div>
            </div>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-1">
            {NAV_ITEMS.map(item => {
              const Icon = item.icon;
              const isActive = currentPage === item.id ||
                (item.id === 'attendees' && ['add-attendee', 'edit-attendee', 'qr-view'].includes(currentPage));
              return (
                <button
                  key={item.id}
                  onClick={() => navigate(item.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-400'
                      : 'text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-800 dark:hover:text-white'
                  }`}
                >
                  <Icon size={18} />
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            {/* Sync Status */}
            <div
              className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-medium ${
                synced
                  ? 'bg-green-50 dark:bg-green-950/50 text-green-700 dark:text-green-400'
                  : 'bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400'
              }`}
              title={synced ? 'Synced via Google Sheets' : 'Local only — configure Google Sheets to enable sync'}
            >
              {synced ? <Wifi size={12} /> : <WifiOff size={12} />}
              {synced ? 'Synced' : 'Local'}
            </div>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2.5 rounded-xl bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-600 dark:text-yellow-400 transition-all duration-300"
              title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </button>

          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-lg animate-fade-in">
            <nav className="p-3 space-y-1">
              {NAV_ITEMS.map(item => {
                const Icon = item.icon;
                const isActive = currentPage === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => navigate(item.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-400'
                        : 'text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Icon size={20} />
                    {item.label}
                  </button>
                );
              })}
            </nav>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-6 pb-24 lg:pb-6">
        {renderPage()}
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-800 z-50 safe-area-bottom transition-colors duration-300">
        <div className="flex justify-around items-center py-2">
          {NAV_ITEMS.map(item => {
            const Icon = item.icon;
            const isActive = currentPage === item.id ||
              (item.id === 'attendees' && ['add-attendee', 'edit-attendee', 'qr-view'].includes(currentPage));
            return (
              <button
                key={item.id}
                onClick={() => navigate(item.id)}
                className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all ${
                  isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-slate-600'
                }`}
              >
                <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                <span className={`text-[10px] font-medium ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-slate-600'}`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
