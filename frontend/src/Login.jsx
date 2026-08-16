import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from './auth/AuthContext';
import { useLanguage } from './i18n/LanguageContext';

const ROLE_REDIRECT = {
  WORKER: '/worker/dashboard',
  DOCTOR: '/doctor/dashboard',
  ADMIN: '/admin/dashboard',
};

function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { t } = useLanguage();

  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!phoneNumber.trim()) {
      setError(t('validation.phoneRequired'));
      return;
    }

    if (!password.trim()) {
      setError(t('validation.passwordRequired'));
      return;
    }

    const digits = phoneNumber.replace(/\D/g, '');
    if (digits.length < 10 || digits.length > 15) {
      setError(t('validation.phoneInvalid'));
      return;
    }

    setIsLoading(true);

    try {
      const user = await login(digits, password);
      const redirect = ROLE_REDIRECT[user.role] || '/';
      navigate(redirect, { replace: true });
    } catch (err) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1>{t('auth.loginTitle')}</h1>
          <p>{t('auth.loginSubtitle')}</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {error && <div className="auth-error">{error}</div>}

          <div className="form-group">
            <label htmlFor="phoneNumber" className="form-label">{t('auth.phoneNumber')}</label>
            <input
              id="phoneNumber"
              type="tel"
              placeholder={t('auth.phonePlaceholder')}
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="form-input"
              disabled={isLoading}
              maxLength="15"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password" className="form-label">{t('auth.password')}</label>
            <div className="password-input-wrapper">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder={t('auth.passwordPlaceholder')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="form-input"
                disabled={isLoading}
              />
              <button
                type="button"
                className="toggle-password"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
              >
                {showPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="primary-btn auth-btn"
            disabled={isLoading}
          >
            {isLoading ? t('auth.loggingIn') : t('auth.loginBtn')}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            {t('auth.noAccount')}{' '}
            <Link to="/register" className="auth-link">
              {t('auth.registerLink')}
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}

export default Login;
