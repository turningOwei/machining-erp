import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Settings, Menu, X, ChevronRight, ChevronLeft, LucideIcon } from 'lucide-react';

interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
}

interface SidebarProps {
  navItems: NavItem[];
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  isSidebarCollapsed: boolean;
  setIsSidebarCollapsed: (collapsed: boolean) => void;
  authUser: { username: string } | null;
  onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  navItems,
  activeTab,
  setActiveTab,
  isSidebarOpen,
  setIsSidebarOpen,
  isSidebarCollapsed,
  setIsSidebarCollapsed,
  authUser,
  onLogout
}) => {
  return (
    <>
      {/* Mobile Header */}
      <header className="md:hidden flex items-center justify-between p-4 bg-white border-bottom border-zinc-200 sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-zinc-900 rounded-lg flex items-center justify-center">
            <Settings className="w-5 h-5 text-white" />
          </div>
          <h1 className="font-bold text-lg tracking-tight">机加ERP</h1>
        </div>
        <button onClick={() => setIsSidebarOpen(true)}>
          <Menu className="w-6 h-6" />
        </button>
      </header>

      {/* Sidebar */}
      <AnimatePresence>
        {(isSidebarOpen || (typeof window !== 'undefined' && window.innerWidth >= 768)) && (
          <motion.aside
            initial={{ x: -300 }}
            animate={{
              x: 0,
              width: isSidebarCollapsed ? 72 : 224
            }}
            exit={{ x: -300 }}
            transition={{ type: 'tween', duration: 0.15 }}
            className={`fixed inset-y-0 left-0 bg-zinc-900 text-zinc-400 z-50 md:relative md:flex flex-col transition-all duration-150 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
          >
            <div className={`p-4 flex items-center justify-between border-b border-white/5`}>
              <div className="flex items-center gap-3 text-white overflow-hidden">
                <div className="shrink-0 w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                  <Settings className="w-6 h-6" />
                </div>
                {!isSidebarCollapsed && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="font-bold text-xl tracking-tight whitespace-nowrap"
                  >
                    机加ERP
                  </motion.span>
                )}
              </div>
              <button className="md:hidden" onClick={() => setIsSidebarOpen(false)}>
                <X className="w-6 h-6" />
              </button>

              {/* Collapse Toggle (Desktop) */}
              <button
                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                className="hidden md:flex absolute -right-3 top-12 w-6 h-6 bg-zinc-800 border border-zinc-700 rounded-full items-center justify-center text-white hover:bg-zinc-700 transition-colors z-50"
              >
                {isSidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
              </button>
            </div>

            <nav className="flex-1 px-2 py-4 space-y-1 overflow-x-hidden">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setIsSidebarOpen(false);
                  }}
                  title={isSidebarCollapsed ? item.label : ''}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 ${isSidebarCollapsed ? 'justify-center' : ''} ${activeTab === item.id ? 'bg-white text-zinc-900 font-medium' : 'hover:bg-white/5 hover:text-white'}`}
                >
                  <item.icon className="shrink-0 w-5 h-5" />
                  {!isSidebarCollapsed && (
                    <motion.span
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="whitespace-nowrap"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </button>
              ))}
            </nav>

            <div className={`p-4 border-t border-white/5`}>
              <div className={`flex items-center gap-3 px-2 py-2 ${isSidebarCollapsed ? 'justify-center' : ''}`}>
                <div className="shrink-0 w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold text-white">
                  {authUser?.username?.charAt(0).toUpperCase() || 'A'}
                </div>
                {!isSidebarCollapsed && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex-1 overflow-hidden"
                  >
                    <p className="text-sm font-medium text-white truncate">{authUser?.username || 'Admin'}</p>
                    <p className="text-xs truncate opacity-50">管理员</p>
                  </motion.div>
                )}
                {!isSidebarCollapsed && (
                  <button
                    onClick={onLogout}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    title="退出登录"
                  >
                    <X className="w-4 h-4 text-white/50 hover:text-white" />
                  </button>
                )}
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
};

export default Sidebar;
