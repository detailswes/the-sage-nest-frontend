import LanguageSelector from '../LanguageSelector';
import { LOGO_SVG } from '../../assets/images';

const AuthLayout = ({ children }) => {
  return (
    <div className="min-h-screen bg-[#f4eee5] bg-sage-stripes bg-stripe-size bg-repeat-x flex items-center justify-center px-4 py-12">
      {/* Language toggle — fixed top-right, outside the card */}
      <div className="fixed top-4 right-4 z-50">
        <LanguageSelector variant="pill" />
      </div>

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
        {children}
      </div>
    </div>
  );
};

export default AuthLayout;
