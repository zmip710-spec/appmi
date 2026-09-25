import { useState, useEffect, useRef } from 'react';

export function useFormAutosave<T>(
  storageKey: string,
  initialData: T,
  hasContentFn: (data: T) => boolean,
  debounceMs = 400
) {
  // 1. Restore from localStorage if exists
  const [formData, setFormData] = useState<T>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...initialData, ...parsed };
      }
    } catch {}
    return initialData;
  });

  const [hasDraft, setHasDraft] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        return hasContentFn(parsed);
      }
    } catch {}
    return false;
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // 2. Debounced save to localStorage
  const timerRef = useRef<any>(null);

  useEffect(() => {
    const hasContent = hasContentFn(formData);
    setHasDraft(hasContent);

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => {
      try {
        if (hasContent) {
          localStorage.setItem(storageKey, JSON.stringify(formData));
        } else {
          localStorage.removeItem(storageKey);
        }
      } catch {}
    }, debounceMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [formData, storageKey, debounceMs]);

  // 3. beforeunload event listener to block accidental reload
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasContentFn(formData)) {
        e.preventDefault();
        e.returnValue = 'Tienes cambios sin guardar en el formulario. ¿Estás seguro de salir?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [formData]);

  const clearDraft = () => {
    try {
      localStorage.removeItem(storageKey);
    } catch {}
    setFormData(initialData);
    setHasDraft(false);
    setSubmitError(null);
  };

  return {
    formData,
    setFormData,
    hasDraft,
    isSubmitting,
    setIsSubmitting,
    submitError,
    setSubmitError,
    clearDraft
  };
}
