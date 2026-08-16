import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from './auth/AuthContext';
import { useLanguage } from './i18n/LanguageContext';

function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const { t } = useLanguage();

  const [formData, setFormData] = useState({
    name: '',
    phoneNumber: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'WORKER',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
    setServerError('');
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = t('validation.nameRequired');
    }

    if (!formData.phoneNumber.trim()) {
      newErrors.phoneNumber = t('validation.phoneRequired');
    } else {
      const digits = formData.phoneNumber.replace(/\D/g, '');
      if (digits.length < 10 || digits.length > 15) {
        newErrors.phoneNumber = t('validation.phoneInvalid');
      }
    }

    if (formData.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = t('validation.emailInvalid');
    }

    if (!formData.password) {
      newErrors.password = t('validation.passwordRequired');
    } else if (formData.password.length < 8) {
      newErrors.password = t('validation.passwordMin');
    } else if (!/[a-zA-Z]/.test(formData.password)) {
      newErrors.password = t('validation.passwordLetter');
    } else if (!/[0-9]/.test(formData.password)) {
      newErrors.password = t('validation.passwordNumber');
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = t('validation.confirmRequired');
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = t('validation.passwordMismatch');
    }

    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');
    const newErrors = validateForm();

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsLoading(true);

    try {
      await register({
        name: formData.name.trim(),
        phone: formData.phoneNumber.replace(/\D/g, ''),
        email: formData.email.trim(),
        password: formData.password,
        role: formData.role,
      });
      navigate('/login', { replace: true });
    } catch (err) {
      setServerError(err.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1>{t('auth.registerTitle')}</h1>
          <p>{t('auth.registerSubtitle')}</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {serverError && <div className="auth-error">{serverError}</div>}

          <div className="form-group">
            <label htmlFor="name" className="form-label">{t('auth.fullName')}</label>
            <input
              id="name"
              type="text"
              name="name"
              placeholder={t('auth.namePlaceholder')}
              value={formData.name}
              onChange={handleChange}
              className={`form-input ${errors.name ? 'has-error' : ''}`}
              disabled={isLoading}
            />
            {errors.name && <span className="error-message">{errors.name}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="phoneNumber" className="form-label">{t('auth.phoneNumber')}</label>
            <input
              id="phoneNumber"
              type="tel"
              name="phoneNumber"
              placeholder={t('auth.phonePlaceholder')}
              value={formData.phoneNumber}
              onChange={handleChange}
              className={`form-input ${errors.phoneNumber ? 'has-error' : ''}`}
              disabled={isLoading}
              maxLength="15"
            />
            {errors.phoneNumber && <span className="error-message">{errors.phoneNumber}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="email" className="form-label">{t('auth.emailOptional')}</label>
            <input
              id="email"
              type="email"
              name="email"
              placeholder={t('auth.emailPlaceholder')}
              value={formData.email}
              onChange={handleChange}
              className={`form-input ${errors.email ? 'has-error' : ''}`}
              disabled={isLoading}
            />
            {errors.email && <span className="error-message">{errors.email}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="password" className="form-label">{t('auth.password')}</label>
            <div className="password-input-wrapper">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                name="password"
                placeholder={t('auth.passwordHint')}
                value={formData.password}
                onChange={handleChange}
                className={`form-input ${errors.password ? 'has-error' : ''}`}
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
            {errors.password && <span className="error-message">{errors.password}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword" className="form-label">{t('auth.confirmPassword')}</label>
            <div className="password-input-wrapper">
              <input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                name="confirmPassword"
                placeholder={t('auth.confirmPlaceholder')}
                value={formData.confirmPassword}
                onChange={handleChange}
                className={`form-input ${errors.confirmPassword ? 'has-error' : ''}`}
                disabled={isLoading}
              />
              <button
                type="button"
                className="toggle-password"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                aria-label={showConfirmPassword ? t('auth.hidePassword') : t('auth.showPassword')}
              >
                {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
            {errors.confirmPassword && <span className="error-message">{errors.confirmPassword}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="role" className="form-label">{t('auth.role')}</label>
            <select
              id="role"
              name="role"
              value={formData.role}
              onChange={handleChange}
              className="form-input form-select"
              disabled={isLoading}
            >
              <option value="WORKER">{t('auth.worker')}</option>
              <option value="DOCTOR">{t('auth.doctor')}</option>
            </select>
          </div>

          <button
            type="submit"
            className="primary-btn auth-btn"
            disabled={isLoading}
          >
            {isLoading ? t('auth.registering') : t('auth.registerBtn')}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            {t('auth.hasAccount')}{' '}
            <Link to="/login" className="auth-link">
              {t('auth.loginLink')}
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}

export default Register;
