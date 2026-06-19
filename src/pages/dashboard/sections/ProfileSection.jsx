import { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../context/AuthContext';
import {
  useGetMyProfileQuery,
  useGetMyProfileDraftQuery,
  useUpdateMyProfileMutation,
  useUploadProfileImageMutation,
  useLazyExportMyDataQuery,
} from '../../../api/expertApi';
import { getProfileImageUrl } from '../../../utils/imageUrl';
import { useCreateConnectLinkMutation, useVerifyStripeReturnQuery } from '../../../api/stripeApi';
import QualificationsCard from '../profile/QualificationsCard';
import CertificationsCard from '../profile/CertificationsCard';
import BusinessInfoCard from '../profile/BusinessInfoCard';
import InsuranceCard from '../profile/InsuranceCard';

// ─── Constants ────────────────────────────────────────────────────────────────
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_IMG_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

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
  const { t } = useTranslation('expertDashboard');
  if (status === 'checking') {
    return (
      <div className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[#c5ceba] text-sm text-gray-400 bg-white">
        <div className="w-3.5 h-3.5 rounded-full border-2 border-gray-300 border-t-transparent animate-spin" />
        {t('profile.stripe.checking')}
      </div>
    );
  }
  if (status === 'connected') {
    return (
      <div className="flex items-center gap-2 px-4 py-2 rounded-lg border border-green-200 bg-green-50 text-sm font-medium text-green-700">
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" />
        </svg>
        {t('profile.stripe.connected')}
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
          {t('profile.stripe.connecting')}
        </>
      ) : (
        <>
          <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
            <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z"/>
          </svg>
          {isIncomplete ? t('profile.stripe.incomplete') : t('profile.stripe.connect')}
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
const SESSION_FORMAT_OPTIONS = [
  { value: 'ONLINE',    label: 'Online only' },
  { value: 'IN_PERSON', label: 'In-person only' },
  { value: 'BOTH',      label: 'Both online and in-person' },
];

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
  const { t, i18n } = useTranslation('expertDashboard');
  const lng = i18n.language;
  const [searchParams, setSearchParams] = useSearchParams();
  const fileInputRef = useRef(null);
  const formSeeded = useRef(false);

  const [form, setForm]                 = useState(EMPTY_FORM);
  const [imageUrl, setImageUrl]         = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [customLangInput, setCustomLangInput] = useState('');
  const [savedAsDraft, setSavedAsDraft] = useState(false);
  const [stripeConnecting, setStripeConnecting] = useState(false);

  const { data: profile, isLoading: loading } = useGetMyProfileQuery();
  const { data: draft } = useGetMyProfileDraftQuery();
  const [updateMyProfile, { isLoading: saving }] = useUpdateMyProfileMutation();
  const [uploadProfileImage, { isLoading: uploading }] = useUploadProfileImageMutation();
  const [triggerExport, { isFetching: exporting }] = useLazyExportMyDataQuery();
  const [createConnectLink] = useCreateConnectLinkMutation();

  const hasStripeAccount = !!profile?.stripe_account_id;
  const { data: stripeVerify, isFetching: checkingStripe } = useVerifyStripeReturnQuery(
    undefined,
    { skip: !hasStripeAccount },
  );

  const stripeStatus = (() => {
    if (stripeConnecting) return 'connecting';
    if (!hasStripeAccount) return loading ? 'idle' : 'not_connected';
    if (checkingStripe) return 'checking';
    return stripeVerify?.onboarding_complete ? 'connected' : 'incomplete';
  })();

  // Seed form once when profile loads
  useEffect(() => {
    if (!profile || formSeeded.current) return;
    formSeeded.current = true;
    setForm({
      bio:              profile.bio              || '',
      expertise:        profile.expertise        || '',
      summary:          profile.summary          || '',
      position:         profile.position         || '',
      session_format:   profile.session_format   || '',
      timezone:         profile.timezone         || 'Europe/Rome',
      address_street:   profile.address_street   || '',
      address_city:     profile.address_city     || '',
      address_postcode: profile.address_postcode || '',
      languages:         Array.isArray(profile.languages)         ? profile.languages         : [],
      pending_languages: Array.isArray(profile.pending_languages) ? profile.pending_languages : [],
      instagram:        profile.instagram || '',
      facebook:         profile.facebook  || '',
      linkedin:         profile.linkedin  || '',
    });
    setImageUrl(getProfileImageUrl(profile.profile_image));
  }, [profile]);

  useEffect(() => {
    if (!savedAsDraft) return;
    const timer = setTimeout(() => setSavedAsDraft(false), 5000);
    return () => clearTimeout(timer);
  }, [savedAsDraft]);

  useEffect(() => {
    if (searchParams.get('stripe') === 'success') {
      toast.success(t('profile.stripeSuccess.title'));
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleLanguageToggle = (lang) => {
    setForm((f) => ({
      ...f,
      languages: f.languages.includes(lang)
        ? f.languages.filter((l) => l !== lang)
        : [...f.languages, lang],
    }));
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
  };

  const handleRemovePendingLanguage = (lang) => {
    setForm((f) => ({ ...f, pending_languages: f.pending_languages.filter((l) => l !== lang) }));
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!ALLOWED_IMG_TYPES.includes(file.type)) {
      toast.error(t('profile.photo.typeError')); return;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error(t('profile.photo.sizeError', { size: (file.size / 1024 / 1024).toFixed(1) })); return;
    }
    const localUrl = URL.createObjectURL(file);
    setImagePreview(localUrl);
    try {
      const result = await uploadProfileImage(file).unwrap();
      setImageUrl(getProfileImageUrl(result.profile_image));
    } catch (err) {
      toast.error(err?.data?.error || t('profile.photo.uploadError'));
      setImagePreview(null);
    } finally {
      URL.revokeObjectURL(localUrl);
      setImagePreview(null);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (form.bio.length > BIO_MAX) {
      toast.error(t('profile.validation.bioTooLong', { max: BIO_MAX })); return;
    }
    if (form.summary.length > SUMMARY_MAX) {
      toast.error(t('profile.validation.summaryTooLong', { max: SUMMARY_MAX })); return;
    }
    if (!form.address_street?.trim()) {
      toast.error(t('profile.validation.streetRequired')); return;
    }
    if (!form.address_city?.trim()) {
      toast.error(t('profile.validation.cityRequired')); return;
    }
    if (!form.address_postcode?.trim()) {
      toast.error(t('profile.validation.postcodeRequired')); return;
    }
    if (!form.session_format) {
      toast.error(t('profile.validation.formatRequired', { defaultValue: 'Please select how you deliver your sessions.' })); return;
    }
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
      }).unwrap();
      if (result?.draft) {
        setSavedAsDraft(true);
      } else {
        toast.success(t('profile.saveSuccess.title'));
      }
    } catch (err) {
      toast.error(err?.data?.error || t('profile.validation.saveFailed'));
    }
  };

  const handleExport = async () => {
    try {
      const data = await triggerExport().unwrap();
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
    }
  };

  const handleConnectStripe = async () => {
    setStripeConnecting(true);
    try {
      const data = await createConnectLink().unwrap();
      window.location.href = data.url;
    } catch (err) {
      toast.error(err?.data?.error || 'Could not connect to Stripe. Please try again.');
      setStripeConnecting(false);
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
    ? new Date(profile.user.created_at).toLocaleDateString(
        lng === 'it' ? 'it-IT' : 'en-US',
        { month: 'long', year: 'numeric' }
      )
    : null;
  const displayImage = imagePreview || imageUrl;
  const showAddress  = true;
  const inputClass   = 'w-full px-4 py-3 rounded-lg border border-[#c5ceba] text-sm text-[#1F2933] placeholder-gray-400 bg-white transition focus:outline-none focus:ring-2 focus:ring-[#445446]/30 focus:border-[#445446]';

  const PublicBadge = () => (
    <span className="inline-flex items-center px-1.5 py-px rounded text-[10px] font-medium leading-none bg-green-50 text-green-700 border border-green-200 align-middle">
      {t('profile.publicBadge')}
    </span>
  );

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-[#445446]">{t('profile.heading')}</h2>
          <p className="text-sm text-[#5e6d5b] font-medium mt-1">{t('profile.subheading')}</p>
        </div>
        {stripeStatus !== 'idle' && (
          <div className="flex-shrink-0 mt-0.5 flex flex-col items-end gap-1">
            <StripeButton status={stripeStatus} onConnect={handleConnectStripe} />
          </div>
        )}
      </div>

      {/* Pending draft banner */}
      {draft?.status === 'PENDING_REVIEW' && !savedAsDraft && (
        <div className="mb-5 flex items-start gap-3 px-4 py-3.5 bg-amber-50 border border-amber-200 rounded-xl">
          <svg className="w-5 h-5 text-amber-500 flex-shrink-0 mt-px" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 5Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
          </svg>
          <div>
            <p className="text-sm font-medium text-amber-800">{t('profile.pendingDraft.title')}</p>
            <p className="text-xs text-amber-600 mt-0.5">{t('profile.pendingDraft.body')}</p>
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
            <p className="text-sm font-medium text-red-800">{t('profile.rejectedDraft.title')}</p>
            {draft.rejection_note && (
              <p className="text-xs text-red-600 mt-0.5">{t('profile.rejectedDraft.adminNote')}{draft.rejection_note}</p>
            )}
            <p className="text-xs text-red-500 mt-1">{t('profile.rejectedDraft.body')}</p>
          </div>
        </div>
      )}

      {/* Identity card */}
      <div className="bg-white rounded-2xl border-2 border-[#c5ceba] p-6 mb-5 flex items-center gap-5">
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
          <h3 className="font-semibold text-[#1F2933] text-lg leading-tight flex items-center gap-1.5">{user?.name} <PublicBadge /></h3>
          {form.position && <p className="text-sm text-[#445446] mt-0.5 font-medium">{form.position}</p>}
          <p className="text-sm text-gray-400 mt-0.5">{user?.email}</p>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {profile?.status === 'APPROVED' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" /></svg>
                {t('profile.identityCard.statusApproved')}
              </span>
            )}
            {profile?.status === 'REJECTED' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-600">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM8.28 7.22a.75.75 0 0 0-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 1 0 1.06 1.06L10 11.06l1.72 1.72a.75.75 0 1 0 1.06-1.06L11.06 10l1.72-1.72a.75.75 0 0 0-1.06-1.06L10 8.94 8.28 7.22Z" clipRule="evenodd" /></svg>
                {t('profile.identityCard.statusRejected')}
              </span>
            )}
            {(!profile?.status || profile?.status === 'PENDING') && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 5Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" /></svg>
                {t('profile.identityCard.statusPending')}
              </span>
            )}
            {memberSince && (
              <span className="text-xs text-gray-400">
                {t('profile.identityCard.memberSince', { date: memberSince })}
              </span>
            )}
          </div>
          <div className="mt-2">
            {uploading ? (
              <p className="text-xs text-[#445446] min-h-[1.25rem]">{t('profile.photo.uploading')}</p>
            ) : (
              <p className="text-xs text-gray-400 min-h-[1.25rem]">{t('profile.photo.hint')} <PublicBadge /></p>
            )}
          </div>
        </div>
      </div>

      {/* Profile details form */}
      <div className="bg-white rounded-2xl border-2 border-[#c5ceba] p-6">
        <h3 className="text-base font-semibold text-[#1F2933] mb-5">{t('profile.details.title')}</h3>

        <form onSubmit={handleSave} className="space-y-5">
          {/* Professional title */}
          <div>
            <label className="block text-sm font-medium text-[#1F2933] mb-1.5">{t('profile.details.positionLabel')} <PublicBadge /></label>
            <input
              type="text"
              name="position"
              value={form.position}
              onChange={handleChange}
              placeholder={t('profile.details.positionPlaceholder')}
              className={inputClass}
            />
            <p className="mt-1 text-xs text-gray-400">{t('profile.details.positionHint')}</p>
          </div>

          {/* Short summary */}
          <div>
            <label className="block text-sm font-medium text-[#1F2933] mb-1.5">{t('profile.details.summaryLabel')} <PublicBadge /></label>
            <textarea
              name="summary"
              value={form.summary}
              onChange={handleChange}
              rows={2}
              maxLength={SUMMARY_MAX}
              placeholder={t('profile.details.summaryPlaceholder')}
              className={`${inputClass} resize-none`}
            />
            <p className={`mt-1 text-xs text-right ${form.summary.length > SUMMARY_MAX - 20 ? 'text-amber-500' : 'text-gray-400'}`}>
              {form.summary.length} / {SUMMARY_MAX}
            </p>
          </div>

          {/* Full bio */}
          <div>
            <label className="block text-sm font-medium text-[#1F2933] mb-1.5">{t('profile.details.bioLabel')} <PublicBadge /></label>
            <textarea
              name="bio"
              value={form.bio}
              onChange={handleChange}
              rows={4}
              placeholder={t('profile.details.bioPlaceholder')}
              className={`${inputClass} resize-none ${form.bio.length > BIO_MAX ? 'border-red-400 focus:border-red-400 focus:ring-red-200/50' : ''}`}
            />
            <p className={`mt-1 text-xs text-right font-medium ${form.bio.length > BIO_MAX ? 'text-red-500' : form.bio.length > BIO_MAX - 70 ? 'text-amber-500' : 'text-gray-400'}`}>
              {form.bio.length} / {BIO_MAX}
            </p>
          </div>

          {/* Session format */}
          <div>
            <label className="block text-sm font-medium text-[#1F2933] mb-2">
              How do you deliver your sessions? <span className="text-red-400">*</span> <PublicBadge />
            </label>
            <div className="flex flex-col gap-2">
              {SESSION_FORMAT_OPTIONS.map((opt) => (
                <label key={opt.value} className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all duration-150 ${
                  form.session_format === opt.value
                    ? 'border-[#445446] bg-[#445446]/5 text-[#1F2933]'
                    : 'border-[#E4E7E4] bg-white text-gray-600 hover:border-[#445446]/40'
                }`}>
                  <input
                    type="radio"
                    name="session_format"
                    value={opt.value}
                    checked={form.session_format === opt.value}
                    onChange={handleChange}
                    className="accent-[#445446]"
                  />
                  <span className="text-sm font-medium">{opt.label}</span>
                </label>
              ))}
            </div>
            <p className="mt-1.5 text-xs text-gray-400">
              This controls the format options available when creating services and the filter shown on the expert directory.
            </p>
          </div>

          {/* Address */}
          {showAddress && (
            <div className="space-y-3 p-4 bg-[#dfe2d7]/30 rounded-2xl border-2 border-[#c5ceba]">
              <p className="text-xs font-medium text-[#1F2933] flex items-center gap-1.5">{t('profile.details.addressLabel')} <PublicBadge /></p>
              <input
                type="text"
                name="address_street"
                value={form.address_street}
                onChange={handleChange}
                placeholder={t('profile.details.streetPlaceholder')}
                className={inputClass}
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  name="address_city"
                  value={form.address_city}
                  onChange={handleChange}
                  placeholder={t('profile.details.cityPlaceholder')}
                  className={inputClass}
                />
                <input
                  type="text"
                  name="address_postcode"
                  value={form.address_postcode}
                  onChange={handleChange}
                  placeholder={t('profile.details.postcodePlaceholder')}
                  className={inputClass}
                />
              </div>
              <p className="text-xs text-gray-400">{t('profile.details.addressHint')}</p>
            </div>
          )}

          {/* Timezone */}
          <div>
            <label className="block text-sm font-medium text-[#1F2933] mb-1.5">{t('profile.details.timezoneLabel')} <PublicBadge /></label>
            <select name="timezone" value={form.timezone} onChange={handleChange} className={inputClass}>
              {TIMEZONES.map((tz) => (
                <option key={tz.value} value={tz.value}>{tz.label}</option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-400">{t('profile.details.timezoneHint')}</p>
          </div>

          {/* Languages */}
          <div>
            <label className="block text-sm font-medium text-[#1F2933] mb-2">{t('profile.details.languagesLabel')} <PublicBadge /></label>
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

            {/* Admin-approved custom languages */}
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
                    <span className="inline-flex items-center px-1.5 py-px rounded text-[10px] font-medium leading-none bg-white/20 text-white">
                      {t('profile.details.languageApproved')}
                    </span>
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
                    <span className="text-[10px] font-normal opacity-75">{t('profile.details.languagePendingReview')}</span>
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
                placeholder={t('profile.details.languagePlaceholder')}
                className="flex-1 px-3 py-2 rounded-lg border border-[#c5ceba] text-sm text-[#1F2933] placeholder-gray-400 bg-white focus:outline-none focus:ring-2 focus:ring-[#445446]/30 focus:border-[#445446] transition"
              />
              <button
                type="button"
                onClick={handleAddCustomLanguage}
                disabled={!customLangInput.trim()}
                className="flex-shrink-0 text-sm font-medium text-[#445446] border border-[#445446]/30 hover:bg-[#445446]/5 disabled:opacity-40 disabled:cursor-not-allowed px-3 py-2 rounded-lg transition-colors"
              >
                {t('profile.details.languageAddBtn')}
              </button>
            </div>
            <p className="mt-1.5 text-xs text-gray-400">{t('profile.details.languageHint')}</p>
          </div>

          {/* Social Media */}
          <div>
            <label className="block text-sm font-medium text-[#1F2933] mb-1">{t('profile.details.socialLabel')} <PublicBadge /></label>
            <p className="text-xs text-gray-400 mb-3">{t('profile.details.socialHint')}</p>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="flex-shrink-0 w-8 flex justify-center">
                  <svg className="w-5 h-5 text-[#E1306C]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                </span>
                <input type="url" name="instagram" value={form.instagram} onChange={handleChange} placeholder="https://instagram.com/username" className={inputClass} />
              </div>
              <div className="flex items-center gap-3">
                <span className="flex-shrink-0 w-8 flex justify-center">
                  <svg className="w-5 h-5 text-[#1877F2]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </span>
                <input type="url" name="facebook" value={form.facebook} onChange={handleChange} placeholder="https://facebook.com/yourpage" className={inputClass} />
              </div>
              <div className="flex items-center gap-3">
                <span className="flex-shrink-0 w-8 flex justify-center">
                  <svg className="w-5 h-5 text-[#0A66C2]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                </span>
                <input type="url" name="linkedin" value={form.linkedin} onChange={handleChange} placeholder="https://linkedin.com/in/yourprofile" className={inputClass} />
              </div>
            </div>
          </div>

          {savedAsDraft && (
            <div className="px-4 py-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
              <svg className="w-4 h-4 text-amber-500 flex-shrink-0 mt-px" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 5Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
              </svg>
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-800">{t('profile.savedAsDraft.title')}</p>
                <p className="text-xs text-amber-600 mt-0.5">{t('profile.savedAsDraft.body')}</p>
              </div>
              <button type="button" onClick={() => setSavedAsDraft(false)} className="p-0.5 text-amber-400 hover:text-amber-600 transition-colors flex-shrink-0">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
              </button>
            </div>
          )}
          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 bg-[#445446] hover:bg-[#3F4E41] disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium py-2.5 px-6 rounded-lg transition-colors duration-200 text-sm"
            >
              {saving && <div className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />}
              {saving ? t('profile.details.savingBtn') : t('profile.details.saveBtn')}
            </button>
          </div>
        </form>
      </div>

      {/* Sub-cards — rendered only after profile is loaded */}
      {profile && <QualificationsCard initialData={profile.qualifications || []} />}
      {profile && <CertificationsCard initialData={profile.certifications || []} />}
      {profile && <BusinessInfoCard   initialData={profile.business_info || null} />}
      {profile && <InsuranceCard      initialData={profile.insurance || null} />}

      {/* GDPR Data Export */}
      <div className="bg-white rounded-2xl border-2 border-[#c5ceba] p-6 mt-5">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-[#445446]/8 flex items-center justify-center">
            <svg className="w-5 h-5 text-[#445446]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-[#1F2933]">{t('profile.gdpr.title')}</h3>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">{t('profile.gdpr.body')}</p>
            <button
              type="button"
              onClick={handleExport}
              disabled={exporting}
              className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[#445446]/30 bg-[#445446]/5 text-[#445446] text-sm font-medium hover:bg-[#445446]/10 disabled:opacity-60 disabled:cursor-not-allowed transition-colors duration-150"
            >
              {exporting ? (
                <>
                  <div className="w-3.5 h-3.5 rounded-full border-2 border-[#445446] border-t-transparent animate-spin" />
                  {t('profile.gdpr.preparing')}
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                  </svg>
                  {t('profile.gdpr.downloadBtn')}
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
