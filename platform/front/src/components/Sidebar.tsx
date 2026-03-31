import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Settings, Menu, X, ChevronRight, ChevronLeft, LucideIcon, ChevronUp, Lock, KeyRound, Mail } from 'lucide-react';

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
  authUser: {
    id?: number;
    username: string;
    name: string;
    role_name: string;
    corp_name: string;
    email?: string;
    expired_at?: string;
  } | null;
  onLogout: () => void;
  onOpenSettings: (type: 'password' | 'reset' | 'email') => void;
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
  onLogout,
  onOpenSettings
}) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 点击外部关闭下拉框
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

            {/* User Info Section with Dropdown */}
            <div className={`p-4 border-t border-white/5 relative`}>
              <div className={`flex items-center gap-3 px-2 py-2 ${isSidebarCollapsed ? 'justify-center' : ''}`}>
                {!isSidebarCollapsed && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex-1 overflow-hidden cursor-pointer"
                    onClick={() => setShowDropdown(!showDropdown)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 overflow-hidden">
                        <p className="text-sm font-medium text-white truncate">{authUser?.username || 'Admin'}</p>
                        <p className="text-xs truncate opacity-50">{authUser?.role_name || '账号'}</p>
                        <p className="text-xs truncate opacity-40">{authUser?.corp_name || ''}</p>
                        {authUser?.expired_at && (
                          <p className="text-xs truncate opacity-40">
                            有效期: {new Date(authUser.expired_at).toLocaleDateString('zh-CN')}
                          </p>
                        )}
                      </div>
                      <ChevronUp className={`w-4 h-4 text-white/50 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Dropdown Menu */}
              <AnimatePresence>
                {showDropdown && !isSidebarCollapsed && (
                  <motion.div
                    ref={dropdownRef}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute left-0 right-0 bottom-full mb-2 mx-4 bg-zinc-800 rounded-xl border border-zinc-700 shadow-xl overflow-hidden"
                  >
                    <div className="p-1">
                      <button
                        onClick={() => {
                          setShowDropdown(false);
                          onOpenSettings('password');
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-700 hover:text-white rounded-lg transition-colors"
                      >
                        <Lock className="w-4 h-4" />
                        修改密码
                      </button>
                      <button
                        onClick={() => {
                          setShowDropdown(false);
                          onOpenSettings('reset');
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-700 hover:text-white rounded-lg transition-colors"
                      >
                        <KeyRound className="w-4 h-4" />
                        密码重置
                      </button>
                      <button
                        onClick={() => {
                          setShowDropdown(false);
                          onOpenSettings('email');
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-700 hover:text-white rounded-lg transition-colors"
                      >
                        <Mail className="w-4 h-4" />
                        修改邮箱
                      </button>
                      <div className="border-t border-zinc-700 mt-1 pt-1">
                        <button
                          onClick={() => {
                            setShowDropdown(false);
                            onLogout();
                          }}
                          className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-400 hover:bg-zinc-700 hover:text-red-300 rounded-lg transition-colors"
                        >
                          <X className="w-4 h-4" />
                          退出登录
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Collapsed state - logout button */}
              {isSidebarCollapsed && (
                <button
                  onClick={onLogout}
                  className="w-full flex justify-center mt-2 p-2 hover:bg-white/10 rounded-lg transition-colors"
                  title="退出登录"
                >
                  <X className="w-4 h-4 text-white/50 hover:text-white" />
                </button>
              )}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
};

export default Sidebar;