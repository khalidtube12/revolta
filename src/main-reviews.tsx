import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ReviewsPublicPage } from './pages/reviews/ReviewsPublicPage';
import { ShowDetailPage } from './pages/reviews/ShowDetailPage';
import { TopMatchesPage } from './pages/reviews/TopMatchesPage';
import { MemberProfilePage } from './pages/welcome/MemberProfilePage';
import './styles/global.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ReviewsPublicPage />} />
        <Route path="/top" element={<TopMatchesPage />} />
        <Route path="/m/:uid" element={<MemberProfilePage />} />
        <Route path="/:showId" element={<ShowDetailPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
