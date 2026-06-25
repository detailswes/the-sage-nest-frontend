import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  useAddQualificationMutation,
  useUpdateQualificationMutation,
  useDeleteQualificationMutation,
} from "../../../api/expertApi";
import { getDocumentUrl } from "../../../utils/imageUrl";
import ConfirmModal from "../../../components/ConfirmModal";
import { PlusIcon, EditIcon, TrashIcon, PdfFileIcon, ImageFileIcon } from "../../../assets/icons";

const QUAL_TYPES = [
  { value: "LACTATION_CONSULTANT" },
  { value: "BREASTFEEDING_COUNSELLOR" },
  { value: "INFANT_SLEEP_CONSULTANT" },
  { value: "DOULA" },
  { value: "MIDWIFE" },
  { value: "BABY_OSTEOPATH" },
  { value: "PAEDIATRIC_NUTRITIONIST" },
  { value: "EARLY_YEARS_SPECIALIST" },
  { value: "POSTNATAL_PHYSIOTHERAPIST" },
  { value: "PARENTING_COACH" },
  { value: "OTHER" },
];

const DOC_TYPES = "application/pdf,image/jpeg,image/jpg,image/png";
const DOC_MAX = 5 * 1024 * 1024;

const EMPTY_FORM = { type: "", custom_name: "", document: null };

// ─── Small shared atoms ────────────────────────────────────────────────────────
const Spinner = () => (
  <div className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin flex-shrink-0" />
);

const DocBadge = ({ url }) => {
  const { t } = useTranslation("expertDashboard");
  if (!url)
    return <span className="text-xs text-gray-400 italic">{t("profile.quals.noDocument")}</span>;
  const full = getDocumentUrl(url);
  const isPdf = url.toLowerCase().endsWith(".pdf");
  return (
    <a
      href={full}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-xs text-[#445446] hover:underline"
    >
      {isPdf ? (
        <PdfFileIcon className="w-3.5 h-3.5 flex-shrink-0" />
      ) : (
        <ImageFileIcon className="w-3.5 h-3.5 flex-shrink-0" />
      )}
      {t("profile.quals.viewDocument")}
    </a>
  );
};

// ─── Component ────────────────────────────────────────────────────────────────
const QualificationsCard = ({ initialData = [] }) => {
  const { t } = useTranslation("expertDashboard");
  const [items, setItems] = useState(initialData);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [docName, setDocName] = useState("");
  const [formError, setFormError] = useState("");
  const [deletingId, setDeletingId] = useState(null);

  const [addQualification, { isLoading: saving }]      = useAddQualificationMutation();
  const [updateQualification, { isLoading: editSaving }] = useUpdateQualificationMutation();
  const [deleteQualification]                          = useDeleteQualificationMutation();
  const [deleteModal, setDeleteModal] = useState({ open: false, id: null });

  // Edit state
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ custom_name: "", document: null });
  const [editDocName, setEditDocName] = useState("");
  const [editError, setEditError] = useState("");

  const fileRef = useRef(null);
  const editFileRef = useRef(null);

  const inputClass = (err) =>
    `w-full px-3 py-2.5 rounded-lg border text-sm text-[#1F2933] bg-white transition focus:outline-none focus:ring-2 focus:ring-[#445446]/30 focus:border-[#445446] ${
      err ? "border-red-400" : "border-[#E4E7E4]"
    }`;

  // ── Add form handlers ──────────────────────────────────────────────────────

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > DOC_MAX) {
      setFormError(t("profile.quals.errors.docSize"));
      return;
    }
    setForm((f) => ({ ...f, document: file }));
    setDocName(file.name);
    setFormError("");
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    setFormError("");
    if (!form.type) {
      setFormError(t("profile.quals.errors.typeRequired"));
      return;
    }
    if (form.type === "OTHER" && !form.custom_name.trim()) {
      setFormError(t("profile.quals.errors.nameRequired"));
      return;
    }
    if (!form.document) {
      setFormError(t("profile.quals.errors.docRequired"));
      return;
    }
    try {
      const created = await addQualification({
        type: form.type,
        custom_name:
          form.type === "OTHER" ? form.custom_name.trim() : undefined,
        document: form.document || undefined,
      }).unwrap();
      setItems((prev) => [...prev, created]);
      setForm(EMPTY_FORM);
      setDocName("");
      setShowForm(false);
    } catch (err) {
      setFormError(
        err?.data?.error || t("profile.quals.errors.addFailed")
      );
    }
  };

  const cancelForm = () => {
    setShowForm(false);
    setForm(EMPTY_FORM);
    setDocName("");
    setFormError("");
  };

  // ── Edit handlers ──────────────────────────────────────────────────────────

  const handleEditFileChange = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > DOC_MAX) {
      setEditError(t("profile.quals.errors.docSize"));
      return;
    }
    setEditForm((f) => ({ ...f, document: file }));
    setEditDocName(file.name);
    setEditError("");
  };

  const startEdit = (q) => {
    setEditingId(q.id);
    setEditForm({ custom_name: q.custom_name || "", document: null });
    setEditDocName("");
    setEditError("");
    setDeleteModal({ open: false, id: null });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({ custom_name: "", document: null });
    setEditDocName("");
    setEditError("");
  };

  const handleUpdate = async (e, q) => {
    e.preventDefault();
    setEditError("");
    if (q.type === "OTHER" && !editForm.custom_name.trim()) {
      setEditError(t("profile.quals.errors.nameEditRequired"));
      return;
    }
    try {
      const updated = await updateQualification({
        id: q.id,
        custom_name:
          q.type === "OTHER" ? editForm.custom_name.trim() : undefined,
        document: editForm.document || undefined,
      }).unwrap();
      setItems((prev) =>
        prev.map((item) => (item.id === q.id ? updated : item))
      );
      cancelEdit();
    } catch (err) {
      setEditError(
        err?.data?.error || t("profile.quals.errors.updateFailed")
      );
    }
  };

  // ── Delete handler ─────────────────────────────────────────────────────────

  const handleDelete = async (id) => {
    setDeletingId(id);
    try {
      await deleteQualification(id).unwrap();
      setItems((prev) => prev.filter((q) => q.id !== id));
      setDeleteModal({ open: false, id: null });
    } catch {
      // silently ignore — item remains in list
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-[#E4E7E4] p-6 mt-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-[#1F2933] flex items-center gap-1.5">
            {t("profile.quals.title")}{" "}
            <span className="inline-flex items-center px-1.5 py-px rounded text-[10px] font-medium leading-none bg-green-50 text-green-700 border border-green-200 align-middle">
              {t("profile.publicBadge")}
            </span>
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {t("profile.quals.subtitle")}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            {t("profile.quals.docHint")}
          </p>
        </div>
        {!showForm && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 text-sm font-medium text-[#445446] border border-[#445446]/30 hover:bg-[#445446]/5 px-3 py-1.5 rounded-lg transition-colors flex-shrink-0 ml-4"
          >
            <PlusIcon className="w-3.5 h-3.5" />
            {t("profile.quals.addBtn")}
          </button>
        )}
      </div>

      {/* Existing qualifications */}
      {items.length > 0 && (
        <ul className="space-y-2 mb-4">
          {items.map((q) => (
            <li key={q.id}>
              {editingId === q.id ? (
                // ── Inline edit form ───────────────────────────────────────
                <form
                  onSubmit={(e) => handleUpdate(e, q)}
                  className="border border-[#445446]/30 rounded-xl p-4 space-y-3 bg-[#F5F7F5]"
                >
                  <p className="text-xs font-medium text-[#1F2933]">
                    {t("profile.quals.editingLabel")}{" "}
                    <span className="text-[#445446]">
                      {q.type === "OTHER"
                        ? t("profile.quals.otherLabel")
                        : t("profile.quals.types." + q.type)}
                    </span>
                  </p>

                  {editError && (
                    <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                      {editError}
                    </p>
                  )}

                  {q.type === "OTHER" && (
                    <div>
                      <label className="block text-xs font-medium text-[#1F2933] mb-1">
                        {t("profile.quals.form.nameLabel")}
                      </label>
                      <input
                        type="text"
                        value={editForm.custom_name}
                        onChange={(e) => {
                          setEditForm((f) => ({
                            ...f,
                            custom_name: e.target.value,
                          }));
                          setEditError("");
                        }}
                        placeholder={t("profile.quals.form.namePlaceholder")}
                        className={inputClass(
                          !editForm.custom_name.trim() && !!editError
                        )}
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-medium text-[#1F2933] mb-1">
                      {t("profile.quals.form.replaceDocLabel")}{" "}
                      <span className="font-normal text-gray-400">
                        {t("profile.quals.form.replaceDocHint")}
                      </span>
                    </label>
                    {q.document_url && !editDocName && (
                      <div className="mb-1.5">
                        <DocBadge url={q.document_url} />
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => editFileRef.current?.click()}
                        className="flex-shrink-0 text-xs font-medium text-[#445446] border border-[#445446]/30 hover:bg-[#445446]/5 px-3 py-2 rounded-lg transition-colors"
                      >
                        {t("profile.quals.chooseFile")}
                      </button>
                      <span className="text-xs text-gray-500 truncate">
                        {editDocName || (q.document_url ? q.document_url.split("/").pop() : t("profile.quals.noFile"))}
                      </span>
                    </div>
                    <input
                      ref={editFileRef}
                      type="file"
                      accept={DOC_TYPES}
                      className="hidden"
                      onChange={handleEditFileChange}
                    />
                  </div>

                  {!q.document_url && !editForm.document && (
                    <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                      {t("profile.quals.docUploadHint")}
                    </p>
                  )}

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={cancelEdit}
                      className="text-sm text-gray-500 hover:text-[#1F2933] px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      {t("profile.quals.form.cancelBtn")}
                    </button>
                    <button
                      type="submit"
                      disabled={editSaving}
                      className="flex items-center gap-1.5 bg-[#445446] hover:bg-[#3F4E41] disabled:opacity-60 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                    >
                      {editSaving && <Spinner />}
                      {editSaving ? t("profile.quals.form.savingBtn") : t("profile.quals.form.saveBtn")}
                    </button>
                  </div>
                </form>
              ) : (
                // ── Normal display ─────────────────────────────────────────
                <div className="flex items-center justify-between gap-3 px-4 py-3 bg-[#F5F7F5] rounded-xl border border-[#E4E7E4]">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#1F2933] truncate">
                      {q.type === "OTHER"
                        ? q.custom_name
                        : t("profile.quals.types." + q.type)}
                    </p>
                    <div className="mt-0.5">
                      <DocBadge url={q.document_url} />
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => startEdit(q)}
                      className="p-1.5 text-gray-400 hover:text-[#445446] hover:bg-[#445446]/5 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <EditIcon />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteModal({ open: true, id: q.id })}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Remove"
                    >
                      <TrashIcon />
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {items.length === 0 && !showForm && (
        <p className="text-sm text-gray-400 py-2">
          {t("profile.quals.empty")}
        </p>
      )}

      {/* Add form */}
      {showForm && (
        <form
          onSubmit={handleAdd}
          className="border border-[#E4E7E4] rounded-xl p-4 space-y-3 mt-2"
        >
          {formError && (
            <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {formError}
            </p>
          )}

          <div>
            <label className="block text-xs font-medium text-[#1F2933] mb-1">
              {t("profile.quals.form.typeLabel")}
            </label>
            <select
              value={form.type}
              onChange={(e) => {
                setForm((f) => ({
                  ...f,
                  type: e.target.value,
                  custom_name: "",
                }));
                setFormError("");
              }}
              className={inputClass(!form.type && !!formError)}
            >
              <option value="">{t("profile.quals.form.typeSelect")}</option>
              {QUAL_TYPES.map((qt) => (
                <option key={qt.value} value={qt.value}>
                  {t("profile.quals.types." + qt.value)}
                </option>
              ))}
            </select>
          </div>

          {form.type === "OTHER" && (
            <div>
              <label className="block text-xs font-medium text-[#1F2933] mb-1">
                {t("profile.quals.form.nameLabel")}
              </label>
              <input
                type="text"
                value={form.custom_name}
                onChange={(e) => {
                  setForm((f) => ({ ...f, custom_name: e.target.value }));
                  setFormError("");
                }}
                placeholder={t("profile.quals.form.namePlaceholder")}
                className={inputClass(!form.custom_name.trim() && !!formError)}
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-[#1F2933] mb-1">
              {t("profile.quals.form.supportingDocLabel")} <span className="text-red-400">*</span>{" "}
              <span className="font-normal text-gray-400">{t("profile.quals.docHint")}</span>
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex-shrink-0 text-xs font-medium text-[#445446] border border-[#445446]/30 hover:bg-[#445446]/5 px-3 py-2 rounded-lg transition-colors"
              >
                {t("profile.quals.chooseFile")}
              </button>
              <span className="text-xs text-gray-500 truncate">
                {docName || t("profile.quals.noFile")}
              </span>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept={DOC_TYPES}
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={cancelForm}
              className="text-sm text-gray-500 hover:text-[#1F2933] px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {t("profile.quals.form.cancelBtn")}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-1.5 bg-[#445446] hover:bg-[#3F4E41] disabled:opacity-60 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              {saving && <Spinner />}
              {saving ? t("profile.quals.form.addingBtn") : t("profile.quals.form.addQualBtn")}
            </button>
          </div>
        </form>
      )}

      <ConfirmModal
        open={deleteModal.open}
        title={t("profile.quals.form.removeBtn")}
        message={t("profile.quals.removeConfirmMsg", "This will permanently remove this qualification.")}
        confirmLabel={t("profile.quals.form.removeBtn")}
        loading={deletingId === deleteModal.id}
        onClose={() => setDeleteModal({ open: false, id: null })}
        onConfirm={() => handleDelete(deleteModal.id)}
      />
    </div>
  );
};

export default QualificationsCard;
