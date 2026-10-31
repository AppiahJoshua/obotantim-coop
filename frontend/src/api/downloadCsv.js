import api from './axios';

export const downloadCsv = async (path, params = {}) => {
  const response = await api.get(path, { params, responseType: 'blob' });
  const url = URL.createObjectURL(response.data);
  const link = document.createElement('a');
  link.href = url;
  link.download = response.headers['content-disposition']?.match(/filename="?([^";]+)"?/)?.[1] || 'export.csv';
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};
