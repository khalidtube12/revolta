import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { dbGet } from '../../services/db.service';
import { ApplyFormSection } from '../../components/apply/ApplyFormSection';
import '../welcome/WelcomePage.css';
import './ApplyPage.css';

export function ApplyPage() {
  const [applyOpen, setApplyOpen] = useState<boolean | null>(null);

  useEffect(() => {
    dbGet<boolean>('meta/applyOpen').then(v => setApplyOpen(v ?? true));
  }, []);

  return (
    <div className="apply-root">

      <nav className="apply-nav">
        <Link to="/" className="apply-nav-logo">
          <img alt="Revolta" src="/assets/RevoltaLogoWithoutBack.png" />
        </Link>
        <Link to="/" className="apply-back">← الرئيسية</Link>
      </nav>

      {applyOpen === null ? (
        <div className="apply-loading">
          <div className="apply-spinner" />
        </div>
      ) : (
        <ApplyFormSection closed={!applyOpen} />
      )}

    </div>
  );
}
