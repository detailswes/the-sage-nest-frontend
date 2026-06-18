import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useSaveInsuranceMutation, useDeleteInsuranceMutation } from '../../../api/expertApi';
import { getDocumentUrl } from '../../../utils/imageUrl';
import ConfirmModal from '../../../components/ConfirmModal';

const DOC_TYPES = 'application/pdf,image/jpeg,image/jpg,image/png';
const DOC_MAX   = 5 * 1024 * 1024;

const Spinner = () => (
  <div className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin flex-shrink-0" />
);

const formatDate = (iso, lng = 'en') =>
  new Date(iso).toLocaleDateString(lng === 'it' ? 'it-IT' : 'en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

const isExpired = (iso) => new Date(iso) <= new Date();

const daysUntil = (iso) => {
  const diff = new Date(iso).setHours(0,0,0,0) - new Date().setHours(0,0,0,0);
  return Math.ceil(diff / 86_400_000);
};

const InsuranceCard = ({ initialData = null }) => {
  const { t, i18n } = useTranslation('expertDashboard');
  const lng = i18n.language;
  const [insurance, setInsurance]   = useState(initialData);
  const [showForm, setShowForm]     = useState(!initialData);
  const [form, setForm]             = useState({ policy_expires_at: '', document: null });
  const [docName, setDocName]       = useState('');
  const [formError, setFormError]   = useState('');
  const [dateWarning, setDateWarning] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [saveInsurance, { isLoading: saving }]   = useSaveInsuranceMutation();
  const [deleteInsuranceMut, { isLoading: deleting }] = useDeleteInsuranceMutation();
  const fileRef = useRef(null);

  const inputClass = (err) =>
    `w-full px-3 py-2.5 rounded-lg border text-sm text-[#1F2933] bg-white transition focus:outline-none focus:ring-2 focus:ring-[#445446]/30 focus:border-[#445446] ${
      err ? 'border-red-400' : 'border-[#E4E7E4]'
    }`;

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > DOC_MAX) { setFormError(t('profile.insurance.errors.docSize')); return; }
    setForm((f) => ({ ...f, document: file }));
    setDocName(file.name);
    setFormError('');
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!form.policy_expires_at) { setFormError(t('profile.insurance.errors.expiryRequired')); return; }
    if (new Date(form.policy_expires_at) <= new Date()) {
      setFormError(t('profile.insurance.errors.expiryFuture')); return;
    }
    if (!insurance && !form.document) {
      setFormError(t('profile.insurance.errors.docRequired')); return;
    }

    try {
      const updated = await saveInsurance({
        policy_expires_at: form.policy_expires_at,
        document: form.document || undefined,
      }).unwrap();
      setInsurance(updated);
      setForm({ policy_expires_at: '', document: null });
      setDocName('');
      setDateWarning('');
      setShowForm(false);
    } catch (err) {
      setFormError(err?.data?.error || t('profile.insurance.errors.saveFailed'));
    }
  };

  const handleDelete = async () => {
    try {
      await deleteInsuranceMut().unwrap();
      setInsurance(null);
      setShowForm(true);
      setShowDeleteModal(false);
    } catch { /* keep record */ }
  };

  const expired = insurance && isExpired(insurance.policy_expires_at);

  return (
    <div className="bg-white rounded-2xl border border-[#E4E7E4] p-6 mt-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-[#1F2933]">{t('profile.insurance.title')}</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {t('profile.insurance.subtitle')}
          </p>
        </div>
        {insurance && !showForm && (
          <button
            type="button"
            onClick={() => { setShowForm(true); setForm({ policy_expires_at: '', document: null }); setDocName(''); setFormError(''); setDateWarning(''); }}
            className="flex-shrink-0 ml-4 text-xs font-medium text-[#445446] border border-[#445446]/30 hover:bg-[#445446]/5 px-3 py-1.5 rounded-lg transition-colors"
          >
            {t('profile.insurance.updateBtn')}
          </button>
        )}
      </div>

      {/* Current record */}
      {insurance && !showForm && (
        <div className={`rounded-xl border px-4 py-3.5 mb-2 ${expired ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <svg className={`w-4 h-4 flex-shrink-0 ${expired ? 'text-red-500' : 'text-green-600'}`} fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 1a4.5 4.5 0 0 0-4.5 4.5V9H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-.5V5.5A4.5 4.5 0 0 0 10 1Zm3 8V5.5a3 3 0 1 0-6 0V9h6Z" clipRule="evenodd" />
                </svg>
                <span className={`text-sm font-medium ${expired ? 'text-red-700' : 'text-green-800'}`}>
                  {expired ? t('profile.insurance.expired') : t('profile.insurance.active')}
                </span>
              </div>
              <p className={`text-xs mb-1 ${expired ? 'text-red-600' : 'text-green-700'}`}>
                {t('profile.insurance.expiresLabel')} <span className="font-medium">{formatDate(insurance.policy_expires_at, lng)}</span>
              </p>
              {insurance.document_url && (
                <a
                  href={getDocumentUrl(insurance.document_url)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`text-xs hover:underline inline-flex items-center gap-1 ${expired ? 'text-red-600' : 'text-green-700'}`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13" />
                  </svg>
                  {t('profile.insurance.viewDocument')}
                </a>
              )}
            </div>
            {/* Delete */}
            <button
              type="button"
              onClick={() => setShowDeleteModal(true)}
              className={`p-1.5 rounded-lg transition-colors flex-shrink-0 ${expired ? 'text-red-400 hover:text-red-600 hover:bg-red-100' : 'text-gray-400 hover:text-red-500 hover:bg-red-50'}`}
              title="Remove insurance"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
              </svg>
            </button>
          </div>
          {expired && (
            <p className="mt-2 text-xs text-red-600 font-medium">
              ⚠️ {t('profile.insurance.expiredWarning')}
            </p>
          )}
        </div>
      )}

      {!insurance && !showForm && (
        <div className="flex items-center gap-3 px-4 py-3.5 bg-amber-50 border border-amber-200 rounded-xl mb-2">
          <svg className="w-4 h-4 text-amber-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 5Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
          </svg>
          <p className="text-xs text-amber-700">{t('profile.insurance.missingMsg')}</p>
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="ml-auto flex-shrink-0 text-xs font-medium text-amber-700 border border-amber-300 hover:bg-amber-100 px-3 py-1.5 rounded-lg transition-colors"
          >
            {t('profile.insurance.uploadNow')}
          </button>
        </div>
      )}

      {/* Upload/update form */}
      {showForm && (
        <form onSubmit={handleSave} className="border border-[#E4E7E4] rounded-xl p-4 space-y-3 mt-2">
          {formError && (
            <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{formError}</p>
          )}

          <div>
            <label className="block text-xs font-medium text-[#1F2933] mb-1">{t('profile.insurance.form.expiryLabel')}</label>
            <input
              type="date"
              value={form.policy_expires_at}
              min={new Date().toISOString().split('T')[0]}
              onChange={(e) => {
                const val = e.target.value;
                setForm((f) => ({ ...f, policy_expires_at: val }));
                setFormError('');
                if (val) {
                  const days = daysUntil(val);
                  setDateWarning(days <= 30 && days > 0 ? t('profile.insurance.form.expiryWarning', { count: days }) : '');
                } else {
                  setDateWarning('');
                }
              }}
              className={inputClass(!form.policy_expires_at && !!formError)}
            />
            {dateWarning && (
              <p className="mt-1.5 flex items-start gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                <svg className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 5Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
                </svg>
                {dateWarning}
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-[#1F2933] mb-1">
              {t('profile.insurance.form.docLabel')}
              {insurance
                ? <span className="font-normal text-gray-400"> {t('profile.insurance.form.keepExisting')}</span>
                : <span className="text-red-500"> *</span>
              }
              <span className="font-normal text-gray-400"> · PDF, JPG, PNG · max 5 MB</span>
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex-shrink-0 text-xs font-medium text-[#445446] border border-[#445446]/30 hover:bg-[#445446]/5 px-3 py-2 rounded-lg transition-colors"
              >
                {t('profile.insurance.form.chooseFile')}
              </button>
              <span className="text-xs text-gray-500 truncate">{docName || t('profile.insurance.form.noFile')}</span>
            </div>
            <input ref={fileRef} type="file" accept={DOC_TYPES} className="hidden" onChange={handleFileChange} />
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            {insurance && (
              <button
                type="button"
                onClick={() => { setShowForm(false); setForm({ policy_expires_at: '', document: null }); setDocName(''); setFormError(''); setDateWarning(''); }}
                className="text-sm text-gray-500 hover:text-[#1F2933] px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                {t('profile.insurance.form.cancelBtn')}
              </button>
            )}
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-1.5 bg-[#445446] hover:bg-[#3F4E41] disabled:opacity-60 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              {saving && <Spinner />}
              {saving
                ? t('profile.insurance.form.savingBtn')
                : insurance
                  ? t('profile.insurance.form.updateBtn')
                  : t('profile.insurance.form.saveBtn')}
            </button>
          </div>
        </form>
      )}

      <ConfirmModal
        open={showDeleteModal}
        title={t('profile.insurance.removeBtn')}
        message={t('profile.insurance.removeConfirmMsg', 'This will permanently remove your insurance record.')}
        confirmLabel={t('profile.insurance.removeBtn')}
        loading={deleting}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
      />
    </div>
  );
};

export default InsuranceCard;
