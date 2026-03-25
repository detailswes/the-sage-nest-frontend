const AuthLayout = ({ children }) => {
  return (
    <div className="min-h-screen bg-[#F5F7F5] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg border border-[#E4E7E4] px-8 py-5">
        {/* Logo */}
        <div className="mb-4 text-center">
          <img
            src="/assets/images/Sage-Nest_Final.svg"
            alt="Sage Nest"
            className="w-32 mx-auto"
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />
        </div>
        {children}
      </div>
    </div>
  );
};

export default AuthLayout;
