const { request } = require("./request");

function getPaymentRecords(params) {
  return request({ method: "GET", url: _buildURL("/payment-records", params) });
}

function savePaymentRecord(payload) {
  const method = payload.id ? "PUT" : "POST";
  const url = payload.id ? `/payment-records/${payload.id}` : "/payment-records";
  return request({ data: payload, method, url });
}

function deletePaymentRecord(id) {
  return request({ method: "DELETE", url: `/payment-records/${id}` });
}

function _buildURL(path, params) {
  const segments = [];
  Object.keys(params || {}).forEach((key) => {
    const value = params[key];
    if (value === undefined || value === null || value === "") return;
    segments.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
  });
  const query = segments.join("&");
  return query ? `${path}?${query}` : path;
}

module.exports = { getPaymentRecords, savePaymentRecord, deletePaymentRecord };
