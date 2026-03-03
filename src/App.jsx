import { useState, useCallback, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import WelcomeScreen from './components/WelcomeScreen'
import AssetCharts from './components/AssetCharts'
import PortfolioBuilder from './components/PortfolioBuilder'
import ContactForm from './components/ContactForm'
import Results from './components/Results'
import StepIndicator from './components/StepIndicator'
import { loadLiveData } from './data/gameData'

const STEPS = ['welcome', 'charts', 'portfolio', 'contact', 'results'];

function App() {
  const [step, setStep] = useState('welcome');
  const [userWeights, setUserWeights] = useState(null);
  const [userName, setUserName] = useState('');

  // Load live data in background on app mount
  useEffect(() => {
    loadLiveData();
  }, []);

  const stepIndex = STEPS.indexOf(step);

  const goTo = useCallback((s) => {
    setStep(s);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handlePortfolioSubmit = useCallback((weights) => {
    setUserWeights(weights);
    goTo('contact');
  }, [goTo]);

  const handleContactSubmit = useCallback((name) => {
    setUserName(name);
    goTo('results');
  }, [goTo]);

  return (
    <div className="min-h-dvh flex flex-col">
      {step !== 'welcome' && step !== 'results' && (
        <StepIndicator current={stepIndex} total={STEPS.length} />
      )}

      <main className="flex-1 flex flex-col">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="flex-1 flex flex-col"
          >
            {step === 'welcome' && (
              <WelcomeScreen onStart={() => goTo('charts')} />
            )}
            {step === 'charts' && (
              <AssetCharts onNext={() => goTo('portfolio')} />
            )}
            {step === 'portfolio' && (
              <PortfolioBuilder onSubmit={handlePortfolioSubmit} />
            )}
            {step === 'contact' && (
              <ContactForm onSubmit={handleContactSubmit} onBack={() => goTo('portfolio')} />
            )}
            {step === 'results' && (
              <Results
                userWeights={userWeights}
                userName={userName}
                onReplay={() => {
                  setUserWeights(null);
                  setUserName('');
                  goTo('welcome');
                }}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

export default App
