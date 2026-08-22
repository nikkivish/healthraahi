import { useState, useEffect } from 'react';
import { useLanguage } from './i18n/LanguageContext';
import { getActiveCamps } from './api';
import { Link } from 'react-router-dom';

const workerAvatars = ['A', 'M', 'S', 'R'];

const howItWorksSteps = [
  { key: 'register', icon: '📱' },
  { key: 'healthId', icon: '🪪' },
  { key: 'access', icon: '🏥' },
];

const healthcareServices = [
  { key: 'records', icon: '📋', route: '/login' },
  { key: 'aiAssistant', icon: '🤖', route: '/login' },
  { key: 'camps', icon: '⛺', route: '/camps' },
  { key: 'consent', icon: '🔒', route: '/login' },
  { key: 'documents', icon: '📄', route: '/login' },
  { key: 'schemes', icon: '🏛️', route: '/register' },
];

const govSchemes = [
  {
    id: 'ayushman',
    name: 'Ayushman Bharat – PMJAY',
    desc: 'Provides health coverage of ₹5 lakh per family per year for secondary and tertiary hospitalisation at empanelled hospitals.',
    eligibility: 'Based on SECC 2011 deprivation criteria. Covers deprived families and occupational categories.',
    link: 'https://pmjay.gov.in/',
  },
  {
    id: 'ewc',
    name: 'E-Shram – Worker e-Services',
    desc: 'Register as an unorganised worker to access social security benefits, insurance, and welfare schemes.',
    eligibility: 'Any unorganised worker aged 16–59 with an Aadhaar-linked bank account.',
    link: 'https://eshram.gov.in/',
  },
  {
    id: 'rashtriya',
    name: 'Rashtriya Swasthya Bima Yojana',
    desc: 'Covers hospitalisation expenses for BPL families and certain occupational categories.',
    eligibility: 'BPL families, MGNREGA workers, and categories notified by the government.',
    link: 'https://www.rsby.gov.in/',
  },
];

function Home() {
  const { t } = useLanguage();
  const [homeCamps, setHomeCamps] = useState([]);
  const [campsLoading, setCampsLoading] = useState(true);
  const [campsError, setCampsError] = useState(false);
  const [aboutExpanded, setAboutExpanded] = useState(false);
  const [activeStep, setActiveStep] = useState(null);
  const [activeService, setActiveService] = useState(null);
  const [schemeEligible, setSchemeEligible] = useState(null);

  useEffect(() => {
    getActiveCamps()
      .then((res) => setHomeCamps(res.data.camps.slice(0, 3)))
      .catch(() => setCampsError(true))
      .finally(() => setCampsLoading(false));
  }, []);

  return (
    <main className="hero">
      {/* ── Hero (unchanged) ──────────────────────────────────────────── */}
      <section className="hero-copy">
        <div className="initiative-badge">HEALTHRAAHI INITIATIVE</div>

        <h1>
          {t('home.heroTitle1')}<br />
          <span className="accent">{t('home.heroAccent1')}</span><br />
          {t('home.heroTitle2')}<br />
          <span className="accent">{t('home.heroAccent2')}</span>
        </h1>

        <p>
          {t('home.heroDesc')}
        </p>

        <div className="cta-row">
          <button className="primary-btn" type="button">
            {t('home.getStarted')} <span aria-hidden="true">→</span>
          </button>
          <button className="secondary-btn" type="button">{t('home.learnMore')}</button>
        </div>

        <div className="divider" />

        <div className="workers-row">
          <div className="avatar-stack" aria-label={t('home.workersRegistered')}>
            {workerAvatars.map((avatar, index) => (
              <span key={avatar + index} className={`avatar avatar-${index + 1}`} aria-hidden="true">
                {avatar}
              </span>
            ))}
          </div>
          <span className="worker-text">{t('home.workersRegistered')}</span>
        </div>
      </section>

      <section className="hero-visual" aria-label="Healthcare image card">
        <div className="photo-card">
          <img
            src="/assets/heroimg.jpg"
            alt="Group of Indian workers and family members in a hospital healthcare facility"
          />

          <div className="status-card">
            <div className="status-icon">✓</div>
            <div className="status-copy">
              <span>{t('common.status')}</span>
              <strong>{t('common.recordsSynced')}</strong>
            </div>
          </div>
        </div>
      </section>

      {/* ── About HealthRaahi ─────────────────────────────────────────── */}
      <section id="about" className="landing-section">
        <div className="landing-section-inner">
          <h2>{t('home.aboutTitle')}</h2>
          <p>
            {t('home.aboutDesc')}
          </p>
          <div className={`about-expanded ${aboutExpanded ? 'open' : ''}`}>
            <div className="about-details">
              <div className="about-grid">
                <div className="about-stat">
                  <strong>100%</strong>
                  <span>{t('home.aboutStat1')}</span>
                </div>
                <div className="about-stat">
                  <strong>{t('home.aboutStat2Val')}</strong>
                  <span>{t('home.aboutStat2')}</span>
                </div>
                <div className="about-stat">
                  <strong>{t('home.aboutStat3Val')}</strong>
                  <span>{t('home.aboutStat3')}</span>
                </div>
              </div>
              <p className="about-detail-text">{t('home.aboutDetail')}</p>
            </div>
          </div>
          <button
            className="about-toggle-btn"
            type="button"
            onClick={() => setAboutExpanded(!aboutExpanded)}
          >
            {aboutExpanded ? t('home.showLess') : t('home.learnMore')}{' '}
            <span className={`toggle-arrow ${aboutExpanded ? 'up' : ''}`}>▾</span>
          </button>
        </div>
      </section>

      {/* ── How It Works (interactive 3-step) ────────────────────────── */}
      <section id="how-it-works" className="landing-section">
        <div className="landing-section-inner">
          <h2>{t('home.howItWorksTitle')}</h2>
          <p className="section-subtitle">{t('home.howItWorksDesc')}</p>

          <div className="hiw-track">
            <div className="hiw-connector" />
            {howItWorksSteps.map((step, i) => (
              <div
                key={step.key}
                className={`hiw-step ${activeStep === i ? 'active' : ''}`}
                onMouseEnter={() => setActiveStep(i)}
                onMouseLeave={() => setActiveStep(null)}
                onClick={() => setActiveStep(activeStep === i ? null : i)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter') setActiveStep(activeStep === i ? null : i); }}
              >
                <div className="hiw-circle">{step.icon}</div>
                <span className="hiw-number">{i + 1}</span>
                <strong className="hiw-label">{t(`home.step${i + 1}Title`)}</strong>
                <div className="hiw-detail">
                  <p>{t(`home.step${i + 1}Desc`)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Healthcare Services (interactive cards) ───────────────────── */}
      <section id="healthcare-services" className="landing-section">
        <div className="landing-section-inner">
          <h2>{t('home.healthcareTitle')}</h2>
          <p className="section-subtitle">{t('home.healthcareDesc')}</p>

          <div className="services-grid">
            {healthcareServices.map((svc) => (
              <Link
                key={svc.key}
                to={svc.route}
                className={`service-card ${activeService === svc.key ? 'active' : ''}`}
                onMouseEnter={() => setActiveService(svc.key)}
                onMouseLeave={() => setActiveService(null)}
              >
                <div className="service-icon">{svc.icon}</div>
                <strong>{t(`home.service${svc.key.charAt(0).toUpperCase() + svc.key.slice(1)}Title`)}</strong>
                <span>{t(`home.service${svc.key.charAt(0).toUpperCase() + svc.key.slice(1)}Desc`)}</span>
                <span className="service-arrow">→</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Government Schemes (dynamic from real data) ────────────────── */}
      <section id="government-schemes" className="landing-section">
        <div className="landing-section-inner">
          <h2>{t('home.govSchemesTitle')}</h2>
          <p className="section-subtitle">{t('home.govSchemesDesc')}</p>

          <div className="schemes-grid">
            {govSchemes.map((scheme) => (
              <div key={scheme.id} className="scheme-card">
                <div className="scheme-header">
                  <h4>{scheme.name}</h4>
                </div>
                <p className="scheme-desc">{scheme.desc}</p>
                <div className="scheme-eligibility">
                  <strong>{t('home.eligibility')}:</strong> {scheme.eligibility}
                </div>
                <a
                  href={scheme.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="scheme-link"
                >
                  {t('home.visitOfficial')} ↗
                </a>
              </div>
            ))}
          </div>

          <div className="schemes-checker">
            <h3>{t('home.findEligibleSchemes')}</h3>
            <p>{t('home.checkerDesc')}</p>
            <div className="checker-actions">
              <Link to="/register" className="primary-btn checker-btn">
                {t('home.registerToCheck')} →
              </Link>
              <Link to="/login" className="secondary-btn checker-btn">
                {t('home.loginToCheck')}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Medical Camps (dynamic from API) ──────────────────────────── */}
      <section id="medical-camps" className="landing-section">
        <div className="landing-section-inner">
          <h2>{t('home.medicalCampsTitle')}</h2>
          <p className="section-subtitle">{t('home.medicalCampsDesc')}</p>

          {campsLoading && (
            <div className="home-camps-loading">
              <div className="camp-skeleton" />
              <div className="camp-skeleton" />
              <div className="camp-skeleton" />
            </div>
          )}

          {campsError && (
            <div className="home-camps-empty">
              <span className="camps-empty-icon">⚠️</span>
              <p>{t('home.campsLoadError')}</p>
            </div>
          )}

          {!campsLoading && !campsError && homeCamps.length === 0 && (
            <div className="home-camps-empty">
              <span className="camps-empty-icon">⛺</span>
              <p>{t('camps.noCampsYet')}</p>
            </div>
          )}

          {!campsLoading && !campsError && homeCamps.length > 0 && (
            <>
              <div className="home-camps-grid">
                {homeCamps.map((camp) => {
                  const totalSlots = (camp.timeSlots || []).reduce((sum, s) => sum + (s.capacity || 0), 0);
                  const totalRegistered = (camp.timeSlots || []).reduce((sum, s) => sum + (s.registeredCount || 0), 0);
                  const slotsLeft = totalSlots - totalRegistered;

                  return (
                    <div key={camp.id} className="home-camp-card">
                      <div className="home-camp-card-header">
                        <span className={`camp-fee-badge ${(camp.feeType || 'FREE').toLowerCase()}`}>
                          {camp.feeType === 'FREE' ? t('camps.free') : t('camps.paid')}
                        </span>
                        {slotsLeft > 0 && (
                          <span className="camp-slots-badge">
                            {t('camps.slotsLeft', { count: slotsLeft })}
                          </span>
                        )}
                      </div>
                      <h4 className="home-camp-name">{camp.name}</h4>
                      <div className="home-camp-meta">
                        <span className="home-camp-meta-row">
                          <span className="meta-icon">📅</span>
                          {new Date(camp.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                        <span className="home-camp-meta-row">
                          <span className="meta-icon">📍</span>
                          {camp.location}{camp.city ? `, ${camp.city}` : ''}
                        </span>
                        {camp.organizer && (
                          <span className="home-camp-meta-row">
                            <span className="meta-icon">🏥</span>
                            {camp.organizer}
                          </span>
                        )}
                      </div>
                      <div className="camp-specialties">
                        {(camp.specialties || []).map((sp) => (
                          <span key={sp} className="camp-specialty-tag">{sp}</span>
                        ))}
                      </div>
                      {totalSlots > 0 && (
                        <div className="camp-slots-bar">
                          <div className="camp-slots-bar-inner">
                            <div
                              className="camp-slots-bar-fill"
                              style={{ width: `${Math.min((totalRegistered / totalSlots) * 100, 100)}%` }}
                            />
                          </div>
                          <span className="camp-slots-text">
                            {totalRegistered}/{totalRegistered + slotsLeft} {t('camps.registered')}
                          </span>
                        </div>
                      )}
                      <Link to="/camps" className="primary-btn home-camp-btn">
                        {t('camps.viewDetails')}
                      </Link>
                    </div>
                  );
                })}
              </div>

              <div className="home-camps-footer">
                <Link to="/camps" className="secondary-btn">{t('camps.viewAllCamps')} →</Link>
              </div>
            </>
          )}
        </div>
      </section>
    </main>
  );
}

export default Home;
