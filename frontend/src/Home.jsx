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
  { key: 'checkups', icon: '🩺', route: '/login' },
  { key: 'vaccinations', icon: '💉', route: '/login' },
  { key: 'specialist', icon: '⚕️', route: '/login' },
  { key: 'digitalRecords', icon: '📋', route: '/login' },
];

const govSchemes = [
  {
    id: 'ayushman',
    name: 'Ayushman Bharat \u2013 PMJAY',
    desc: 'Provides health coverage of \u20b95 lakh per family per year for secondary and tertiary hospitalisation at empanelled hospitals.',
    eligibility: 'Based on SECC 2011 deprivation criteria. Covers deprived families and occupational categories.',
    link: 'https://pmjay.gov.in/',
  },
  {
    id: 'ewc',
    name: 'E-Shram \u2013 Worker e-Services',
    desc: 'Register as an unorganised worker to access social security benefits, insurance, and welfare schemes.',
    eligibility: 'Any unorganised worker aged 16\u201359 with an Aadhaar-linked bank account.',
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

function useScrollReveal() {
  useEffect(() => {
    const els = document.querySelectorAll('.rs-section');
    if (!els.length) return undefined;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('rs-visible');
            obs.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -60px 0px' },
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);
}

function AboutIllustration() {
  return (
    <svg className="rs-illust" viewBox="0 0 420 340" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="60" y="60" width="300" height="190" rx="20" fill="#f0f8f8" stroke="#0d7e7d" strokeWidth="2" />
      <rect x="60" y="60" width="300" height="52" rx="20" fill="#0d7e7d" />
      <rect x="60" y="92" width="300" height="20" fill="#0d7e7d" />
      <circle cx="120" cy="86" r="22" fill="rgba(255,255,255,0.2)" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" />
      <circle cx="120" cy="80" r="7" fill="rgba(255,255,255,0.8)" />
      <ellipse cx="120" cy="98" rx="11" ry="6" fill="rgba(255,255,255,0.8)" />
      <rect x="155" y="75" width="80" height="6" rx="3" fill="rgba(255,255,255,0.5)" />
      <rect x="155" y="88" width="50" height="4" rx="2" fill="rgba(255,255,255,0.3)" />
      <rect x="290" y="74" width="50" height="22" rx="11" fill="rgba(255,255,255,0.25)" stroke="rgba(255,255,255,0.5)" strokeWidth="1" />
      <text x="315" y="89" textAnchor="middle" fill="rgba(255,255,255,0.9)" fontSize="8" fontWeight="bold" fontFamily="sans-serif">VERIFIED</text>
      <rect x="85" y="130" width="110" height="8" rx="4" fill="#0d7e7d" opacity="0.15" />
      <rect x="85" y="130" width="70" height="8" rx="4" fill="#0d7e7d" opacity="0.35" />
      <rect x="85" y="148" width="90" height="6" rx="3" fill="#e0e8e6" />
      <rect x="85" y="162" width="120" height="6" rx="3" fill="#e0e8e6" />
      <rect x="85" y="176" width="80" height="6" rx="3" fill="#e0e8e6" />
      <rect x="85" y="196" width="60" height="20" rx="10" fill="#0d7e7d" opacity="0.08" />
      <text x="115" y="210" textAnchor="middle" fill="#0d7e7d" fontSize="8" fontWeight="600" fontFamily="sans-serif">Health ID</text>
      <rect x="240" y="130" width="100" height="80" rx="12" fill="#f0f8f8" stroke="#0d7e7d" strokeWidth="1.5" />
      <line x1="290" y1="150" x2="290" y2="190" stroke="#0d7e7d" strokeWidth="2" />
      <line x1="270" y1="170" x2="310" y2="170" stroke="#0d7e7d" strokeWidth="2" />
      <text x="290" y="208" textAnchor="middle" fill="#5f726c" fontSize="7" fontFamily="sans-serif">Medical</text>
      <rect x="30" y="270" width="360" height="40" rx="12" fill="#f0f8f8" stroke="rgba(13,126,125,0.1)" strokeWidth="1" />
      <text x="210" y="295" textAnchor="middle" fill="#5f726c" fontSize="9" fontFamily="sans-serif">Portable {'\u00B7'} Secure {'\u00B7'} Consent-Based</text>
    </svg>
  );
}

function HowItWorksIllustration() {
  return (
    <svg className="rs-illust" viewBox="0 0 380 320" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="130" y="30" width="120" height="210" rx="20" fill="#f0f8f8" stroke="#0d7e7d" strokeWidth="2" />
      <rect x="130" y="30" width="120" height="32" rx="20" fill="#0d7e7d" />
      <rect x="130" y="52" width="120" height="10" fill="#0d7e7d" />
      <text x="190" y="51" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold" fontFamily="sans-serif">HealthRaahi</text>
      <rect x="148" y="74" width="84" height="8" rx="4" fill="#0d7e7d" opacity="0.2" />
      <circle cx="190" cy="110" r="24" fill="#f0f8f8" stroke="#0d7e7d" strokeWidth="1.5" />
      <circle cx="190" cy="103" r="8" fill="#0d7e7d" opacity="0.3" />
      <ellipse cx="190" cy="122" rx="13" ry="7" fill="#0d7e7d" opacity="0.3" />
      <rect x="158" y="144" width="64" height="6" rx="3" fill="#0d7e7d" opacity="0.2" />
      <rect x="168" y="156" width="44" height="5" rx="2.5" fill="#e0e8e6" />
      <rect x="148" y="178" width="84" height="22" rx="6" fill="#0d7e7d" opacity="0.08" />
      <text x="190" y="193" textAnchor="middle" fill="#0d7e7d" fontSize="8" fontWeight="600" fontFamily="sans-serif">Health ID Card</text>
      <rect x="155" y="208" width="70" height="24" rx="12" fill="#0d7e7d" />
      <text x="190" y="224" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold" fontFamily="sans-serif">Scan QR</text>
      <rect x="280" y="100" width="80" height="100" rx="14" fill="#f0f8f8" stroke="#0d7e7d" strokeWidth="1.5" />
      <rect x="310" y="110" width="20" height="3" rx="1.5" fill="#0d7e7d" opacity="0.3" />
      <rect x="300" y="122" width="40" height="3" rx="1.5" fill="#e0e8e6" />
      <line x1="290" y1="145" x2="350" y2="145" stroke="#0d7e7d" strokeWidth="1" opacity="0.2" />
      <line x1="290" y1="158" x2="340" y2="158" stroke="#e0e8e6" strokeWidth="1" />
      <line x1="290" y1="171" x2="330" y2="171" stroke="#e0e8e6" strokeWidth="1" />
      <text x="320" y="196" textAnchor="middle" fill="#0d7e7d" fontSize="8" fontWeight="600" fontFamily="sans-serif">Hospital</text>
      <line x1="250" y1="140" x2="280" y2="140" stroke="#0d7e7d" strokeWidth="1.5" strokeDasharray="4 3" />
      <path d="M250 140 L250 120 L280 120 L280 140" fill="none" stroke="#0d7e7d" strokeWidth="1.5" strokeDasharray="4 3" />
      <circle cx="250" cy="140" r="4" fill="#0d7e7d" opacity="0.3" />
      <circle cx="280" cy="140" r="4" fill="#0d7e7d" opacity="0.3" />
    </svg>
  );
}

function HealthcareIllustration() {
  return (
    <svg className="rs-illust" viewBox="0 0 380 320" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="110" y="50" width="160" height="220" rx="20" fill="#f0f8f8" stroke="#0d7e7d" strokeWidth="2" />
      <rect x="110" y="50" width="160" height="40" rx="20" fill="#0d7e7d" />
      <rect x="110" y="80" width="160" height="10" fill="#0d7e7d" />
      <text x="190" y="76" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold" fontFamily="sans-serif">Health Dashboard</text>
      <rect x="128" y="104" width="56" height="50" rx="10" fill="#0d7e7d" opacity="0.08" stroke="#0d7e7d" strokeWidth="1" />
      <line x1="146" y1="118" x2="146" y2="142" stroke="#0d7e7d" strokeWidth="2" />
      <line x1="134" y1="130" x2="158" y2="130" stroke="#0d7e7d" strokeWidth="2" />
      <text x="156" y="149" textAnchor="middle" fill="#5f726c" fontSize="7" fontFamily="sans-serif">Check-up</text>
      <rect x="196" y="104" width="56" height="50" rx="10" fill="#0d7e7d" opacity="0.08" stroke="#0d7e7d" strokeWidth="1" />
      <rect x="216" y="116" width="4" height="18" rx="2" fill="#0d7e7d" />
      <circle cx="218" cy="148" r="5" fill="#0d7e7d" opacity="0.3" />
      <text x="224" y="149" textAnchor="middle" fill="#5f726c" fontSize="7" fontFamily="sans-serif">Vax</text>
      <rect x="128" y="166" width="124" height="50" rx="10" fill="#0d7e7d" opacity="0.08" stroke="#0d7e7d" strokeWidth="1" />
      <rect x="146" y="180" width="50" height="5" rx="2.5" fill="#0d7e7d" opacity="0.2" />
      <rect x="146" y="192" width="80" height="4" rx="2" fill="#e0e8e6" />
      <rect x="146" y="202" width="65" height="4" rx="2" fill="#e0e8e6" />
      <text x="190" y="235" textAnchor="middle" fill="#5f726c" fontSize="7" fontFamily="sans-serif">Records Updated in Real-Time</text>
      <circle cx="60" cy="120" r="28" fill="#f0f8f8" stroke="#0d7e7d" strokeWidth="1.5" />
      <line x1="48" y1="120" x2="72" y2="120" stroke="#0d7e7d" strokeWidth="2" />
      <line x1="60" y1="108" x2="60" y2="132" stroke="#0d7e7d" strokeWidth="2" />
      <circle cx="320" cy="160" r="28" fill="#f0f8f8" stroke="#0d7e7d" strokeWidth="1.5" />
      <rect x="310" y="148" width="20" height="24" rx="4" fill="none" stroke="#0d7e7d" strokeWidth="1.5" />
      <rect x="308" y="146" width="24" height="8" rx="4" fill="none" stroke="#0d7e7d" strokeWidth="1.5" />
    </svg>
  );
}

function GovSchemesIllustration() {
  return (
    <svg className="rs-illust" viewBox="0 0 380 320" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="130" y="70" width="120" height="160" rx="8" fill="#f0f8f8" stroke="#0d7e7d" strokeWidth="2" />
      <polygon points="190,40 130,70 250,70" fill="#0d7e7d" opacity="0.15" stroke="#0d7e7d" strokeWidth="1.5" />
      <rect x="145" y="85" width="90" height="8" rx="4" fill="#0d7e7d" opacity="0.15" />
      <rect x="155" y="100" width="70" height="5" rx="2.5" fill="#e0e8e6" />
      <rect x="150" y="118" width="80" height="30" rx="8" fill="#0d7e7d" opacity="0.08" stroke="#0d7e7d" strokeWidth="1" />
      <text x="190" y="137" textAnchor="middle" fill="#0d7e7d" fontSize="8" fontWeight="600" fontFamily="sans-serif">PMJAY</text>
      <rect x="150" y="158" width="80" height="30" rx="8" fill="#0d7e7d" opacity="0.08" stroke="#0d7e7d" strokeWidth="1" />
      <text x="190" y="177" textAnchor="middle" fill="#0d7e7d" fontSize="8" fontWeight="600" fontFamily="sans-serif">E-Shram</text>
      <rect x="150" y="198" width="80" height="22" rx="8" fill="#0d7e7d" opacity="0.08" stroke="#0d7e7d" strokeWidth="1" />
      <text x="190" y="213" textAnchor="middle" fill="#0d7e7d" fontSize="7" fontWeight="600" fontFamily="sans-serif">RSBY</text>
      <circle cx="310" cy="130" r="36" fill="#f0f8f8" stroke="#0d7e7d" strokeWidth="1.5" />
      <path d="M300 130 L308 138 L322 122" fill="none" stroke="#0d7e7d" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="70" cy="200" r="36" fill="#f0f8f8" stroke="#0d7e7d" strokeWidth="1.5" />
      <rect x="58" y="188" width="24" height="24" rx="4" fill="none" stroke="#0d7e7d" strokeWidth="1.5" />
      <line x1="58" y1="200" x2="82" y2="200" stroke="#0d7e7d" strokeWidth="1.5" />
      <line x1="70" y1="188" x2="70" y2="212" stroke="#0d7e7d" strokeWidth="1.5" />
      <text x="190" y="270" textAnchor="middle" fill="#5f726c" fontSize="9" fontFamily="sans-serif">Government-Backed Health Coverage</text>
    </svg>
  );
}

function Home() {
  const { t } = useLanguage();
  const [homeCamps, setHomeCamps] = useState([]);
  const [campsLoading, setCampsLoading] = useState(true);
  const [campsError, setCampsError] = useState(false);
  const [aboutExpanded, setAboutExpanded] = useState(false);
  const [activeStep, setActiveStep] = useState(null);
  const [activeService, setActiveService] = useState(null);

  useScrollReveal();

  useEffect(() => {
    getActiveCamps()
      .then((res) => setHomeCamps(res.data.camps.slice(0, 3)))
      .catch(() => setCampsError(true))
      .finally(() => setCampsLoading(false));
  }, []);

  return (
    <main className="hero">
      {/* Hero (unchanged) */}
      <section className="hero-copy">
        <div className="initiative-badge">HEALTHRAAHI INITIATIVE</div>
        <h1>
          {t('home.heroTitle1')}<br />
          <span className="accent">{t('home.heroAccent1')}</span><br />
          {t('home.heroTitle2')}<br />
          <span className="accent">{t('home.heroAccent2')}</span>
        </h1>
        <p>{t('home.heroDesc')}</p>
        <div className="cta-row">
          <button className="primary-btn" type="button">
            {t('home.getStarted')} <span aria-hidden="true">{'\u2192'}</span>
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
          <img src="/assets/heroimg.jpg" alt="Group of Indian workers and family members in a hospital healthcare facility" />
          <div className="status-card">
            <div className="status-icon">{'\u2713'}</div>
            <div className="status-copy">
              <span>{t('common.status')}</span>
              <strong>{t('common.recordsSynced')}</strong>
            </div>
          </div>
        </div>
      </section>

      {/* About HealthRaahi */}
      <section id="about" className="landing-section rs-section">
        <div className="rs-inner">
          <div className="rs-split">
            <div className="rs-illust-wrap">
              <AboutIllustration />
            </div>
            <div className="rs-content">
              <h2>{t('home.aboutTitle')}</h2>
              <p className="rs-desc">{t('home.aboutDesc')}</p>
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
                <span className={`toggle-arrow ${aboutExpanded ? 'up' : ''}`}>{'\u25BE'}</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="landing-section rs-section">
        <div className="rs-inner">
          <div className="rs-split">
            <div className="rs-illust-wrap">
              <HowItWorksIllustration />
            </div>
            <div className="rs-content">
              <h2>{t('home.howItWorksTitle')}</h2>
              <p className="rs-desc">{t('home.howItWorksDesc')}</p>
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
          </div>
        </div>
      </section>

      {/* Healthcare Services */}
      <section id="healthcare-services" className="landing-section rs-section">
        <div className="rs-inner">
          <div className="rs-split">
            <div className="rs-illust-wrap">
              <HealthcareIllustration />
            </div>
            <div className="rs-content">
              <h2>{t('home.healthcareTitle')}</h2>
              <p className="rs-desc">{t('home.healthcareDesc')}</p>
              <div className="services-compact">
                {healthcareServices.map((svc) => (
                  <Link
                    key={svc.key}
                    to={svc.route}
                    className={`service-card-compact ${activeService === svc.key ? 'active' : ''}`}
                    onMouseEnter={() => setActiveService(svc.key)}
                    onMouseLeave={() => setActiveService(null)}
                  >
                    <div className="scc-icon">{svc.icon}</div>
                    <div className="scc-text">
                      <strong>{t(`home.service${svc.key.charAt(0).toUpperCase() + svc.key.slice(1)}Title`)}</strong>
                      <span>{t(`home.service${svc.key.charAt(0).toUpperCase() + svc.key.slice(1)}Desc`)}</span>
                    </div>
                    <span className="scc-arrow">{'\u2192'}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Government Schemes */}
      <section id="government-schemes" className="landing-section rs-section">
        <div className="rs-inner">
          <div className="rs-split">
            <div className="rs-illust-wrap">
              <GovSchemesIllustration />
            </div>
            <div className="rs-content">
              <h2>{t('home.govSchemesTitle')}</h2>
              <p className="rs-desc">{t('home.govSchemesDesc')}</p>
              <div className="schemes-compact">
                {govSchemes.map((scheme) => (
                  <a
                    key={scheme.id}
                    href={scheme.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="scheme-card-compact"
                  >
                    <div className="scc-badge">{'\u2713'}</div>
                    <div className="scc-text">
                      <strong>{scheme.name}</strong>
                      <span>{scheme.desc}</span>
                    </div>
                    <span className="scc-arrow">{'\u2197'}</span>
                  </a>
                ))}
              </div>
              <div className="schemes-checker-inline">
                <Link to="/register" className="primary-btn checker-btn">
                  {t('home.registerToCheck')} {'\u2192'}
                </Link>
                <Link to="/login" className="secondary-btn checker-btn">
                  {t('home.loginToCheck')}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Medical Camps */}
      <section id="medical-camps" className="landing-section rs-section">
        <div className="rs-inner">
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
              <span className="camps-empty-icon">{'\u26A0\uFE0F'}</span>
              <p>{t('home.campsLoadError')}</p>
            </div>
          )}

          {!campsLoading && !campsError && homeCamps.length === 0 && (
            <div className="home-camps-empty">
              <span className="camps-empty-icon">{'\u26FA'}</span>
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
                          <span className="meta-icon">{'\uD83D\uDCC5'}</span>
                          {new Date(camp.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                        <span className="home-camp-meta-row">
                          <span className="meta-icon">{'\uD83D\uDCCD'}</span>
                          {camp.location}{camp.city ? `, ${camp.city}` : ''}
                        </span>
                        {camp.organizer && (
                          <span className="home-camp-meta-row">
                            <span className="meta-icon">{'\uD83C\uDFE5'}</span>
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
                            <div className="camp-slots-bar-fill" style={{ width: `${Math.min((totalRegistered / totalSlots) * 100, 100)}%` }} />
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
                <Link to="/camps" className="secondary-btn">{t('camps.viewAllCamps')} {'\u2192'}</Link>
              </div>
            </>
          )}
        </div>
      </section>
    </main>
  );
}

export default Home;
