import { LOGO_SVG } from '../../assets/images';

// `noTranslate` is opt-in and only used by the register page — it stops
// Chrome/OS-level page translation from touching this subtree, which is
// what causes a React DOM-reconciliation crash on the live password
// strength checklist (see RegisterErrorBoundary for the full story).
// Left off (default), every other AuthLayout page — Login, ForgotPassword,
// VerifyEmail, ResetPassword — behaves exactly as before.
const AuthLayout = ({ children, noTranslate }) => {
  // TEMP DEBUG — remove once verified.
  console.log('[AuthLayout] noTranslate prop:', noTranslate);
  return (
    <div className="min-h-screen bg-[#f4eee5] bg-sage-stripes bg-stripe-size bg-repeat-x flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg border border-[#E4E7E4] px-8 py-5">
        <div className="mb-4 text-center">
          <a href="https://the-sage-nest.webflow.io/">
            <img
              src={LOGO_SVG}
              alt="Sage Nest"
              className="w-32 mx-auto"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          </a>
        </div>
        {noTranslate ? <div translate="no">{children}</div> : children}
      </div>
    </div>
  );
};

export default AuthLayout;
