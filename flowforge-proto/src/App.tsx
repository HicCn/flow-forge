import { useAppStore } from './store/appStore';
import LandingScreen from './screens/LandingScreen';
import AppShell from './components/layout/AppShell';

export default function App() {
  const screen = useAppStore((s) => s.screen);

  if (screen === 'landing') return <LandingScreen />;
  return <AppShell />;
}
