import { useState } from 'react';

const useAuthForm = (initialValues) => {
  const [form, setForm] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    // Clear field error on change
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
    if (serverError) setServerError('');
  };

  const reset = () => {
    setForm(initialValues);
    setErrors({});
    setServerError('');
  };

  return { form, errors, setErrors, loading, setLoading, serverError, setServerError, handleChange, reset };
};

export default useAuthForm;
