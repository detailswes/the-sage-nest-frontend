import { createApi } from "@reduxjs/toolkit/query/react";
import axiosBaseQuery from "../store/baseQuery";

export const expertApi = createApi({
  reducerPath: "expertApi",
  baseQuery: axiosBaseQuery,
  tagTypes: [
    "ExpertProfile",
    "ExpertDraft",
    "Qualification",
    "Certification",
    "Insurance",
    "Service",
    "Availability",
    "NotificationPrefs",
  ],
  endpoints: (builder) => ({
    // ─── Public ───────────────────────────────────────────────────────────────
    listExperts: builder.query({
      query: () => ({ url: "/experts" }),
    }),
    getExpertPublic: builder.query({
      query: (id) => ({ url: `/experts/${id}` }),
    }),

    // ─── Profile ──────────────────────────────────────────────────────────────
    getMyProfile: builder.query({
      query: () => ({ url: "/experts/me" }),
      providesTags: ["ExpertProfile"],
    }),
    updateMyProfile: builder.mutation({
      query: (data) => ({ url: "/experts/me", method: "PUT", data }),
      invalidatesTags: ["ExpertProfile"],
    }),
    getMyProfileDraft: builder.query({
      query: () => ({ url: "/experts/me/draft" }),
      providesTags: ["ExpertDraft"],
    }),
    // arg: File (the image file — base query passes it as FormData)
    uploadProfileImage: builder.mutation({
      query: (file) => {
        const fd = new FormData();
        fd.append("profile_image", file);
        return {
          url: "/experts/me/profile-image",
          method: "POST",
          data: fd,
          headers: { "Content-Type": "multipart/form-data" },
        };
      },
      invalidatesTags: ["ExpertProfile"],
    }),

    // ─── Qualifications ───────────────────────────────────────────────────────
    // arg: { type, custom_name?, document? }
    addQualification: builder.mutation({
      query: ({ type, custom_name, document }) => {
        const fd = new FormData();
        fd.append("type", type);
        if (custom_name) fd.append("custom_name", custom_name);
        if (document) fd.append("document", document);
        return {
          url: "/experts/me/qualifications",
          method: "POST",
          data: fd,
          headers: { "Content-Type": "multipart/form-data" },
        };
      },
      invalidatesTags: ["ExpertProfile", "ExpertDraft"],
    }),
    // arg: { id, custom_name?, document? }
    updateQualification: builder.mutation({
      query: ({ id, custom_name, document }) => {
        const fd = new FormData();
        if (custom_name !== undefined) fd.append("custom_name", custom_name);
        if (document) fd.append("document", document);
        return {
          url: `/experts/me/qualifications/${id}`,
          method: "PUT",
          data: fd,
          headers: { "Content-Type": "multipart/form-data" },
        };
      },
      invalidatesTags: ["ExpertProfile", "ExpertDraft"],
    }),
    deleteQualification: builder.mutation({
      query: (id) => ({
        url: `/experts/me/qualifications/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["ExpertProfile", "ExpertDraft"],
    }),

    // ─── Certifications ───────────────────────────────────────────────────────
    // arg: { name, document? }
    addCertification: builder.mutation({
      query: ({ name, document }) => {
        const fd = new FormData();
        fd.append("name", name);
        if (document) fd.append("document", document);
        return {
          url: "/experts/me/certifications",
          method: "POST",
          data: fd,
          headers: { "Content-Type": "multipart/form-data" },
        };
      },
      invalidatesTags: ["ExpertProfile", "ExpertDraft"],
    }),
    // arg: { id, name?, document? }
    updateCertification: builder.mutation({
      query: ({ id, name, document }) => {
        const fd = new FormData();
        if (name) fd.append("name", name);
        if (document) fd.append("document", document);
        return {
          url: `/experts/me/certifications/${id}`,
          method: "PUT",
          data: fd,
          headers: { "Content-Type": "multipart/form-data" },
        };
      },
      invalidatesTags: ["ExpertProfile", "ExpertDraft"],
    }),
    deleteCertification: builder.mutation({
      query: (id) => ({
        url: `/experts/me/certifications/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["ExpertProfile", "ExpertDraft"],
    }),

    // ─── Insurance ────────────────────────────────────────────────────────────
    // arg: { policy_expires_at, document? }
    saveInsurance: builder.mutation({
      query: ({ policy_expires_at, document }) => {
        const fd = new FormData();
        fd.append("policy_expires_at", policy_expires_at);
        if (document) fd.append("document", document);
        return {
          url: "/experts/me/insurance",
          method: "PUT",
          data: fd,
          headers: { "Content-Type": "multipart/form-data" },
        };
      },
      invalidatesTags: ["ExpertProfile", "ExpertDraft"],
    }),
    deleteInsurance: builder.mutation({
      query: () => ({ url: "/experts/me/insurance", method: "DELETE" }),
      invalidatesTags: ["ExpertProfile", "ExpertDraft"],
    }),

    // ─── Business Information ──────────────────────────────────────────────────
    saveBusinessInfo: builder.mutation({
      query: (data) => ({
        url: "/experts/me/business-info",
        method: "PUT",
        data,
      }),
      invalidatesTags: ["ExpertProfile", "ExpertDraft"],
    }),

    // ─── Notification Preferences ──────────────────────────────────────────────
    getNotificationPreferences: builder.query({
      query: () => ({ url: "/experts/me/notification-preferences" }),
      providesTags: ["NotificationPrefs"],
    }),
    updateNotificationPreferences: builder.mutation({
      query: (prefs) => ({
        url: "/experts/me/notification-preferences",
        method: "PUT",
        data: prefs,
      }),
      invalidatesTags: ["NotificationPrefs"],
    }),

    // ─── GDPR ─────────────────────────────────────────────────────────────────
    exportMyData: builder.query({
      query: () => ({ url: "/auth/data-export" }),
    }),

    // ─── Services ─────────────────────────────────────────────────────────────
    listServices: builder.query({
      query: () => ({ url: "/services" }),
      providesTags: ["Service"],
    }),
    createService: builder.mutation({
      query: (data) => ({ url: "/services", method: "POST", data }),
      invalidatesTags: ["Service"],
    }),
    // arg: { id, ...data }
    updateService: builder.mutation({
      query: ({ id, ...data }) => ({
        url: `/services/${id}`,
        method: "PUT",
        data,
      }),
      invalidatesTags: ["Service"],
    }),
    deleteService: builder.mutation({
      query: (id) => ({ url: `/services/${id}`, method: "DELETE" }),
      invalidatesTags: ["Service"],
    }),
    // arg: ids (array)
    reorderServices: builder.mutation({
      query: (ids) => ({
        url: "/services/reorder",
        method: "PUT",
        data: { ids },
      }),
      invalidatesTags: ["Service"],
    }),

    // ─── Availability ──────────────────────────────────────────────────────────
    listAvailability: builder.query({
      query: () => ({ url: "/availability" }),
      providesTags: ["Availability"],
    }),
    addAvailabilitySlot: builder.mutation({
      query: (data) => ({ url: "/availability", method: "POST", data }),
      invalidatesTags: ["Availability"],
    }),
    removeAvailabilitySlot: builder.mutation({
      query: (id) => ({ url: `/availability/${id}`, method: "DELETE" }),
      invalidatesTags: ["Availability"],
    }),
    checkAvailabilityConflicts: builder.query({
      query: (id) => ({ url: `/availability/${id}/conflicts` }),
    }),
  }),
});

export const {
  useListExpertsQuery,
  useGetExpertPublicQuery,
  useGetMyProfileQuery,
  useUpdateMyProfileMutation,
  useGetMyProfileDraftQuery,
  useUploadProfileImageMutation,
  useAddQualificationMutation,
  useUpdateQualificationMutation,
  useDeleteQualificationMutation,
  useAddCertificationMutation,
  useUpdateCertificationMutation,
  useDeleteCertificationMutation,
  useSaveInsuranceMutation,
  useDeleteInsuranceMutation,
  useSaveBusinessInfoMutation,
  useGetNotificationPreferencesQuery,
  useUpdateNotificationPreferencesMutation,
  useExportMyDataQuery,
  useListServicesQuery,
  useCreateServiceMutation,
  useUpdateServiceMutation,
  useDeleteServiceMutation,
  useReorderServicesMutation,
  useListAvailabilityQuery,
  useAddAvailabilitySlotMutation,
  useRemoveAvailabilitySlotMutation,
  useCheckAvailabilityConflictsQuery,
  useLazyCheckAvailabilityConflictsQuery,
  useLazyExportMyDataQuery,
} = expertApi;
