import React, { useState, useEffect } from 'react';
import { Lock, User, AlertCircle, Loader2, Building2, X } from 'lucide-react';

interface LoginPageProps {
  onLoginSuccess: (token: string, user: {
    id: number;
    username: string;
    name: string;
    email: string;
    role_name: string;
    corp_name: string;
    expired_at?: string;
  }) => void;
}

interface UserInfo {
  id: number;
  corp_id: number;
  corp_name: string;
  username: string;
  name: string;
  role_type: string;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [lockedInfo, setLockedInfo] = useState<{ locked: boolean; remainingMinutes?: number }>({ locked: false });

  // 公司信息
  const [corpInfo, setCorpInfo] = useState<UserInfo | null>(null);
  const [checkingUser, setCheckingUser] = useState(false);

  // 错误弹框
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null);

  // Check lock status on mount
  useEffect(() => {
    checkLockStatus();
  }, []);

  // 用户名变化时查询公司信息
  useEffect(() => {
    const timer = setTimeout(() => {
      if (username.trim()) {
        checkUser(username.trim());
      } else {
        setCorpInfo(null);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [username]);

  const checkLockStatus = async () => {
    try {
      const res = await fetch('/api/platform/auth/status');
      const data = await res.json();
      if (data.locked) {
        setLockedInfo({ locked: true, remainingMinutes: data.remainingMinutes });
      }
    } catch (e) {
      // Ignore
    }
  };

  // 查询用户/公司信息
  const checkUser = async (name: string) => {
    setCheckingUser(true);
    try {
      const res = await fetch('/api/platform/check-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: name })
      });

      const data = await res.json();

      if (data.success && data.user) {
        setCorpInfo(data.user);
      } else {
        setCorpInfo(null);
      }
    } catch (e) {
      setCorpInfo(null);
    } finally {
      setCheckingUser(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (lockedInfo.locked) return;
    if (!username.trim()) {
      setErrorMessage('请输入账号');
      setRemainingAttempts(null);
      setShowErrorModal(true);
      return;
    }
    if (!password.trim()) {
      setErrorMessage('请输入密码');
      setRemainingAttempts(null);
      setShowErrorModal(true);
      return;
    }

    // 检查公司是否存在
    if (!corpInfo) {
      setErrorMessage('公司不存在');
      setRemainingAttempts(null);
      setShowErrorModal(true);
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/platform/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          password,
          corp_id: corpInfo?.corp_id
        })
      });

      const data = await res.json();

      if (data.success) {
        localStorage.setItem('auth_token', data.token);
        localStorage.setItem('auth_user', JSON.stringify(data.user));
        onLoginSuccess(data.token, data.user);
      } else {
        setErrorMessage(data.error || '登录失败');
        setRemainingAttempts(data.remaining_attempts ?? null);
        setShowErrorModal(true);

        if (data.locked) {
          setLockedInfo({ locked: true, remainingMinutes: data.remainingMinutes });
        }
      }
    } catch (e) {
      setErrorMessage('网络错误，请稍后重试');
      setRemainingAttempts(null);
      setShowErrorModal(true);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setUsername('');
    setPassword('');
    setCorpInfo(null);
  };

  const closeErrorModal = () => {
    setShowErrorModal(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo / Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl shadow-lg shadow-blue-500/30 mb-4">
            <Lock className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">ERP 系统</h1>
          <p className="text-slate-400 mt-2">裕合森精密机械</p>
        </div>

        {/* Login Form */}
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/20">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Locked Info */}
            {lockedInfo.locked && (
              <div className="flex items-center gap-3 p-4 bg-orange-500/20 border border-orange-500/30 rounded-xl text-orange-300">
                <Lock className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm">
                  账户已锁定，请等待 {lockedInfo.remainingMinutes} 分钟后再试
                </span>
              </div>
            )}

            {/* Company Info - 动态显示 */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-300">公司</label>
              <div className="relative">
                <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <div className="w-full pl-12 pr-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-slate-300 min-h-[48px]">
                  {corpInfo?.corp_name || '\u00A0'}
                </div>
              </div>
            </div>

            {/* Username */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-300">账号</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={loading || lockedInfo.locked}
                  className="w-full pl-12 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-50"
                  placeholder="请输入账号"
                  required
                />
                {checkingUser && (
                  <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-400 animate-spin" />
                )}
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-300">密码</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading || lockedInfo.locked}
                  className="w-full pl-12 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-50"
                  placeholder="请输入密码"
                  required
                />
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-4 pt-2">
              <button
                type="button"
                onClick={handleReset}
                disabled={loading}
                className="flex-1 py-3 px-4 bg-white/10 hover:bg-white/20 text-white rounded-xl font-medium transition-all disabled:opacity-50"
              >
                重置
              </button>
              <button
                type="submit"
                disabled={loading || lockedInfo.locked}
                className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    登录中...
                  </>
                ) : (
                  '登录'
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-slate-500 text-sm mt-6">
          © 2026 裕合森精密机械 · ERP管理系统
        </p>
      </div>

      {/* Error Modal */}
      {showErrorModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-slate-700">
            {/* Modal Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-red-400" />
                </div>
                <h3 className="text-lg font-semibold text-white">提示</h3>
              </div>
              <button
                onClick={closeErrorModal}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Error Message */}
            <div className="mb-6">
              <p className="text-slate-300">{errorMessage}</p>
              {remainingAttempts !== null && remainingAttempts > 0 && (
                <p className="text-slate-400 text-sm mt-2">
                  剩余 {remainingAttempts} 次尝试机会
                </p>
              )}
            </div>

            {/* Close Button */}
            <button
              onClick={closeErrorModal}
              className="w-full py-2.5 px-4 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-medium transition-all"
            >
              确定
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginPage;