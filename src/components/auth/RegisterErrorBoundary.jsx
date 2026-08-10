import { Component } from 'react';

// Scoped to the /register route only — does not affect any other page.
// A safety net in case a render crashes here for any reason (e.g. a browser
// or OS-level translator mutating the DOM behind React's back, which the
// `noTranslate` AuthLayout prop and the browser-language detection in
// src/i18n/index.js are meant to prevent, but this catches anything that
// still slips through). Without this, an uncaught render error leaves the
// whole page blank with no feedback, since the app has no top-level
// ErrorBoundary elsewhere.
class RegisterErrorBoundary extends Component {
  state = { hasError: false };

  // TEMP DEBUG — remove once verified.
  componentDidMount() {
    console.log('[RegisterErrorBoundary] mounted and watching /register for crashes');
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('[RegisterErrorBoundary] Register page crashed:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#f4eee5] bg-sage-stripes bg-stripe-size bg-repeat-x flex items-center justify-center px-4 py-12">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-lg border border-[#E4E7E4] px-8 py-10 text-center">
            <p className="text-sm text-[#1F2933] mb-1">Something went wrong. Please refresh the page and try again.</p>
            <p className="text-sm text-[#1F2933] mb-6">Qualcosa è andato storto. Aggiorna la pagina e riprova.</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="py-2.5 px-5 rounded-lg bg-[#445446] text-white text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Refresh / Aggiorna
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default RegisterErrorBoundary;
