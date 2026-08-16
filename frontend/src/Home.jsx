import { useState, useEffect } from 'react';
import { useLanguage } from './i18n/LanguageContext';
import { getActiveCamps } from './api';
import { Link } from 'react-router-dom';

const workerAvatars = ['A', 'M', 'S', 'R'];

function Home() {
  const { t } = useLanguage();
  const [homeCamps, setHomeCamps] = useState([]);

  useEffect(() => {
    getActiveCamps()
      .then((res) => setHomeCamps(res.data.camps.slice(0, 3)))
      .catch(() => {});
  }, []);

  return (
    <main className="hero">
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

      <section id="about" className="landing-section">
        <div className="landing-section-inner">
          <h2>{t('home.aboutTitle')}</h2>
          <p>
            {t('home.aboutDesc')}
          </p>
        </div>
      </section>

      <section id="how-it-works" className="landing-section">
        <div className="landing-section-inner">
          <h2>{t('home.howItWorksTitle')}</h2>
          <p>
            {t('home.howItWorksDesc')}
          </p>
        </div>
      </section>

      <section id="healthcare-services" className="landing-section">
        <div className="landing-section-inner">
          <h2>{t('home.healthcareTitle')}</h2>
          <p>
            {t('home.healthcareDesc')}
          </p>
        </div>
      </section>

      <section id="government-schemes" className="landing-section">
        <div className="landing-section-inner">
          <h2>{t('home.govSchemesTitle')}</h2>
          <p>
            {t('home.govSchemesDesc')}
          </p>
        </div>
      </section>

      <section id="medical-camps" className="landing-section">
        <div className="landing-section-inner">
          <h2>{t('home.medicalCampsTitle')}</h2>
          <p>
            {t('home.medicalCampsDesc')}
          </p>

          {homeCamps.length > 0 && (
            <>
              <div className="home-camps-grid">
                {homeCamps.map((camp) => (
                  <div key={camp.id} className="home-camp-card">
                    <span className={`camp-fee-badge ${(camp.feeType || 'FREE').toLowerCase()}`}>
                      {camp.feeType === 'FREE' ? t('camps.free') : t('camps.paid')}
                    </span>
                    <h4 className="home-camp-name">{camp.name}</h4>
                    <div className="home-camp-meta">
                      <span>📅 {new Date(camp.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      <span>📍 {camp.city || camp.location}</span>
                    </div>
                    <div className="camp-specialties">
                      {(camp.specialties || []).map((sp) => (
                        <span key={sp} className="camp-specialty-tag">{sp}</span>
                      ))}
                    </div>
                    <Link to="/camps" className="primary-btn home-camp-btn">
                      {t('camps.viewDetails')}
                    </Link>
                  </div>
                ))}
              </div>

              <div className="home-camps-footer">
                <Link to="/camps" className="secondary-btn">{t('camps.viewAllCamps')}</Link>
              </div>
            </>
          )}
        </div>
      </section>
    </main>
  );
}

export default Home;
