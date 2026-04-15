import { useState, useEffect } from 'react';
import { listServices, createService, updateService, deleteService, reorderServices } from '../../../api/expertApi';

const FORMAT_OPTIONS  = [
  { value: 'ONLINE',    label: 'Online' },
  { value: 'IN_PERSON', label: 'In-Person' },
];
const CLUSTER_OPTIONS = [
  { value: 'FOR_PARENTS', label: 'For Parents' },
  { value: 'FOR_BABY',    label: 'For Baby' },
  { value: 'PACKAGE',     label: 'Package' },
  { value: 'GIFT',        label: 'Gift' },
  { value: 'EVENT',       label: 'Event' },
];

const FORMAT_BADGE = {
  ONLINE:    { label: 'Online',    cls: 'bg-blue-100 text-blue-700' },
  IN_PERSON: { label: 'In-Person', cls: 'bg-purple-100 text-purple-700' },
};
const CLUSTER_BADGE = {
  FOR_PARENTS: { label: 'For Parents', cls: 'bg-pink-100 text-pink-700' },
  FOR_BABY:    { label: 'For Baby',    cls: 'bg-cyan-100 text-cyan-700' },
  PACKAGE:     { label: 'Package',     cls: 'bg-amber-100 text-amber-700' },
  GIFT:        { label: 'Gift',        cls: 'bg-green-100 text-green-700' },
  EVENT:       { label: 'Event',       cls: 'bg-violet-100 text-violet-700' },
};

const EMPTY_FORM = {
  title: '', description: '',
  duration_minutes: '', price: '',
  format: '', cluster: '',
};

// ─── Icons ────────────────────────────────────────────────────────────────────
const EditIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125" />
  </svg>
);
const TrashIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
  </svg>
);
const PowerIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5.636 5.636a9 9 0 1 0 12.728 0M12 3v9" />
  </svg>
);
const ChevronUpIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
  </svg>
);
const ChevronDownIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
  </svg>
);
const CopyIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 0 1-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H9.75" />
  </svg>
);
const Spinner = ({ className = 'w-4 h-4' }) => (
  <div className={`${className} rounded-full border-2 border-current border-t-transparent animate-spin`} />
);

// ─── Component ────────────────────────────────────────────────────────────────
const ServicesSection = () => {
  const [services, setServices]       = useState([]);
  const [loading, setLoading]         = useState(true);
  const [listError, setListError]     = useState('');

  const [showForm, setShowForm]       = useState(false);
  const [editingId, setEditingId]     = useState(null);
  const [form, setForm]               = useState(EMPTY_FORM);
  const [formErrors, setFormErrors]   = useState({});
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError]     = useState('');

  const [isDuplicating, setIsDuplicating] = useState(false);
  const [isReordering, setIsReordering]   = useState(false);

  const [deletingId, setDeletingId]     = useState(null);
  const [togglingId, setTogglingId]     = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  useEffect(() => {
    listServices()
      .then(setServices)
      .catch(() => setListError('Failed to load services.'))
      .finally(() => setLoading(false));
  }, []);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    setFormErrors((fe) => ({ ...fe, [name]: '' }));
    if (formError) setFormError('');
  };

  const validate = () => {
    const errs = {};
    if (!form.title.trim())
      errs.title = 'Title is required';
    if (!form.description.trim())
      errs.description = 'Description is required';
    const dur = parseInt(form.duration_minutes);
    if (!form.duration_minutes || isNaN(dur) || dur < 15 || dur > 480)
      errs.duration_minutes = 'Duration must be between 15 and 480 minutes';
    const price = parseFloat(form.price);
    if (!form.price || isNaN(price) || price < 1.00)
      errs.price = 'Price must be at least €1.00';
    if (!form.format)
      errs.format = 'Please select a format';
    if (!form.cluster)
      errs.cluster = 'Please select a category';
    return errs;
  };

  const openAdd = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormErrors({});
    setFormError('');
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
      format:           svc.format       || '',
      cluster:          svc.cluster      || '',
    });
    setFormErrors({});
    setFormError('');
    setShowForm(true);
  };

  const openEdit = (svc) => {
    setEditingId(svc.id);
    setForm({
      title:            svc.title,
      description:      svc.description  || '',
      duration_minutes: String(svc.duration_minutes),
      price:            String(svc.price),
      format:           svc.format       || '',
      cluster:          svc.cluster      || '',
    });
    setFormErrors({});
    setFormError('');
    setShowForm(true);
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingId(null);
    setIsDuplicating(false);
    setForm(EMPTY_FORM);
    setFormErrors({});
    setFormError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setFormErrors(errs); return; }
    setFormLoading(true);
    setFormError('');
    try {
      const payload = {
        title:            form.title.trim(),
        description:      form.description.trim() || null,
        duration_minutes: parseInt(form.duration_minutes),
        price:            parseFloat(form.price),
        format:           form.format  || null,
        cluster:          form.cluster || null,
      };
      if (editingId) {
        const updated = await updateService(editingId, payload);
        setServices((s) => s.map((sv) => (sv.id === editingId ? updated : sv)));
      } else {
        const created = await createService(payload);
        setServices((s) => [...s, created]);
      }
      cancelForm();
    } catch (err) {
      setFormError(err?.response?.data?.error || 'Failed to save service.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id) => {
    setDeletingId(id);
    try {
      await deleteService(id);
      setServices((s) => s.filter((sv) => sv.id !== id));
    } catch {
      setListError('Failed to delete service.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleReorder = async (index, direction) => {
    const swapIndex = index + direction;
    if (swapIndex < 0 || swapIndex >= services.length) return;
    const reordered = [...services];
    [reordered[index], reordered[swapIndex]] = [reordered[swapIndex], reordered[index]];
    setServices(reordered);
    setIsReordering(true);
    try {
      await reorderServices(reordered.map((s) => s.id));
    } catch {
      setListError('Failed to save new order.');
      setServices(services); // revert
    } finally {
      setIsReordering(false);
    }
  };

  const handleToggle = async (svc) => {
    setTogglingId(svc.id);
    try {
      const updated = await updateService(svc.id, { is_active: !svc.is_active });
      setServices((s) => s.map((sv) => (sv.id === svc.id ? updated : sv)));
    } catch {
      setListError('Failed to update service.');
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
          <h2 className="text-xl font-semibold text-[#1F2933]">Services</h2>
          <p className="text-sm text-gray-500 mt-1">Manage the services you offer to parents. All prices in EUR (€).</p>
        </div>
        {!showForm && (
          <button
            onClick={openAdd}
            className="flex items-center gap-1.5 bg-[#445446] hover:bg-[#3F4E41] text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 text-sm flex-shrink-0 ml-4"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Add Service
          </button>
        )}
      </div>

      {listError && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{listError}</div>
      )}

      {/* Add / Edit form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-[#E4E7E4] p-6 mb-5">
          <h3 className="text-base font-semibold text-[#1F2933] mb-5">
            {editingId ? 'Edit Service' : isDuplicating ? 'Duplicate Service' : 'Add New Service'}
          </h3>
          {formError && (
            <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{formError}</div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-[#1F2933] mb-1.5">Service title</label>
              <input type="text" name="title" value={form.title} onChange={handleChange}
                placeholder="e.g. 1-hour Nutrition Consultation" maxLength={80}
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
              <label className="block text-sm font-medium text-[#1F2933] mb-1.5">Description</label>
              <textarea name="description" value={form.description} onChange={handleChange} rows={2}
                placeholder="Brief description of what this service includes…"
                maxLength={300}
                className={`${inputClass(!!formErrors.description)} resize-none`} />
              {formErrors.description && <p className="mt-1.5 text-xs text-red-500">{formErrors.description}</p>}
              <div className="flex justify-end mt-1.5">
                <p className={`text-xs tabular-nums ${
                  form.description.length >= 280 ? 'text-red-500' :
                  form.description.length >= 240 ? 'text-amber-500' :
                  'text-gray-400'
                }`}>
                  {form.description.length}/300
                </p>
              </div>
            </div>

            {/* Format + Cluster */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#1F2933] mb-1.5">
                  Format <span className="text-red-400">*</span>
                </label>
                <select name="format" value={form.format} onChange={handleChange} className={inputClass(!!formErrors.format)}>
                  <option value="" disabled>Select a format…</option>
                  {FORMAT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                {formErrors.format && <p className="mt-1.5 text-xs text-red-500">{formErrors.format}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1F2933] mb-1.5">
                  Category <span className="text-red-400">*</span>
                </label>
                <select name="cluster" value={form.cluster} onChange={handleChange} className={inputClass(!!formErrors.cluster)}>
                  <option value="" disabled>Select a category…</option>
                  {CLUSTER_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                {formErrors.cluster && <p className="mt-1.5 text-xs text-red-500">{formErrors.cluster}</p>}
              </div>
            </div>

            {/* Duration + Price */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#1F2933] mb-1.5">Duration (min)</label>
                <input type="number" name="duration_minutes" value={form.duration_minutes} onChange={handleChange}
                  placeholder="60" min="15" max="480" className={inputClass(!!formErrors.duration_minutes)} />
                {formErrors.duration_minutes && <p className="mt-1.5 text-xs text-red-500">{formErrors.duration_minutes}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1F2933] mb-1.5">Price (€)</label>
                <input type="number" name="price" value={form.price} onChange={handleChange}
                  placeholder="75.00" min="1.00" step="0.01" className={inputClass(!!formErrors.price)} />
                {formErrors.price && <p className="mt-1.5 text-xs text-red-500">{formErrors.price}</p>}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-1">
              <button type="button" onClick={cancelForm}
                className="text-sm font-medium text-gray-500 hover:text-[#1F2933] py-2.5 px-4 rounded-lg hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={formLoading}
                className="bg-[#445446] hover:bg-[#3F4E41] disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium py-2.5 px-6 rounded-lg transition-colors duration-200 text-sm">
                {formLoading ? 'Saving…' : editingId ? 'Save Changes' : 'Add Service'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Service list */}
      {services.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E4E7E4] p-14 text-center">
          <svg className="w-12 h-12 mx-auto text-gray-200 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 0 0 .75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 0 0-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0 1 12 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 0 1-.673-.38m0 0A2.18 2.18 0 0 1 3 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 0 1 3.413-.387m7.5 0V5.25A2.25 2.25 0 0 0 13.5 3h-3a2.25 2.25 0 0 0-2.25 2.25v.894m7.5 0a48.667 48.667 0 0 0-7.5 0" />
          </svg>
          <p className="text-sm font-medium text-gray-500">No services yet</p>
          <p className="text-xs text-gray-400 mt-1">Add your first service to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {services.map((svc) => (
            <div key={svc.id} className="bg-white rounded-xl border border-[#E4E7E4] px-5 py-4 hover:border-[#445446]/30 transition-colors">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  {/* Badges row */}
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <p className="text-sm font-semibold text-[#1F2933]">{svc.title}</p>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${svc.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                      {svc.is_active ? 'Active' : 'Inactive'}
                    </span>
                    {svc.format && FORMAT_BADGE[svc.format] && (
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${FORMAT_BADGE[svc.format].cls}`}>
                        {FORMAT_BADGE[svc.format].label}
                      </span>
                    )}
                    {svc.cluster && CLUSTER_BADGE[svc.cluster] && (
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${CLUSTER_BADGE[svc.cluster].cls}`}>
                        {CLUSTER_BADGE[svc.cluster].label}
                      </span>
                    )}
                  </div>
                  {svc.description && (
                    <p className="text-xs text-gray-500 mb-1 line-clamp-2">{svc.description}</p>
                  )}
                  <p className="text-xs text-gray-400">
                    {svc.duration_minutes} min &middot; €{parseFloat(svc.price).toFixed(2)}
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
                  {confirmDeleteId === svc.id ? (
                    <div className="flex items-center gap-1.5 pl-1">
                      <span className="text-xs text-gray-500 whitespace-nowrap">Delete?</span>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="text-xs text-gray-500 hover:text-[#1F2933] px-2 py-1 rounded hover:bg-gray-100 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => { setConfirmDeleteId(null); handleDelete(svc.id); }}
                        disabled={deletingId === svc.id}
                        className="flex items-center gap-1 text-xs font-medium text-white bg-red-500 hover:bg-red-600 disabled:opacity-60 px-2.5 py-1 rounded-lg transition-colors"
                      >
                        {deletingId === svc.id ? <Spinner className="w-3 h-3" /> : null}
                        Delete
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDeleteId(svc.id)}
                      title="Delete"
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <TrashIcon />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ServicesSection;
