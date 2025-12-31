import { useSearchParams } from 'react-router-dom';

export const useQueryParams = (defaultParams: Record<string, any> = {}) => {
  const [searchParams, setSearchParams] = useSearchParams();

  const params = Object.fromEntries(searchParams.entries());

  const getParam = (key: string) => {
    const param = params[key];
    return param ?? defaultParams[key] ?? null;
  };

  const setParams = (newValues: Record<string, any>) => {
    const updated = {
      ...params,
      ...Object.entries(newValues).reduce(
        (acc, [key, value]) => {
          acc[key] = encodeURIComponent(value);
          return acc;
        },
        {} as Record<string, string>,
      ),
    };
    setSearchParams(updated);
  };

  const updateParams = (newValues: Record<string, any>) => {
    const updated = new URLSearchParams(searchParams);

    Object.entries(newValues).forEach(([key, value]) => {
      if (value === undefined || value === null) {
        updated.delete(key);
      } else {
        updated.set(key, String(value));
      }
    });

    setSearchParams(updated);
  };

  const getAllParams = () => {
    const allParams = Object.entries(params).reduce(
      (acc, [key, value]) => {
        acc[key] = decodeURIComponent(value);
        return acc;
      },
      {} as Record<string, string>,
    );
    return allParams;
  };

  const resetAllParams = () => {
    const updated = new URLSearchParams();
    Object.entries(defaultParams).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        updated.set(key, String(value));
      }
    });
    setSearchParams(updated);
  };

  const removeParams = (keys: string[]) => {
    const updated = new URLSearchParams(searchParams);
    keys.forEach((key) => {
      updated.delete(key);
    });
    setSearchParams(updated);
  };

  return { getParam, setParams, updateParams, removeParams, getAllParams, resetAllParams };
};
