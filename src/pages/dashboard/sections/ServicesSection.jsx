import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import {
  useListServicesQuery,
  useCreateServiceMutation,
  useUpdateServiceMutation,
  useDeleteServiceMutation,
  useReorderServicesMutation,
  useGetMyProfileQuery,
} from '../../../api/expertApi';
import ConfirmModal from '../../../components/ConfirmModal';
import {
  EditIcon, TrashIcon, PowerIcon, ChevronUpIcon, ChevronDownIcon, CopyIcon,
} from '../../../assets/icons';
import {
  countryKeyFromIso, isHomeVisitCountrySupported,
  getRegions, getSubregions, getSubLevel, formatArea, isValidArea,
} from '../../../data/homeVisitAreas';

const FORMAT_OPTIONS  = [
  { value: 'ONLINE' },
  { value: 'IN_PERSON' },
  { value: 'HOME_VISIT' },
];
// Display labels only — which currency actually applies to an expert is
// locked server-side to their account currency (see profile.currency), not
// chosen here.
const CURRENCY_LABELS = {
  EUR: 'EUR (€)',
  GBP: 'GBP (£)',
  DKK: 'DKK (kr)',
  SEK: 'SEK (kr)',
  NOK: 'NOK (kr)',
  CHF: 'CHF (Fr)',
};
const PRICE_LIMITS = {
  EUR: { min: 5,   max: 2000  },
  GBP: { min: 5,   max: 2000  },
  DKK: { min: 50,  max: 10000 },
  SEK: { min: 50,  max: 20000 },
  NOK: { min: 50,  max: 20000 },
  CHF: { min: 5,   max: 2000  },
};

function formatPrice(price, currency = 'EUR', lng = 'en') {
  return new Intl.NumberFormat(lng === 'it' ? 'it' : 'en', { style: 'currency', currency }).format(Number(price));
}
const CLUSTER_OPTIONS = [
  { value: 'FOR_PARENTS' },
  { value: 'FOR_BABY' },
  { value: 'FOR_FAMILY' },
  { value: 'PACKAGE' },
];

const FORMAT_BADGE_CLS = {
  ONLINE:     'bg-blue-100 text-blue-700',
  IN_PERSON:  'bg-purple-100 text-purple-700',
  HOME_VISIT: 'bg-amber-100 text-amber-700',
};
const CLUSTER_BADGE_CLS = {
  FOR_PARENTS: 'bg-pink-100 text-pink-700',
  FOR_BABY:    'bg-cyan-100 text-cyan-700',
  FOR_FAMILY:  'bg-teal-100 text-teal-700',
  PACKAGE:     'bg-amber-100 text-amber-700',
  GIFT:        'bg-green-100 text-green-700',
  EVENT:       'bg-violet-100 text-violet-700',
};

const EMPTY_FORM = {
  title: '', description: '',
  duration_minutes: '', price: '', currency: 'EUR',
  format: '', cluster: '', home_visit_areas: [],
};

const Spinner = ({ className = 'w-4 h-4' }) => (
  <div className={`${className} rounded-full border-2 border-current border-t-transparent animate-spin`} />
);

// Merges a pending edit draft's proposed content over a service's live
// values — used so editing a service that already has changes awaiting
// review starts from the current proposal rather than the stale live copy.
function withDraft(svc) {
  const d = svc.draft;
  if (!d) return svc;
  return {
    ...svc,
    title:            d.title            ?? svc.title,
    description:      d.description      ?? svc.description,
    duration_minutes: d.duration_minutes ?? svc.duration_minutes,
    price:            d.price            ?? svc.price,
    format:           d.format           ?? svc.format,
    cluster:          d.cluster          ?? svc.cluster,
    home_visit_areas: d.home_visit_areas?.length ? d.home_visit_areas : svc.home_visit_areas,
  };
}

// ─── Component ────────────────────────────────────────────────────────────────
const ServicesSection = () => {
  const { t, i18n } = useTranslation('expertDashboard');
  const lng = i18n.language;

  const { data: serverServices = [], isLoading: loading, isError: servicesIsError } = useListServicesQuery();
  const { data: profile } = useGetMyProfileQuery();
  const [createService, { isLoading: creating }]    = useCreateServiceMutation();
  const [updateService, { isLoading: updating }]    = useUpdateServiceMutation();
  const [deleteService]    = useDeleteServiceMutation();
  const [reorderServices, { isLoading: reordering }] = useReorderServicesMutation();

  const [localOrder, setLocalOrder] = useState(null); // optimistic reorder override
  const services = localOrder ?? serverServices;

  const sessionFormat = profile?.session_format || null;
  // Currency is anchored to the expert's confirmed Stripe account currency —
  // never a per-service choice. Until Stripe has reported one (right after
  // onboarding, via a webhook), it's null and services can't be added.
  const expertCurrency = profile?.currency || null;
  const currencyConfirmed = !!expertCurrency;

  // Home-visit coverage areas are picked from a fixed region → province/landsdel/county
  // dataset scoped to the expert's practice-address country. Home visit is only
  // offered where that dataset exists (currently Italy, Denmark, and the UK).
  const practiceCountry   = profile?.address_country || null;
  const homeVisitSupported = isHomeVisitCountrySupported(practiceCountry);
  const countryKey        = countryKeyFromIso(practiceCountry);
  const homeVisitSubLevel = getSubLevel(countryKey); // 'province' | 'landsdel' | 'county' | null
  const regionOptions     = getRegions(countryKey);

  const [showForm, setShowForm]       = useState(false);
  const [editingId, setEditingId]     = useState(null);
  const [form, setForm]               = useState(EMPTY_FORM);
  const [formErrors, setFormErrors]   = useState({});
  // Currency the service was actually saved under, captured when opening
  // edit/duplicate — used to detect and explain a currency mismatch (e.g.
  // after the expert's Stripe account currency changed and this service was
  // unpublished pending reconfirmation).
  const [originalCurrency, setOriginalCurrency] = useState(null);

  const [isDuplicating, setIsDuplicating] = useState(false);
  // Working state for the two-step area picker (not part of `form` — only the
  // committed "Region — Sub" pairs in form.home_visit_areas are).
  const [regionSelect, setRegionSelect]       = useState('');
  const [subregionSelect, setSubregionSelect] = useState('');

  const [deletingId, setDeletingId]     = useState(null);
  const [togglingId, setTogglingId]     = useState(null);
  const [deleteModal, setDeleteModal]   = useState({ open: false, id: null });

  // "In Review" default: a new expert's first-ever service always starts
  // there, so it's the more useful landing tab.
  const [activeTab, setActiveTab]       = useState('inReview');
  const [savedAsDraft, setSavedAsDraft] = useState(false);

  useEffect(() => {
    if (!savedAsDraft) return;
    const timer = setTimeout(() => setSavedAsDraft(false), 5000);
    return () => clearTimeout(timer);
  }, [savedAsDraft]);

  const formLoading = editingId ? updating : creating;
  const isReordering = reordering;

  // Approved tab: everything currently live/approved (a service here may
  // still carry a pending edit draft — shown as a "Changes pending" chip,
  // not moved out of this list, since it's still the bookable version).
  // In Review tab: services that have never been approved yet (or were
  // rejected), plus a lightweight summary card for each approved service
  // that has a pending edit draft.
  const approvedServices = services.filter((s) => s.review_status === 'APPROVED');
  const needsFirstReview = services.filter((s) => s.review_status === 'PENDING_REVIEW' || s.review_status === 'REJECTED');
  const pendingEditDrafts = services.filter((s) => s.review_status === 'APPROVED' && s.draft?.status === 'PENDING_REVIEW');

  // Derives the locked format value when the expert has a single-mode
  // session_format. Anything other than BOTH locks the dropdown to that mode,
  // so a new mode is covered automatically rather than falling through to null.
  const lockedFormat = sessionFormat && sessionFormat !== 'BOTH' ? sessionFormat : null;

  // ── Helpers ───────────────────────────────────────────────────────────────
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    setFormErrors((fe) => ({ ...fe, [name]: '' }));
  };

  const subregionOptions = getSubregions(countryKey, regionSelect);

  const addAreaPair = () => {
    if (!regionSelect || !subregionSelect) return;
    const value = formatArea(regionSelect, subregionSelect);
    setForm((f) => (
      f.home_visit_areas.includes(value)
        ? f
        : { ...f, home_visit_areas: [...f.home_visit_areas, value] }
    ));
    setSubregionSelect('');
    setFormErrors((fe) => ({ ...fe, home_visit_areas: '' }));
  };

  const removeArea = (area) => {
    setForm((f) => ({ ...f, home_visit_areas: f.home_visit_areas.filter((a) => a !== area) }));
  };

  const validate = () => {
    const errs = {};
    if (!form.title.trim())
      errs.title = t('services.validation.titleRequired');
    if (!form.description.trim())
      errs.description = t('services.validation.descriptionRequired');
    if (![30, 45, 60, 90, 120].includes(parseInt(form.duration_minutes)))
      errs.duration_minutes = t('services.validation.durationRequired');
    const price  = parseFloat(form.price);
    const limits = PRICE_LIMITS[form.currency] || PRICE_LIMITS.EUR;
    if (!form.currency)
      errs.currency = t('services.validation.currencyRequired');
    if (!form.price || isNaN(price) || price < limits.min)
      errs.price = t('services.validation.priceMin', { min: formatPrice(limits.min, form.currency || 'EUR', lng) });
    else if (price > limits.max)
      errs.price = t('services.validation.priceMax', { max: formatPrice(limits.max, form.currency || 'EUR', lng) });
    if (!form.format)
      errs.format = t('services.validation.formatRequired');
    if (form.format === 'HOME_VISIT') {
      if (!homeVisitSupported)
        errs.format = t('services.validation.homeVisitCountryUnsupported');
      else if (form.home_visit_areas.length === 0)
        errs.home_visit_areas = t('services.validation.homeVisitAreasRequired');
    }
    if (!form.cluster)
      errs.cluster = t('services.validation.categoryRequired');
    return errs;
  };

  const openAdd = () => {
    if (!currencyConfirmed) return;
    setEditingId(null);
    setIsDuplicating(false);
    setOriginalCurrency(null);
    setForm({ ...EMPTY_FORM, currency: expertCurrency, format: lockedFormat || '' });
    setFormErrors({});
    setRegionSelect('');
    setSubregionSelect('');
    setShowForm(true);
  };

  const openDuplicate = (svc) => {
    if (!currencyConfirmed) return;
    setEditingId(null);
    setIsDuplicating(true);
    setOriginalCurrency(svc.currency || null);
    setForm({
      title:            svc.title,
      description:      svc.description  || '',
      duration_minutes: String(svc.duration_minutes),
      price:            String(svc.price),
      // Always the confirmed account currency, not whatever the source
      // service was saved under — if they differ, the price below needs a
      // deliberate review rather than being silently carried over.
      currency:         expertCurrency,
      format:           lockedFormat     || svc.format || '',
      cluster:          svc.cluster      || '',
      home_visit_areas: svc.home_visit_areas || [],
    });
    setFormErrors({});
    setRegionSelect('');
    setSubregionSelect('');
    setShowForm(true);
  };

  const openEdit = (svc) => {
    if (!currencyConfirmed) return;
    // If this service already has a pending edit awaiting review, start from
    // that proposal rather than the (stale, from the expert's point of view)
    // live values.
    const effective = withDraft(svc);
    setEditingId(svc.id);
    setOriginalCurrency(svc.currency || null);
    setForm({
      title:            effective.title,
      description:      effective.description  || '',
      duration_minutes: String(effective.duration_minutes),
      price:            String(effective.price),
      currency:         expertCurrency,
      format:           lockedFormat     || effective.format || '',
      cluster:          effective.cluster      || '',
      home_visit_areas: effective.home_visit_areas || [],
    });
    setFormErrors({});
    setRegionSelect('');
    setSubregionSelect('');
    setShowForm(true);
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingId(null);
    setIsDuplicating(false);
    setOriginalCurrency(null);
    setForm(EMPTY_FORM);
    setFormErrors({});
    setRegionSelect('');
    setSubregionSelect('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setFormErrors(errs); return; }
    try {
      const payload = {
        title:            form.title.trim(),
        description:      form.description.trim() || null,
        duration_minutes: parseInt(form.duration_minutes),
        price:            parseFloat(form.price),
        currency:         form.currency,
        format:           form.format  || null,
        cluster:          form.cluster || null,
        home_visit_areas: form.format === 'HOME_VISIT' ? form.home_visit_areas : [],
      };
      const result = editingId
        ? await updateService({ id: editingId, ...payload }).unwrap()
        : await createService(payload).unwrap();
      cancelForm();
      if (result?.pending) {
        setSavedAsDraft(true);
      } else {
        toast.success(t('services.form.saveSuccess'));
      }
    } catch (err) {
      toast.error(err?.data?.error || t('services.errors.saveFailed'));
    }
  };

  const handleDelete = async (id) => {
    setDeletingId(id);
    try {
      await deleteService(id).unwrap();
    } catch {
      toast.error(t('services.errors.deleteFailed'));
    } finally {
      setDeletingId(null);
    }
  };

  const handleReorder = async (index, direction) => {
    const swapIndex = index + direction;
    if (swapIndex < 0 || swapIndex >= services.length) return;
    const reordered = [...services];
    [reordered[index], reordered[swapIndex]] = [reordered[swapIndex], reordered[index]];
    setLocalOrder(reordered);
    try {
      await reorderServices(reordered.map((s) => s.id)).unwrap();
      setLocalOrder(null);
    } catch {
      toast.error(t('services.errors.reorderFailed'));
      setLocalOrder(null); // revert to server order
    }
  };

  const handleToggle = async (svc) => {
    if (svc.review_status !== 'APPROVED') return;
    setTogglingId(svc.id);
    try {
      await updateService({ id: svc.id, is_active: !svc.is_active }).unwrap();
    } catch (err) {
      toast.error(err?.data?.error || t('services.errors.updateFailed'));
    } finally {
      setTogglingId(null);
    }
  };

  const inputClass = (hasErr) =>
    `w-full px-4 py-3 rounded-lg border text-sm text-[#1F2933] placeholder-gray-400 bg-white transition focus:outline-none focus:ring-2 focus:ring-[#445446]/30 focus:border-[#445446] ${
      hasErr ? 'border-red-400' : 'border-[#E4E7E4]'
    }`;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 rounded-full border-2 border-[#445446] border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-[#445446]">{t('services.heading')}</h2>
          <p className="text-sm text-[#5e6d5b] font-medium mt-1">{t('services.subheading')}</p>
        </div>
        {!showForm && (
          <button
            onClick={openAdd}
            disabled={!currencyConfirmed}
            title={!currencyConfirmed ? t('services.currencyUnconfirmed.title') : undefined}
            className="self-start flex items-center gap-1.5 bg-[#445446] hover:bg-[#3F4E41] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#445446] text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 text-sm flex-shrink-0 sm:ml-4"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            {t('services.addServiceBtn')}
          </button>
        )}
      </div>

      {servicesIsError && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {t('services.errors.loadFailed')}
        </div>
      )}

      {!currencyConfirmed && (
        <div className="mb-4 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
          {t('services.currencyUnconfirmed.body')}
        </div>
      )}

      {savedAsDraft && (
        <div className="mb-4 px-4 py-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
          <svg className="w-4 h-4 text-amber-500 flex-shrink-0 mt-px" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 5Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
          </svg>
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-800">{t('services.savedAsDraft.title')}</p>
            <p className="text-xs text-amber-600 mt-0.5">{t('services.savedAsDraft.body')}</p>
          </div>
          <button type="button" onClick={() => setSavedAsDraft(false)} className="p-0.5 text-amber-400 hover:text-amber-600 transition-colors flex-shrink-0">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
          </button>
        </div>
      )}

      {/* Review-status tabs */}
      <div className="flex items-center gap-2 mb-4">
        {[
          { key: 'inReview', label: t('services.tabs.inReview'), count: needsFirstReview.length + pendingEditDrafts.length },
          { key: 'approved', label: t('services.tabs.approved'), count: approvedServices.length },
        ].map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors ${
              activeTab === key
                ? 'bg-[#445446] text-white'
                : 'bg-[#dfe2d7]/50 text-[#5e6d5b] hover:bg-[#dfe2d7]'
            }`}
          >
            {label}{count > 0 ? ` (${count})` : ''}
          </button>
        ))}
      </div>
      {activeTab === 'inReview' && (
        <p className="text-xs text-gray-400 mb-4 -mt-2">{t('services.tabs.inReviewHint')}</p>
      )}

      {/* Add / Edit form */}
      {showForm && (
        <div className="bg-white rounded-2xl border-2 border-[#c5ceba] p-4 sm:p-6 mb-5">
          <h3 className="text-base font-semibold text-[#1F2933] mb-5">
            {editingId
              ? (services.find((s) => s.id === editingId)?.draft?.status === 'PENDING_REVIEW' ? t('services.form.editProposalTitle') : t('services.form.editTitle'))
              : isDuplicating ? t('services.form.duplicateTitle') : t('services.form.addTitle')}
          </h3>
          {originalCurrency && originalCurrency !== form.currency && (
            <div className="mb-4 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
              {t('services.currencyMismatch.body', { from: originalCurrency, to: form.currency })}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-[#1F2933] mb-1.5">{t('services.form.titleLabel')}</label>
              <input type="text" name="title" value={form.title} onChange={handleChange}
                placeholder={t('services.form.titlePlaceholder')} maxLength={80}
                className={inputClass(!!formErrors.title)} />
              <div className="flex items-center justify-between mt-1.5">
                {formErrors.title
                  ? <p className="text-xs text-red-500">{formErrors.title}</p>
                  : <span />}
                <p className={`text-xs tabular-nums ${
                  form.title.length >= 75 ? 'text-red-500' :
                  form.title.length >= 60 ? 'text-amber-500' :
                  'text-gray-400'
                }`}>
                  {form.title.length}/80
                </p>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-[#1F2933] mb-1.5">{t('services.form.descriptionLabel')}</label>
              <textarea name="description" value={form.description} onChange={handleChange} rows={2}
                placeholder={t('services.form.descriptionPlaceholder')}
                maxLength={500}
                className={`${inputClass(!!formErrors.description)} resize-none`} />
              {formErrors.description && <p className="mt-1.5 text-xs text-red-500">{formErrors.description}</p>}
              <div className="flex justify-end mt-1.5">
                <p className={`text-xs tabular-nums ${
                  form.description.length >= 480 ? 'text-red-500' :
                  form.description.length >= 400 ? 'text-amber-500' :
                  'text-gray-400'
                }`}>
                  {form.description.length}/500
                </p>
              </div>
            </div>

            {/* Format + Cluster */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#1F2933] mb-1.5">
                  {t('services.form.formatLabel')} <span className="text-red-400">*</span>
                </label>
                <select
                  name="format"
                  value={form.format}
                  onChange={handleChange}
                  disabled={!!lockedFormat}
                  className={`${inputClass(!!formErrors.format)} ${lockedFormat ? 'opacity-60 cursor-not-allowed bg-gray-50' : ''}`}
                >
                  <option value="" disabled>{t('services.form.formatSelect')}</option>
                  {FORMAT_OPTIONS.map((o) => (
                    <option
                      key={o.value}
                      value={o.value}
                      disabled={o.value === 'HOME_VISIT' && !homeVisitSupported}
                    >
                      {t('services.formats.' + o.value)}
                    </option>
                  ))}
                </select>
                {lockedFormat ? (
                  <p className="mt-1 text-xs text-gray-400">
                    {t('services.form.lockedFormatHint')}
                  </p>
                ) : !homeVisitSupported && (
                  <p className="mt-1 text-xs text-gray-400">
                    {t('services.form.homeVisitCountryHint')}
                  </p>
                )}
                {formErrors.format && <p className="mt-1.5 text-xs text-red-500">{formErrors.format}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1F2933] mb-1.5">
                  {t('services.form.categoryLabel')} <span className="text-red-400">*</span>
                </label>
                <select name="cluster" value={form.cluster} onChange={handleChange} className={inputClass(!!formErrors.cluster)}>
                  <option value="" disabled>{t('services.form.categorySelect')}</option>
                  {CLUSTER_OPTIONS.map((o) => <option key={o.value} value={o.value}>{t('services.clusters.' + o.value)}</option>)}
                </select>
                {formErrors.cluster && <p className="mt-1.5 text-xs text-red-500">{formErrors.cluster}</p>}
              </div>
            </div>

            {/* Home visit coverage — region → province/landsdel pairs, required once format is HOME_VISIT */}
            {form.format === 'HOME_VISIT' && (
              <div>
                <label className="block text-sm font-medium text-[#1F2933] mb-1.5">
                  {t('services.form.homeVisitAreasLabel')} <span className="text-red-400">*</span>
                </label>

                {!homeVisitSupported ? (
                  <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
                    {t('services.form.homeVisitCountryUnsupported')}
                  </p>
                ) : (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2">
                      <select
                        value={regionSelect}
                        onChange={(e) => { setRegionSelect(e.target.value); setSubregionSelect(''); }}
                        className={inputClass(!!formErrors.home_visit_areas)}
                      >
                        <option value="">{t('services.form.homeVisitRegionSelect')}</option>
                        {regionOptions.map((r) => <option key={r} value={r}>{r}</option>)}
                      </select>

                      <select
                        value={subregionSelect}
                        onChange={(e) => setSubregionSelect(e.target.value)}
                        disabled={!regionSelect}
                        className={`${inputClass(!!formErrors.home_visit_areas)} ${!regionSelect ? 'opacity-60 cursor-not-allowed bg-gray-50' : ''}`}
                      >
                        <option value="">
                          {homeVisitSubLevel === 'landsdel'
                            ? t('services.form.homeVisitLandsdelSelect')
                            : homeVisitSubLevel === 'county'
                            ? t('services.form.homeVisitCountySelect')
                            : t('services.form.homeVisitProvinceSelect')}
                        </option>
                        {subregionOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>

                      <button
                        type="button"
                        onClick={addAreaPair}
                        disabled={!regionSelect || !subregionSelect}
                        className="flex-shrink-0 px-4 py-2 text-sm font-medium text-[#445446] border border-[#c5ceba] rounded-lg hover:bg-[#445446]/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {t('services.form.homeVisitAreasAddBtn')}
                      </button>
                    </div>

                    {form.home_visit_areas.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {form.home_visit_areas.map((area) => {
                          const invalid = !isValidArea(countryKey, area);
                          return (
                            <span
                              key={area}
                              title={invalid ? t('services.form.homeVisitAreaInvalid') : undefined}
                              className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                                invalid ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                              }`}
                            >
                              {area}
                              <button type="button" onClick={() => removeArea(area)} className={invalid ? 'hover:text-red-900' : 'hover:text-amber-900'} aria-label={`Remove ${area}`}>
                                ×
                              </button>
                            </span>
                          );
                        })}
                      </div>
                    )}
                    <p className="mt-1.5 text-xs text-gray-400">{t('services.form.homeVisitAreasHint')}</p>
                  </>
                )}
                {formErrors.home_visit_areas && <p className="mt-1.5 text-xs text-red-500">{formErrors.home_visit_areas}</p>}
              </div>
            )}

            {/* Duration + Currency + Price */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#1F2933] mb-1.5">{t('services.form.durationLabel')}</label>
                <select name="duration_minutes" value={form.duration_minutes} onChange={handleChange}
                  className={inputClass(!!formErrors.duration_minutes)}>
                  <option value="">{t('services.form.durationSelect')}</option>
                  {[30, 45, 60, 90, 120].map(d => (
                    <option key={d} value={String(d)}>{d} min</option>
                  ))}
                </select>
                {formErrors.duration_minutes && <p className="mt-1.5 text-xs text-red-500">{formErrors.duration_minutes}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1F2933] mb-1.5">{t('services.form.currencyLabel')}</label>
                <div className="w-full px-4 py-3 rounded-lg border border-[#E4E7E4] bg-gray-50 text-sm text-[#1F2933]">
                  {CURRENCY_LABELS[form.currency] || form.currency}
                </div>
                <p className="mt-1 text-xs text-gray-400">
                  {t('services.form.lockedCurrencyHint')}
                </p>
                {formErrors.currency && <p className="mt-1.5 text-xs text-red-500">{formErrors.currency}</p>}
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-sm font-medium text-[#1F2933] mb-1.5">{t('services.form.priceLabel')}</label>
                <input type="number" name="price" value={form.price} onChange={handleChange}
                  placeholder="75.00" min="1.00" step="0.01" className={inputClass(!!formErrors.price)} />
                {formErrors.price && <p className="mt-1.5 text-xs text-red-500">{formErrors.price}</p>}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-1">
              <button type="button" onClick={cancelForm}
                className="text-sm font-medium text-gray-500 hover:text-[#1F2933] py-2.5 px-4 rounded-lg hover:bg-gray-50 transition-colors">
                {t('services.form.cancelBtn')}
              </button>
              <button type="submit" disabled={formLoading}
                className="bg-[#445446] hover:bg-[#3F4E41] disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium py-2.5 px-6 rounded-lg transition-colors duration-200 text-sm">
                {formLoading
                  ? t('services.form.savingBtn')
                  : editingId
                    ? t('services.form.saveChangesBtn')
                    : isDuplicating
                      ? t('services.form.duplicateBtn')
                      : t('services.form.addBtn')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Service list */}
      {(() => {
        const displayed = activeTab === 'approved' ? approvedServices : needsFirstReview;
        const isEmpty = displayed.length === 0 && (activeTab === 'approved' || pendingEditDrafts.length === 0);
        if (isEmpty) {
          return (
            <div className="bg-white rounded-2xl border-2 border-[#c5ceba] p-14 text-center">
              <svg className="w-12 h-12 mx-auto text-gray-200 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 0 0 .75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 0 0-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0 1 12 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 0 1-.673-.38m0 0A2.18 2.18 0 0 1 3 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 0 1 3.413-.387m7.5 0V5.25A2.25 2.25 0 0 0 13.5 3h-3a2.25 2.25 0 0 0-2.25 2.25v.894m7.5 0a48.667 48.667 0 0 0-7.5 0" />
              </svg>
              <p className="text-sm font-medium text-gray-500">
                {activeTab === 'approved' ? t('services.empty.approved') : t('services.empty.inReview')}
              </p>
              {services.length === 0 && <p className="text-xs text-gray-400 mt-1">{t('services.empty.body')}</p>}
            </div>
          );
        }
        return (
          <div className="space-y-3">
            {displayed.map((svc) => {
              const currencyMismatch = !svc.is_active && currencyConfirmed && svc.currency !== expertCurrency && svc.review_status === 'APPROVED';
              return (
                <div key={svc.id} className="bg-white rounded-2xl border-2 border-[#c5ceba] px-5 py-4 hover:border-[#445446]/30 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      {/* Badges row */}
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <p className="text-sm font-semibold text-[#1F2933]">{svc.title}</p>

                        {currencyMismatch ? (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 bg-amber-100 text-amber-700"
                            title={t('services.currencyMismatch.badgeHint', { currency: svc.currency })}>
                            {t('services.card.currencyMismatch')}
                          </span>
                        ) : svc.review_status === 'APPROVED' ? (
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${svc.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                            {svc.is_active ? t('services.card.active') : t('services.card.inactive')}
                          </span>
                        ) : svc.review_status === 'PENDING_REVIEW' ? (
                          <span
                            title={t('services.card.pendingReviewTooltip')}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 bg-amber-100 text-amber-700"
                          >
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2m6-2a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z" />
                            </svg>
                            {t('services.card.pendingReview')}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 bg-red-100 text-red-700">
                            {t('services.card.rejected')}
                          </span>
                        )}

                        {svc.review_status === 'APPROVED' && svc.draft?.status === 'PENDING_REVIEW' && (
                          <span
                            title={t('services.card.changesPendingTooltip')}
                            className="px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 bg-amber-100 text-amber-700"
                          >
                            {t('services.card.changesPending')}
                          </span>
                        )}
                        {svc.review_status === 'APPROVED' && svc.draft?.status === 'REJECTED' && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 bg-red-100 text-red-700">
                            {t('services.card.editRejected')}
                          </span>
                        )}

                        {svc.format && FORMAT_BADGE_CLS[svc.format] && (
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${FORMAT_BADGE_CLS[svc.format]}`}>
                            {t('services.formats.' + svc.format)}
                          </span>
                        )}
                        {svc.cluster && CLUSTER_BADGE_CLS[svc.cluster] && (
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${CLUSTER_BADGE_CLS[svc.cluster]}`}>
                            {t('services.clusters.' + svc.cluster)}
                          </span>
                        )}
                      </div>
                      {svc.description && (
                        <p className="text-xs text-gray-500 mb-1 line-clamp-2">{svc.description}</p>
                      )}
                      <p className="text-xs text-gray-400">
                        {svc.duration_minutes} min &middot; {formatPrice(svc.price, svc.currency || 'EUR', lng)}
                      </p>
                      {svc.format === 'HOME_VISIT' && svc.home_visit_areas?.length > 0 && (
                        <p className="text-xs text-gray-400 mt-1">
                          {t('services.card.homeVisitAreasLabel')} {svc.home_visit_areas.join(', ')}
                        </p>
                      )}
                      {(svc.review_status === 'REJECTED' || svc.draft?.status === 'REJECTED') && (
                        <div className="mt-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
                          {(() => {
                            const note = svc.review_status === 'REJECTED' ? svc.rejection_note : svc.draft?.rejection_note;
                            return note && (
                              <p className="text-xs text-red-600">
                                <span className="font-medium">{t('services.card.rejectionNoteLabel')}</span> {note}
                              </p>
                            );
                          })()}
                          <button type="button" onClick={() => openEdit(svc)}
                            className="mt-1 text-xs font-medium text-red-700 hover:text-red-800 underline underline-offset-2">
                            {t('services.card.editToResubmit')}
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-0.5 flex-shrink-0">
                      {activeTab === 'approved' && (
                        <>
                          <button onClick={() => handleReorder(services.indexOf(svc), -1)}
                            disabled={isReordering || services.indexOf(svc) === 0}
                            title="Move up"
                            className="p-2 text-gray-400 hover:text-[#445446] hover:bg-[#445446]/10 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                            <ChevronUpIcon />
                          </button>
                          <button onClick={() => handleReorder(services.indexOf(svc), 1)}
                            disabled={isReordering || services.indexOf(svc) === services.length - 1}
                            title="Move down"
                            className="p-2 text-gray-400 hover:text-[#445446] hover:bg-[#445446]/10 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                            <ChevronDownIcon />
                          </button>
                        </>
                      )}
                      <button onClick={() => handleToggle(svc)}
                        disabled={togglingId === svc.id || svc.review_status !== 'APPROVED'}
                        title={svc.review_status !== 'APPROVED' ? t('services.card.pendingReviewTooltip') : (svc.is_active ? t('services.card.deactivateHint') : t('services.card.activateHint'))}
                        className="p-2 text-gray-400 hover:text-amber-500 hover:bg-amber-50 rounded-lg transition-colors disabled:opacity-40 disabled:hover:text-gray-400 disabled:hover:bg-transparent">
                        {togglingId === svc.id ? <Spinner /> : <PowerIcon />}
                      </button>
                      <button onClick={() => openDuplicate(svc)} title="Duplicate"
                        className="p-2 text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors">
                        <CopyIcon />
                      </button>
                      <button onClick={() => openEdit(svc)} title="Edit"
                        className="p-2 text-gray-400 hover:text-[#445446] hover:bg-[#445446]/10 rounded-lg transition-colors">
                        <EditIcon />
                      </button>
                      <button
                        onClick={() => setDeleteModal({ open: true, id: svc.id })}
                        title="Delete"
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Approved services with a pending edit — shown here too as a
                lightweight proposal summary, since the change itself is what
                needs review even though the service stays live/bookable. */}
            {activeTab === 'inReview' && pendingEditDrafts.map((svc) => (
              <div key={`draft-${svc.id}`} className="bg-white/60 rounded-2xl border-2 border-dashed border-amber-300 px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="text-sm font-semibold text-[#1F2933]">{svc.draft.title ?? svc.title}</p>
                      <span title={t('services.card.changesPendingTooltip')}
                        className="px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 bg-amber-100 text-amber-700">
                        {t('services.card.changesPending')}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400">
                      {svc.draft.duration_minutes ?? svc.duration_minutes} min &middot; {formatPrice(svc.draft.price ?? svc.price, svc.currency || 'EUR', lng)}
                    </p>
                  </div>
                  <button type="button" onClick={() => openEdit(svc)}
                    className="flex-shrink-0 px-3 py-1.5 text-xs font-medium text-[#445446] border border-[#c5ceba] rounded-lg hover:bg-[#445446]/10 transition-colors">
                    {t('services.card.editProposalBtn')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        );
      })()}

      <ConfirmModal
        open={deleteModal.open}
        title={t('services.card.deleteConfirm')}
        message={t('services.card.deleteMessage', 'This action cannot be undone.')}
        confirmLabel={t('services.card.deleteBtn')}
        loading={deletingId === deleteModal.id}
        onClose={() => setDeleteModal({ open: false, id: null })}
        onConfirm={() => { handleDelete(deleteModal.id); setDeleteModal({ open: false, id: null }); }}
      />
    </div>
  );
};

export default ServicesSection;
