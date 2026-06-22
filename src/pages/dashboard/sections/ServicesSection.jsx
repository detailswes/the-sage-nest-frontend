import { useState } from 'react';
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

const FORMAT_OPTIONS  = [
  { value: 'ONLINE' },
  { value: 'IN_PERSON' },
];
const CURRENCY_OPTIONS = [
  { value: 'EUR', label: 'EUR (€)' },
  { value: 'GBP', label: 'GBP (£)' },
  { value: 'DKK', label: 'DKK (kr)' },
  { value: 'SEK', label: 'SEK (kr)' },
  { value: 'NOK', label: 'NOK (kr)' },
  { value: 'CHF', label: 'CHF (Fr)' },
];
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
  { value: 'PACKAGE' },
  { value: 'GIFT' },
  { value: 'EVENT' },
];

const FORMAT_BADGE_CLS = {
  ONLINE:    'bg-blue-100 text-blue-700',
  IN_PERSON: 'bg-purple-100 text-purple-700',
};
const CLUSTER_BADGE_CLS = {
  FOR_PARENTS: 'bg-pink-100 text-pink-700',
  FOR_BABY:    'bg-cyan-100 text-cyan-700',
  PACKAGE:     'bg-amber-100 text-amber-700',
  GIFT:        'bg-green-100 text-green-700',
  EVENT:       'bg-violet-100 text-violet-700',
};

const EMPTY_FORM = {
  title: '', description: '',
  duration_minutes: '', price: '', currency: 'EUR',
  format: '', cluster: '',
};

const Spinner = ({ className = 'w-4 h-4' }) => (
  <div className={`${className} rounded-full border-2 border-current border-t-transparent animate-spin`} />
);

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

  const [showForm, setShowForm]       = useState(false);
  const [editingId, setEditingId]     = useState(null);
  const [form, setForm]               = useState(EMPTY_FORM);
  const [formErrors, setFormErrors]   = useState({});

  const [isDuplicating, setIsDuplicating] = useState(false);

  const [deletingId, setDeletingId]     = useState(null);
  const [togglingId, setTogglingId]     = useState(null);
  const [deleteModal, setDeleteModal]   = useState({ open: false, id: null });

  const formLoading = editingId ? updating : creating;
  const isReordering = reordering;

  // Derives the locked format value when the expert has a single-mode session_format.
  const lockedFormat = sessionFormat === 'ONLINE' ? 'ONLINE'
    : sessionFormat === 'IN_PERSON' ? 'IN_PERSON'
    : null; // null means BOTH — dropdown is free

  // ── Helpers ───────────────────────────────────────────────────────────────
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    setFormErrors((fe) => ({ ...fe, [name]: '' }));
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
    if (!form.cluster)
      errs.cluster = t('services.validation.categoryRequired');
    return errs;
  };

  const openAdd = () => {
    setEditingId(null);
    setIsDuplicating(false);
    setForm({ ...EMPTY_FORM, format: lockedFormat || '' });
    setFormErrors({});
    setShowForm(true);
  };

  const openDuplicate = (svc) => {
    setEditingId(null);
    setIsDuplicating(true);
    setForm({
      title:            svc.title,
      description:      svc.description  || '',
      duration_minutes: String(svc.duration_minutes),
      price:            String(svc.price),
      currency:         svc.currency     || 'EUR',
      format:           lockedFormat     || svc.format || '',
      cluster:          svc.cluster      || '',
    });
    setFormErrors({});
    setShowForm(true);
  };

  const openEdit = (svc) => {
    setEditingId(svc.id);
    setForm({
      title:            svc.title,
      description:      svc.description  || '',
      duration_minutes: String(svc.duration_minutes),
      price:            String(svc.price),
      currency:         svc.currency     || 'EUR',
      format:           lockedFormat     || svc.format || '',
      cluster:          svc.cluster      || '',
    });
    setFormErrors({});
    setShowForm(true);
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingId(null);
    setIsDuplicating(false);
    setForm(EMPTY_FORM);
    setFormErrors({});
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
      };
      if (editingId) {
        await updateService({ id: editingId, ...payload }).unwrap();
      } else {
        await createService(payload).unwrap();
      }
      cancelForm();
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
    setTogglingId(svc.id);
    try {
      await updateService({ id: svc.id, is_active: !svc.is_active }).unwrap();
    } catch {
      toast.error(t('services.errors.updateFailed'));
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
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-[#445446]">{t('services.heading')}</h2>
          <p className="text-sm text-[#5e6d5b] font-medium mt-1">{t('services.subheading')}</p>
        </div>
        {!showForm && (
          <button
            onClick={openAdd}
            className="flex items-center gap-1.5 bg-[#445446] hover:bg-[#3F4E41] text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 text-sm flex-shrink-0 ml-4"
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

      {/* Add / Edit form */}
      {showForm && (
        <div className="bg-white rounded-2xl border-2 border-[#c5ceba] p-6 mb-5">
          <h3 className="text-base font-semibold text-[#1F2933] mb-5">
            {editingId ? t('services.form.editTitle') : isDuplicating ? t('services.form.duplicateTitle') : t('services.form.addTitle')}
          </h3>
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
                  {FORMAT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{t('services.formats.' + o.value)}</option>)}
                </select>
                {lockedFormat && (
                  <p className="mt-1 text-xs text-gray-400">
                    Set by your profile session format. Change it in your Profile settings.
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

            {/* Duration + Currency + Price */}
            <div className="grid grid-cols-3 gap-4">
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
                <select name="currency" value={form.currency} onChange={handleChange}
                  className={inputClass(!!formErrors.currency)}>
                  {CURRENCY_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                {formErrors.currency && <p className="mt-1.5 text-xs text-red-500">{formErrors.currency}</p>}
              </div>
              <div>
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
      {services.length === 0 ? (
        <div className="bg-white rounded-2xl border-2 border-[#c5ceba] p-14 text-center">
          <svg className="w-12 h-12 mx-auto text-gray-200 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 0 0 .75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 0 0-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0 1 12 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 0 1-.673-.38m0 0A2.18 2.18 0 0 1 3 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 0 1 3.413-.387m7.5 0V5.25A2.25 2.25 0 0 0 13.5 3h-3a2.25 2.25 0 0 0-2.25 2.25v.894m7.5 0a48.667 48.667 0 0 0-7.5 0" />
          </svg>
          <p className="text-sm font-medium text-gray-500">{t('services.empty.title')}</p>
          <p className="text-xs text-gray-400 mt-1">{t('services.empty.body')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {services.map((svc) => (
            <div key={svc.id} className="bg-white rounded-2xl border-2 border-[#c5ceba] px-5 py-4 hover:border-[#445446]/30 transition-colors">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  {/* Badges row */}
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <p className="text-sm font-semibold text-[#1F2933]">{svc.title}</p>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${svc.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                      {svc.is_active ? t('services.card.active') : t('services.card.inactive')}
                    </span>
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
                </div>

                <div className="flex items-center gap-0.5 flex-shrink-0">
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
                  <button onClick={() => handleToggle(svc)} disabled={togglingId === svc.id}
                    title={svc.is_active ? 'Deactivate' : 'Activate'}
                    className="p-2 text-gray-400 hover:text-amber-500 hover:bg-amber-50 rounded-lg transition-colors disabled:opacity-40">
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
          ))}
        </div>
      )}

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
