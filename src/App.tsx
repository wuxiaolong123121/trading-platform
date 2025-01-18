import React from 'react';
import TradingDesktopApp from './components/TradingDesktopApp';
import { TradingProvider } from './context/TradingContext';

function App() {
  return (
    <TradingProvider>
      <div className="h-screen flex">
        <TradingDesktopApp />
      </div>
    </TradingProvider>
  );
}

export default App;