import { cert, getApps, initializeApp, type App } from 'firebase-admin/app';

export function getAdminApp(): App {
  const existing = getApps();
  if (existing.length) return existing[0]!;
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT as string);
  return initializeApp({
    credential: cert(serviceAccount),
    databaseURL: process.env.FIREBASE_DATABASE_URL,
  });
}
