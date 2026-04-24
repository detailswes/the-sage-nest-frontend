import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { getMyProfile, updateMyProfile, uploadProfileImage, exportMyData, getMyProfileDraft } from '../../../api/expertApi';
import { getProfileImageUrl } from '../../../utils/imageUrl';
import { createConnectLink, verifyStripeReturn } from '../../../api/stripeApi';
import QualificationsCard from '../profile/QualificationsCard';
import CertificationsCard from '../profile/CertificationsCard';
import BusinessInfoCard from '../profile/BusinessInfoCard';
import InsuranceCard from '../profile/InsuranceCard';

// ─── Constants ────────────────────────────────────────────────────────────────
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_IMG_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

const SESSION_FORMAT_OPTIONS = [
  { value: 'ONLINE',    label: 'Online only' },
  { value: 'IN_PERSON', label: 'In-person only' },
  { value: 'BOTH',      label: 'Both online & in-person' },
];

const LANGUAGES = [
  'English', 'Danish', 'Swedish', 'Norwegian', 'Finnish',
  'German', 'French', 'Italian', 'Spanish', 'Portuguese',
  'Dutch', 'Polish', 'Irish',
];

const SUMMARY_MAX = 200;
const BIO_MAX = 700;

const TIMEZONES = [
  { value: 'Europe/Rome',    label: 'Rome / Italy (CET/CEST)' },
  { value: 'Europe/London',  label: 'London (GMT/BST)' },
  { value: 'Europe/Dublin',  label: 'Dublin (GMT/IST)' },
  { value: 'Europe/Paris',   label: 'Paris (CET/CEST)' },
  { value: 'Europe/Berlin',  label: 'Berlin (CET/CEST)' },
  { value: 'Europe/Madrid',  label: 'Madrid (CET/CEST)' },
  { value: 'Europe/Lisbon',  label: 'Lisbon (WET/WEST)' },
  { value: 'Europe/Warsaw',  label: 'Warsaw (CET/CEST)' },
  { value: 'Europe/Zurich',  label: 'Zurich (CET/CEST)' },
  { value: 'Europe/Amsterdam', label: 'Amsterdam (CET/CEST)' },
  { value: 'Europe/Brussels', label: 'Brussels (CET/CEST)' },
  { value: 'Europe/Athens',  label: 'Athens (EET/EEST)' },
  { value: 'Europe/Helsinki', label: 'Helsinki (EET/EEST)' },
  { value: 'America/New_York', label: 'New York (ET)' },
  { value: 'America/Chicago', label: 'Chicago (CT)' },
  { value: 'America/Los_Angeles', label: 'Los Angeles (PT)' },
  { value: 'America/Toronto', label: 'Toronto (ET)' },
  { value: 'Asia/Dubai',     label: 'Dubai (GST)' },
];

// ─── Stripe button ────────────────────────────────────────────────────────────
const StripeButton = ({ status, onConnect }) => {
  if (status === 'checking') {
    return (
      <div className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[#E4E7E4] text-sm text-gray-400 bg-white">
        <div className="w-3.5 h-3.5 rounded-full border-2 border-gray-300 border-t-transparent animate-spin" />
        Checking Stripe…
      </div>
    );
  }
  if (status === 'connected') {
    return (
      <div className="flex items-center gap-2 px-4 py-2 rounded-lg border border-green-200 bg-green-50 text-sm font-medium text-green-700">
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" />
        </svg>
        Stripe Connected
      </div>
    );
  }
  const isConnecting = status === 'connecting';
  const isIncomplete = status === 'incomplete';
  return (
    <button
      type="button"
      onClick={onConnect}
      disabled={isConnecting}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-all duration-150 disabled:cursor-not-allowed ${
        isIncomplete
          ? 'border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100'
          : 'border-[#635BFF]/30 bg-[#635BFF]/5 text-[#635BFF] hover:bg-[#635BFF]/10 hover:border-[#635BFF]/50'
      } ${isConnecting ? 'opacity-70' : ''}`}
    >
      {isConnecting ? (
        <>
          <div className="w-3.5 h-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
          Connecting…
        </>
      ) : (
        <>
          <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
            <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z"/>
          </svg>
          {isIncomplete ? 'Complete Stripe Setup' : 'Connect with Stripe'}
        </>
      )}
    </button>
  );
};

// ─── Language chip ────────────────────────────────────────────────────────────
const LangChip = ({ label, selected, onToggle }) => (
  <button
    type="button"
    onClick={onToggle}
    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-150 ${
      selected
        ? 'bg-[#445446] text-white border-[#445446]'
        : 'bg-white text-gray-600 border-[#E4E7E4] hover:border-[#445446]/40 hover:text-[#445446]'
    }`}
  >
    {label}
  </button>
);

// ─── Main component ───────────────────────────────────────────────────────────
const EMPTY_FORM = {
  bio: '', expertise: '',
  summary: '', position: '',
  session_format: '',
  timezone: 'Europe/Rome',
  address_street: '', address_city: '', address_postcode: '',
  languages: [],
  pending_languages: [],
  instagram: '', facebook: '', linkedin: '',
};

const ProfileSection = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const fileInputRef = useRef(null);

  const [profile, setProfile]           = useState(null);
  const [form, setForm]                 = useState(EMPTY_FORM);
  const [imageUrl, setImageUrl]         = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  // Loaded once, passed as initial props to sub-cards (null = not loaded yet)
  const [initQuals, setInitQuals]               = useState(null);
  const [initCerts, setInitCerts]               = useState(null);
  const [initBusinessInfo, setInitBusinessInfo] = useState(undefined); // undefined = not loaded
  const [initInsurance, setInitInsurance]       = useState(undefined); // undefined = not loaded

  const [customLangInput, setCustomLangInput] = useState('');

  const [draft, setDraft]         = useState(undefined); // undefined = not yet loaded

  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [uploading, setUploading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError]         = useState('');
  const [imageError, setImageError] = useState('');
  const [success, setSuccess]     = useState(false);
  const [savedAsDraft, setSavedAsDraft] = useState(false);

  // Stripe
  const [stripeStatus, setStripeStatus]     = useState('idle');
  const [stripeError, setStripeError]       = useState('');
  const [stripeSuccess, setStripeSuccess]   = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getMyProfile(), getMyProfileDraft().catch(() => null)])
      .then(([data, draftData]) => {
        if (cancelled) return;
        setProfile(data);
        setDraft(draftData);
        setForm({
          bio:              data.bio              || '',
          expertise:        data.expertise        || '',
          summary:          data.summary          || '',
          position:         data.position         || '',
          session_format:   data.session_format   || '',
          timezone:         data.timezone         || 'Europe/Rome',
          address_street:   data.address_street   || '',
          address_city:     data.address_city     || '',
          address_postcode: data.address_postcode || '',
          languages:         Array.isArray(data.languages)         ? data.languages         : [],
          pending_languages: Array.isArray(data.pending_languages) ? data.pending_languages : [],
          instagram:        data.instagram || '',
          facebook:         data.facebook  || '',
          linkedin:         data.linkedin  || '',
        });
        setImageUrl(getProfileImageUrl(data.profile_image));
        setInitQuals(data.qualifications   || []);
        setInitCerts(data.certifications   || []);
        setInitBusinessInfo(data.business_info || null);
        setInitInsurance(data.insurance    || null);

        if (!data.stripe_account_id) {
          setStripeStatus('not_connected');
        } else {
          setStripeStatus('checking');
          verifyStripeReturn()
            .then((r) => { if (!cancelled) setStripeStatus(r.onboarding_complete ? 'connected' : 'incomplete'); })
            .catch(() => { if (!cancelled) setStripeStatus('incomplete'); });
        }
      })
      .catch(() => setError('Failed to load profile.'))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (searchParams.get('stripe') === 'success') {
      setStripeSuccess(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    if (success) setSuccess(false);
    if (error) setError('');
  };

  const handleLanguageToggle = (lang) => {
    setForm((f) => ({
      ...f,
      languages: f.languages.includes(lang)
        ? f.languages.filter((l) => l !== lang)
        : [...f.languages, lang],
    }));
    if (success) setSuccess(false);
  };

  const handleAddCustomLanguage = () => {
    const lang = customLangInput.trim();
    if (!lang) return;
    if (
      LANGUAGES.map((l) => l.toLowerCase()).includes(lang.toLowerCase()) ||
      form.languages.map((l) => l.toLowerCase()).includes(lang.toLowerCase()) ||
      form.pending_languages.map((l) => l.toLowerCase()).includes(lang.toLowerCase())
    ) return;
    setForm((f) => ({ ...f, pending_languages: [...f.pending_languages, lang] }));
    setCustomLangInput('');
    if (success) setSuccess(false);
  };

  const handleRemovePendingLanguage = (lang) => {
    setForm((f) => ({ ...f, pending_languages: f.pending_languages.filter((l) => l !== lang) }));
    if (success) setSuccess(false);
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setImageError('');
    if (!ALLOWED_IMG_TYPES.includes(file.type)) {
      setImageError('Please upload a JPEG, PNG, or WebP image.'); return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setImageError(`Your photo is ${(file.size / 1024 / 1024).toFixed(1)} MB — max 5 MB. Try to upload a photo of shorter size.`); return;
    }
    const localUrl = URL.createObjectURL(file);
    setImagePreview(localUrl);
    setUploading(true);
    try {
      const result = await uploadProfileImage(file);
      setImageUrl(getProfileImageUrl(result.profile_image));
      setProfile((p) => ({ ...p, profile_image: result.profile_image }));
    } catch (err) {
      setImageError(err?.response?.data?.error || 'Upload failed. Please try again.');
      setImagePreview(null);
    } finally {
      setUploading(false);
      URL.revokeObjectURL(localUrl);
      setImagePreview(null);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (form.bio.length > BIO_MAX) {
      setError(`Full bio must be ${BIO_MAX} characters or fewer.`); return;
    }
    if (form.summary.length > SUMMARY_MAX) {
      setError(`Summary must be ${SUMMARY_MAX} characters or fewer.`); return;
    }
    setSaving(true);
    setError('');
    setSuccess(false);
    setSavedAsDraft(false);
    try {
      const result = await updateMyProfile({
        bio:              form.bio              || null,
        expertise:        form.expertise        || null,
        summary:          form.summary          || null,
        position:         form.position         || null,
        session_format:   form.session_format   || null,
        timezone:         form.timezone         || 'Europe/Rome',
        address_street:   form.address_street   || null,
        address_city:     form.address_city     || null,
        address_postcode: form.address_postcode || null,
        languages:         form.languages,
        pending_languages: form.pending_languages,
        instagram:        form.instagram || null,
        facebook:         form.facebook  || null,
        linkedin:         form.linkedin  || null,
      });
      if (result?.draft) {
        setDraft(result.profile_draft);
        setSavedAsDraft(true);
      } else {
        setProfile((p) => ({ ...p, ...result }));
        setDraft(null);
        setSuccess(true);
      }
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to save profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const data = await exportMyData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `sage-nest-data-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      // silently fail — user can retry
    } finally {
      setExporting(false);
    }
  };

  const handleConnectStripe = async () => {
    setStripeError('');
    setStripeStatus('connecting');
    try {
      const data = await createConnectLink();
      window.location.href = data.url;
    } catch (err) {
      setStripeError(err?.response?.data?.error || 'Could not connect to Stripe. Please try again.');
      setStripeStatus(profile?.stripe_account_id ? 'incomplete' : 'not_connected');
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 rounded-full border-2 border-[#445446] border-t-transparent animate-spin" />
      </div>
    );
  }

  const initials = user?.name
    ? user.name.trim().split(/\s+/).map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : '?';
  const memberSince = profile?.user?.created_at
    ? new Date(profile.user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : null;
  const displayImage = imagePreview || imageUrl;
  const showAddress  = form.session_format === 'IN_PERSON' || form.session_format === 'BOTH';
  const inputClass   = 'w-full px-4 py-3 rounded-lg border border-[#E4E7E4] text-sm text-[#1F2933] placeholder-gray-400 bg-white transition focus:outline-none focus:ring-2 focus:ring-[#445446]/30 focus:border-[#445446]';

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-[#1F2933]">Profile</h2>
          <p className="text-sm text-gray-500 mt-1">Manage your expert profile information.</p>
        </div>
        {stripeStatus !== 'idle' && (
          <div className="flex-shrink-0 mt-0.5 flex flex-col items-end gap-1">
            <StripeButton status={stripeStatus} onConnect={handleConnectStripe} />
            <span className="inline-flex items-center px-1.5 py-px rounded text-[10px] font-medium leading-none bg-gray-100 text-gray-500 border border-gray-200 align-middle">Internal</span>
          </div>
        )}
      </div>

      {/* Stripe success banner */}
      {stripeSuccess && (
        <div className="mb-5 flex items-start gap-3 px-4 py-3.5 bg-green-50 border border-green-200 rounded-xl">
          <svg className="w-5 h-5 text-green-600 flex-shrink-0 mt-px" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" />
          </svg>
          <div>
            <p className="text-sm font-medium text-green-800">Stripe account connected!</p>
            <p className="text-xs text-green-600 mt-0.5">You can now receive payouts when bookings are completed.</p>
          </div>
          <button onClick={() => setStripeSuccess(false)} className="ml-auto p-0.5 text-green-400 hover:text-green-600 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
          </button>
        </div>
      )}

      {/* Stripe error banner */}
      {stripeError && (
        <div className="mb-5 flex items-start gap-3 px-4 py-3.5 bg-red-50 border border-red-200 rounded-xl">
          <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-px" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
          </svg>
          <p className="text-sm text-red-600 flex-1">{stripeError}</p>
          <button onClick={() => setStripeError('')} className="ml-auto p-0.5 text-red-400 hover:text-red-600 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
          </button>
        </div>
      )}

      {/* Pending draft banner */}
      {draft?.status === 'PENDING_REVIEW' && !savedAsDraft && (
        <div className="mb-5 flex items-start gap-3 px-4 py-3.5 bg-amber-50 border border-amber-200 rounded-xl">
          <svg className="w-5 h-5 text-amber-500 flex-shrink-0 mt-px" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 5Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
          </svg>
          <div>
            <p className="text-sm font-medium text-amber-800">Profile changes pending review</p>
            <p className="text-xs text-amber-600 mt-0.5">Your recent edits have been submitted and are awaiting admin approval. Your live profile is unchanged until they are approved. You can save new changes at any time to update the pending submission.</p>
          </div>
        </div>
      )}

      {/* Rejected draft banner */}
      {draft?.status === 'REJECTED' && (
        <div className="mb-5 flex items-start gap-3 px-4 py-3.5 bg-red-50 border border-red-200 rounded-xl">
          <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-px" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM8.28 7.22a.75.75 0 0 0-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 1 0 1.06 1.06L10 11.06l1.72 1.72a.75.75 0 1 0 1.06-1.06L11.06 10l1.72-1.72a.75.75 0 0 0-1.06-1.06L10 8.94 8.28 7.22Z" clipRule="evenodd" />
          </svg>
          <div>
            <p className="text-sm font-medium text-red-800">Profile changes not approved</p>
            {draft.rejection_note && (
              <p className="text-xs text-red-600 mt-0.5">Admin note: {draft.rejection_note}</p>
            )}
            <p className="text-xs text-red-500 mt-1">Please update your profile and save again to resubmit for review.</p>
          </div>
        </div>
      )}

      {/* Identity card */}
      <div className="bg-white rounded-2xl border border-[#E4E7E4] p-6 mb-5 flex items-center gap-5">
        <div className="flex-shrink-0">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            title="Click to change photo"
            className="relative group w-16 h-16 rounded-full focus:outline-none focus:ring-2 focus:ring-[#445446]/40 focus:ring-offset-2"
          >
            {displayImage ? (
              <img src={displayImage} alt={user?.name} className="w-16 h-16 rounded-full object-cover border-2 border-[#E4E7E4]" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-[#445446] text-white flex items-center justify-center text-xl font-bold select-none">{initials}</div>
            )}
            <div className={`absolute inset-0 rounded-full flex items-center justify-center transition-all duration-150 ${uploading ? 'bg-black/40' : 'bg-black/0 group-hover:bg-black/40'}`}>
              {uploading ? (
                <div className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
              ) : (
                <svg className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-150" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
                </svg>
              )}
            </div>
          </button>
          <input ref={fileInputRef} type="file" accept="image/jpeg,image/jpg,image/png,image/webp" className="hidden" onChange={handleFileChange} />
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-[#1F2933] text-lg leading-tight flex items-center gap-1.5">{user?.name} <span className="inline-flex items-center px-1.5 py-px rounded text-[10px] font-medium leading-none bg-green-50 text-green-700 border border-green-200 align-middle">Public</span></h3>
          {form.position && <p className="text-sm text-[#445446] mt-0.5 font-medium">{form.position}</p>}
          <p className="text-sm text-gray-400 mt-0.5">{user?.email}</p>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {profile?.status === 'APPROVED' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" /></svg>
                Approved
              </span>
            )}
            {profile?.status === 'REJECTED' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-600">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM8.28 7.22a.75.75 0 0 0-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 1 0 1.06 1.06L10 11.06l1.72 1.72a.75.75 0 1 0 1.06-1.06L11.06 10l1.72-1.72a.75.75 0 0 0-1.06-1.06L10 8.94 8.28 7.22Z" clipRule="evenodd" /></svg>
                Rejected
              </span>
            )}
            {(!profile?.status || profile?.status === 'PENDING') && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 5Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" /></svg>
                Pending Approval
              </span>
            )}
            {memberSince && <span className="text-xs text-gray-400">Member since {memberSince}</span>}
          </div>
          <div className="mt-2">
            {imageError ? (
              <div className="flex items-start gap-1.5 px-2.5 py-2 bg-red-50 border border-red-200 rounded-lg">
                <svg className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-px" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
                </svg>
                <p className="text-xs text-red-600 flex-1 leading-snug">{imageError}</p>
                <button type="button" onClick={() => setImageError('')} className="text-red-400 hover:text-red-600 flex-shrink-0 ml-1">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                </button>
              </div>
            ) : uploading ? (
              <p className="text-xs text-[#445446] min-h-[1.25rem]">Uploading photo…</p>
            ) : (
              <p className="text-xs text-gray-400 min-h-[1.25rem]">Click your photo to change it · JPEG, PNG or WebP · max 5 MB · <span className="inline-flex items-center px-1.5 py-px rounded text-[10px] font-medium leading-none bg-green-50 text-green-700 border border-green-200 align-middle">Public</span></p>
            )}
          </div>
        </div>
      </div>

      {/* Profile details form */}
      <div className="bg-white rounded-2xl border border-[#E4E7E4] p-6">
        <h3 className="text-base font-semibold text-[#1F2933] mb-5">Profile Details</h3>

        <form onSubmit={handleSave} className="space-y-5">
          {/* Professional title */}
          <div>
            <label className="block text-sm font-medium text-[#1F2933] mb-1.5">Professional title <span className="inline-flex items-center px-1.5 py-px rounded text-[10px] font-medium leading-none bg-green-50 text-green-700 border border-green-200 align-middle">Public</span></label>
            <input
              type="text"
              name="position"
              value={form.position}
              onChange={handleChange}
              placeholder="e.g. Infant Feeding Specialist"
              className={inputClass}
            />
            <p className="mt-1 text-xs text-gray-400">Displayed below your name on your public profile.</p>
          </div>

          {/* Short summary */}
          <div>
            <label className="block text-sm font-medium text-[#1F2933] mb-1.5">Short summary <span className="inline-flex items-center px-1.5 py-px rounded text-[10px] font-medium leading-none bg-green-50 text-green-700 border border-green-200 align-middle">Public</span></label>
            <textarea
              name="summary"
              value={form.summary}
              onChange={handleChange}
              rows={2}
              maxLength={SUMMARY_MAX}
              placeholder="A 1–2 sentence description shown at the top of your public profile…"
              className={`${inputClass} resize-none`}
            />
            <p className={`mt-1 text-xs text-right ${form.summary.length > SUMMARY_MAX - 20 ? 'text-amber-500' : 'text-gray-400'}`}>
              {form.summary.length} / {SUMMARY_MAX}
            </p>
          </div>

          {/* Full bio */}
          <div>
            <label className="block text-sm font-medium text-[#1F2933] mb-1.5">Full bio <span className="inline-flex items-center px-1.5 py-px rounded text-[10px] font-medium leading-none bg-green-50 text-green-700 border border-green-200 align-middle">Public</span></label>
            <textarea
              name="bio"
              value={form.bio}
              onChange={handleChange}
              rows={4}
              placeholder="Tell parents about your background, experience and approach…"
              className={`${inputClass} resize-none ${form.bio.length > BIO_MAX ? 'border-red-400 focus:border-red-400 focus:ring-red-200/50' : ''}`}
            />
            <p className={`mt-1 text-xs text-right font-medium ${form.bio.length > BIO_MAX ? 'text-red-500' : form.bio.length > BIO_MAX - 70 ? 'text-amber-500' : 'text-gray-400'}`}>
              {form.bio.length} / {BIO_MAX}
            </p>
          </div>

          {/* Session format */}
          <div>
            <label className="block text-sm font-medium text-[#1F2933] mb-1.5">Session format <span className="inline-flex items-center px-1.5 py-px rounded text-[10px] font-medium leading-none bg-green-50 text-green-700 border border-green-200 align-middle">Public</span></label>
            <select name="session_format" value={form.session_format} onChange={handleChange} className={inputClass}>
              <option value="">Select format…</option>
              {SESSION_FORMAT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-400">Controls which booking buttons appear on your profile page.</p>
          </div>

          {/* Address — only for in-person */}
          {showAddress && (
            <div className="space-y-3 p-4 bg-[#F5F7F5] rounded-xl border border-[#E4E7E4]">
              <p className="text-xs font-medium text-[#1F2933] flex items-center gap-1.5">Practice address <span className="inline-flex items-center px-1.5 py-px rounded text-[10px] font-medium leading-none bg-green-50 text-green-700 border border-green-200 align-middle">Public</span></p>
              <input
                type="text"
                name="address_street"
                value={form.address_street}
                onChange={handleChange}
                placeholder="Street address"
                className={inputClass}
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  name="address_city"
                  value={form.address_city}
                  onChange={handleChange}
                  placeholder="City"
                  className={inputClass}
                />
                <input
                  type="text"
                  name="address_postcode"
                  value={form.address_postcode}
                  onChange={handleChange}
                  placeholder="Postcode"
                  className={inputClass}
                />
              </div>
              <p className="text-xs text-gray-400">Shown to parents on your public profile page.</p>
            </div>
          )}

          {/* Timezone */}
          <div>
            <label className="block text-sm font-medium text-[#1F2933] mb-1.5">Timezone <span className="inline-flex items-center px-1.5 py-px rounded text-[10px] font-medium leading-none bg-green-50 text-green-700 border border-green-200 align-middle">Public</span></label>
            <select name="timezone" value={form.timezone} onChange={handleChange} className={inputClass}>
              {TIMEZONES.map((tz) => (
                <option key={tz.value} value={tz.value}>{tz.label}</option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-400">Used to display your availability slots correctly.</p>
          </div>

          {/* Languages */}
          <div>
            <label className="block text-sm font-medium text-[#1F2933] mb-2">Languages spoken <span className="inline-flex items-center px-1.5 py-px rounded text-[10px] font-medium leading-none bg-green-50 text-green-700 border border-green-200 align-middle">Public</span></label>
            <div className="flex flex-wrap gap-2">
              {LANGUAGES.map((lang) => (
                <LangChip
                  key={lang}
                  label={lang}
                  selected={form.languages.includes(lang)}
                  onToggle={() => handleLanguageToggle(lang)}
                />
              ))}
            </div>

            {/* Admin-approved custom languages (in form.languages but not in predefined LANGUAGES list) */}
            {form.languages.filter((l) => !LANGUAGES.includes(l)).length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {form.languages.filter((l) => !LANGUAGES.includes(l)).map((lang) => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => handleLanguageToggle(lang)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-[#445446] text-white border border-[#445446] transition-all duration-150"
                  >
                    {lang}
                    <span className="inline-flex items-center px-1.5 py-px rounded text-[10px] font-medium leading-none bg-white/20 text-white">Approved</span>
                  </button>
                ))}
              </div>
            )}

            {/* Pending (custom) languages */}
            {form.pending_languages.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {form.pending_languages.map((lang) => (
                  <span key={lang} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-amber-50 border border-amber-200 text-amber-700">
                    {lang}
                    <span className="text-[10px] font-normal opacity-75">· pending review</span>
                    <button type="button" onClick={() => handleRemovePendingLanguage(lang)} className="ml-0.5 hover:text-amber-900 transition-colors">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Add custom language */}
            <div className="flex items-center gap-2 mt-3">
              <input
                type="text"
                value={customLangInput}
                onChange={(e) => setCustomLangInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddCustomLanguage(); } }}
                placeholder="Add a language not in the list…"
                className="flex-1 px-3 py-2 rounded-lg border border-[#E4E7E4] text-sm text-[#1F2933] placeholder-gray-400 bg-white focus:outline-none focus:ring-2 focus:ring-[#445446]/30 focus:border-[#445446] transition"
              />
              <button
                type="button"
                onClick={handleAddCustomLanguage}
                disabled={!customLangInput.trim()}
                className="flex-shrink-0 text-sm font-medium text-[#445446] border border-[#445446]/30 hover:bg-[#445446]/5 disabled:opacity-40 disabled:cursor-not-allowed px-3 py-2 rounded-lg transition-colors"
              >
                Add
              </button>
            </div>
            <p className="mt-1.5 text-xs text-gray-400">Custom languages are reviewed by an admin before appearing publicly.</p>
          </div>

          {/* Social Media */}
          <div>
            <label className="block text-sm font-medium text-[#1F2933] mb-1">Social Media <span className="inline-flex items-center px-1.5 py-px rounded text-[10px] font-medium leading-none bg-green-50 text-green-700 border border-green-200 align-middle">Public</span></label>
            <p className="text-xs text-gray-400 mb-3">All fields are optional. Links will appear on your public profile.</p>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="flex-shrink-0 w-8 flex justify-center">
                  <svg className="w-5 h-5 text-[#E1306C]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                </span>
                <input
                  type="url"
                  name="instagram"
                  value={form.instagram}
                  onChange={handleChange}
                  placeholder="https://instagram.com/username"
                  className={inputClass}
                />
              </div>
              <div className="flex items-center gap-3">
                <span className="flex-shrink-0 w-8 flex justify-center">
                  <svg className="w-5 h-5 text-[#1877F2]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </span>
                <input
                  type="url"
                  name="facebook"
                  value={form.facebook}
                  onChange={handleChange}
                  placeholder="https://facebook.com/yourpage"
                  className={inputClass}
                />
              </div>
              <div className="flex items-center gap-3">
                <span className="flex-shrink-0 w-8 flex justify-center">
                  <svg className="w-5 h-5 text-[#0A66C2]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                </span>
                <input
                  type="url"
                  name="linkedin"
                  value={form.linkedin}
                  onChange={handleChange}
                  placeholder="https://linkedin.com/in/yourprofile"
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{error}</div>
          )}
          {savedAsDraft && (
            <div className="px-4 py-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
              <svg className="w-4 h-4 text-amber-500 flex-shrink-0 mt-px" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 5Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="text-sm font-medium text-amber-800">Changes submitted for review.</p>
                <p className="text-xs text-amber-600 mt-0.5">Your live profile is unchanged. An admin will review your edits before they go public.</p>
              </div>
            </div>
          )}
          {success && (
            <div className="px-4 py-3.5 bg-green-50 border border-green-200 rounded-xl flex items-start gap-3">
              <svg className="w-4 h-4 text-green-600 flex-shrink-0 mt-px" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="text-sm font-medium text-green-800">Profile saved successfully.</p>
                <p className="text-xs text-green-600 mt-0.5">Your changes are live. You can come back and edit your profile at any time.</p>
              </div>
            </div>
          )}

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 bg-[#445446] hover:bg-[#3F4E41] disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium py-2.5 px-6 rounded-lg transition-colors duration-200 text-sm"
            >
              {saving && <div className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />}
              {saving ? 'Saving…' : 'Save Profile'}
            </button>
          </div>
        </form>
      </div>

      {/* Sub-cards — rendered only after profile is loaded */}
      {initQuals        !== null      && <QualificationsCard initialData={initQuals} />}
      {initCerts        !== null      && <CertificationsCard initialData={initCerts} />}
      {initBusinessInfo !== undefined && <BusinessInfoCard   initialData={initBusinessInfo} />}
      {initInsurance    !== undefined && <InsuranceCard      initialData={initInsurance} />}

      {/* GDPR Data Export */}
      <div className="bg-white rounded-2xl border border-[#E4E7E4] p-6 mt-5">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-[#445446]/8 flex items-center justify-center">
            <svg className="w-5 h-5 text-[#445446]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-[#1F2933]">Your Data</h3>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">
              Download a copy of all personal and professional data Sage Nest holds about you — including your profile, services, bookings, and business information. Provided under GDPR Article 20 (right to data portability).
            </p>
            <button
              type="button"
              onClick={handleExport}
              disabled={exporting}
              className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[#445446]/30 bg-[#445446]/5 text-[#445446] text-sm font-medium hover:bg-[#445446]/10 disabled:opacity-60 disabled:cursor-not-allowed transition-colors duration-150"
            >
              {exporting ? (
                <>
                  <div className="w-3.5 h-3.5 rounded-full border-2 border-[#445446] border-t-transparent animate-spin" />
                  Preparing download…
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                  </svg>
                  Download my data
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileSection;
