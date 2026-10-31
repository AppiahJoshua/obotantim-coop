const escapeCell = (value) => {
  const text = value === null || value === undefined ? '' : String(value);
  const safeText = /^[\s]*[=+@\-]/.test(text) ? `'${text}` : text;
  return `"${safeText.replace(/"/g, '""')}"`;
};

const sendCsv = (res, filename, columns, rows) => {
  const lines = [columns.map(([, label]) => escapeCell(label)).join(',')];
  for (const row of rows) lines.push(columns.map(([key]) => escapeCell(row[key])).join(','));
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(`\uFEFF${lines.join('\r\n')}`);
};

module.exports = { sendCsv };
