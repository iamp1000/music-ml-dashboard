'use client';

import React, { useEffect } from 'react';
import { initLanding } from './landingLogic';

export default function Home() {
  useEffect(() => {
    // We need to wait for DOM elements to mount
    let cleanup = () => {};
    // Give it a tiny tick for nextjs dynamic route mount
    const timer = setTimeout(() => {
        cleanup = initLanding();
    }, 100);

    return () => {
      clearTimeout(timer);
      if (cleanup) cleanup();
    };
  }, []);

  const handleLogin = (e) => {
    e.preventDefault();
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://music-ml-server.onrender.com';
    const cleanUrl = baseUrl.replace(/\/+$/, '');
    window.location.href = `${cleanUrl}/auth/login`;
  };

  return (
    <>
      <div className="loading-screen" data-loading-screen>
        <div className="loading-counter">
          <span className="loading-label">Loading system</span>
          <span className="loading-value" data-loading-value>0%</span>
        </div>
        <div className="loading-bar-container">
          <div className="loading-bar" data-loading-bar></div>
        </div>
      </div>

      <div className="hero-background">
        <canvas className="webgl-canvas" data-webgl-canvas></canvas>
        <div className="grain"></div>
      </div>

      <div className="progress-rail">
        <div className="progress-fill" data-progress-fill></div>
      </div>

      <header className="site-header">
        <div className="brand">LUNA</div>
        <nav className="nav">
          <a href="#hero">Overview</a>
          <a href="#systems">Intelligence</a>
          <a href="#" onClick={handleLogin}>Log In</a>
        </nav>
      </header>

      <main className="content-container">
        <section className="hero-section" id="hero" data-hero>
          <div className="hero-copy-block">
            <div className="eyebrow reveal">LUNA Machine Learning</div>
            <div className="hero-whisper reveal">
              <span>audio telemetry</span>
              <span>neural tracking</span>
              <span>mood modeling</span>
            </div>
            <h1
              className="hero-title"
              data-pretext-title
              aria-label="Intelligence shaped by music. Telemetry sculpted in real-time."
            >
              <span className="hero-title-sr">Intelligence shaped by music.</span>
            </h1>
            <p className="hero-copy reveal">
              LUNA is a cinematic telemetry engine creating multidimensional data models, audio feature extraction, and continuous valence-arousal mappings for your Spotify activity.
            </p>
            <div className="hero-metrics reveal">
              <div className="metric-card">
                <span className="metric-value">Neural</span>
                <span className="metric-label">Extracts features using local RNN models and librosa</span>
              </div>
              <div className="metric-card">
                <span className="metric-value">Valence</span>
                <span className="metric-label">Maps audio warmth and rhythm into emotional space</span>
              </div>
              <div className="metric-card">
                <span className="metric-value">Live</span>
                <span className="metric-label">Synchronized constantly with your active listening session</span>
              </div>
            </div>
            <div className="hero-notes reveal">
              <div className="hero-note">Beat tracking</div>
              <div className="hero-note">Genre detection</div>
              <div className="hero-note">Activity profiling</div>
            </div>
          </div>

          <div className="hero-media reveal" data-hero-media>
            <div className="hero-media-frame" style={{display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)'}}>
                <div style={{textAlign: 'center', padding: '2rem'}}>
                    <button 
                        onClick={handleLogin}
                        className="flex items-center justify-center w-full gap-3 px-8 py-4 rounded-full bg-[#1DB954] text-[#0A0D14] font-bold tracking-wide hover:scale-105 transition-transform shadow-[0_0_40px_rgba(29,185,84,0.3)]"
                    >
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                        <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.84.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.84.241 1.2zM19.08 7.3c-3.96-2.34-10.44-2.58-14.22-1.44-.6.18-1.2-.18-1.38-.72-.18-.6.18-1.2.72-1.38 4.26-1.26 11.28-1.02 15.72 1.62.539.3.719 1.02.419 1.56-.239.48-.959.72-1.259.36z"/>
                    </svg>
                    CONNECT TO SPOTIFY
                    </button>
                    <p style={{marginTop: '1rem', color: '#8293B4', fontSize: '0.8rem'}}>Authenticate to begin telemetry sync</p>
                </div>
              <div className="hero-media-overlay"></div>
              <div className="hero-chip hero-chip-top">LUNA v1.0</div>
              <div className="hero-chip hero-chip-bottom">Live telemetry required</div>
            </div>
          </div>
        </section>

        <section className="systems-section" id="systems">
          <div className="section-intro reveal">
            <p className="eyebrow">Data and cognition</p>
            <h2 data-pretext-balance>A music engine framed like a neural laboratory.</h2>
            <p>
              The concept treats audio tracking as part of your digital architecture: precise algorithms, local PyTorch inference, and statistics that feel bespoke rather than generic.
            </p>
          </div>

          <div className="feature-grid">
            <article className="feature-card reveal">
              <p className="feature-index">01</p>
              <h3>Temporal telemetry</h3>
              <p>Every listening session is captured as a spatial coordinate, charting the emotional journey across valence, energy, and acoustic signature.</p>
            </article>
            <article className="feature-card reveal">
              <p className="feature-index">02</p>
              <h3>Local inference</h3>
              <p>Heavy ML models process audio features entirely locally using madmom and librosa, mapping unquantified qualities into structured coordinates.</p>
            </article>
            <article className="feature-card reveal">
              <p className="feature-index">03</p>
              <h3>Continuous synchronization</h3>
              <p>The worker polls your Spotify activity perpetually, building a rich historical archive of your changing musical architecture without heavy cloud costs.</p>
            </article>
          </div>

          <div className="pretext-studio reveal">
            <div className="pretext-studio-copy">
              <p className="eyebrow">Cognitive studies</p>
              <div
                className="pretext-rotator"
                data-pretext-rotator
                data-pretext-phrases="Telemetry drawn with neural precision.||Data models holding features after dusk.||Audio pieces composed like clustered objects."
                aria-label="Telemetry drawn with neural precision."
              ></div>
              <p className="pretext-caption">
                LUNA frames energy, mood, and genre topology as one continuous cognitive composition.
              </p>
            </div>
            <div
              className="pretext-playground"
              data-pretext-playground
              data-pretext-playground-text="Audio light slides across the model while clustered features, floating dimensions, and structured data drift through the analysis. Drag the forms and the embedding flexes like a living map, balancing density, variance, and rhythm in one calm surface."
            >
              <div className="pretext-playground-meta">
                <span>Drag the neural spheres</span>
                <span>Topology motion study</span>
              </div>
              <div className="pretext-playground-stage" data-pretext-stage>
                <div className="pretext-playground-copy" data-pretext-copy></div>
                <button
                  type="button"
                  className="pretext-orb orb-primary"
                  data-pretext-orb
                  aria-label="Drag sphere"
                ></button>
                <button
                  type="button"
                  className="pretext-orb orb-secondary"
                  data-pretext-orb
                  aria-label="Drag accent sphere"
                ></button>
              </div>
            </div>
          </div>
        </section>

        <section className="outro-section" id="outro">
          <div className="outro-panel reveal">
            <p className="eyebrow">Access</p>
            <h2 data-pretext-balance>LUNA creates deep context for everyday spaces.</h2>
            <p>
              For audiophiles, developers, and data enthusiasts, the engine is positioned around custom analytics that feel as profound as the music behind them.
            </p>
            <button onClick={handleLogin} className="cta">Connect Spotify</button>
          </div>
        </section>
      </main>
    </>
  );
}
