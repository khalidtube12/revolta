import './LoadingScreen.css';

export function LoadingScreen() {
  return (
    <div className="ls-wrap">
      <div className="ls-line" />
      <div className="ls-line" />
      <div className="ls-line" />

      <div className="ls-content">
        <img
          className="ls-logo"
          src="/assets/RevoltaLogoWithoutBack.png"
          alt="REVOLTA"
        />
        <div className="ls-name">REVOLTA</div>
        <div className="ls-divider" />
      </div>
    </div>
  );
}
