

function App() {
  return (
    <div className="app-container">
      <div className="hero">
        <h1 className="title">Swipe Select</h1>
        <p className="subtitle">
          Your modern front-end for intelligent matching. Scaffolded and ready to start building your Final Year Project.
        </p>

        <div className="card">
          <div className="features-grid">
            <div className="feature-item">
              <span className="feature-icon">✨</span>
              <span>React 18 & Vite</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">🛡️</span>
              <span>TypeScript Ready</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">🎨</span>
              <span>Dark Mode Base</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">⚡</span>
              <span>HMR Enabled</span>
            </div>
          </div>
          
          <button className="cta-button" onClick={() => alert("Ready to connect with your backend!")}>
            <span className="pulse-ring"></span>
            Get Started
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
