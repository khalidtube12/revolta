import { Link } from 'react-router-dom';
import { SuggestionsFormSection } from '../../components/suggestions/SuggestionsFormSection';
import '../welcome/WelcomePage.css';
import './SuggestionsPage.css';

export function SuggestionsPage() {
  return (
    <div className="sug-root">

      <nav className="sug-nav">
        <Link to="/" className="sug-nav-logo">
          <img alt="Revolta" src="/assets/RevoltaLogoWithoutBack.png" />
        </Link>
        <Link to="/" className="sug-back">← الرئيسية</Link>
      </nav>

      <div className="sug-page-body">
        <SuggestionsFormSection />
      </div>

    </div>
  );
}
