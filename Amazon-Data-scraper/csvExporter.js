// Shared CSV export utility
// This function is used by both the popup extension and the content script widget

const convertToCSV = (products) => {
  if (!products || !products.length) return "";

  const columns = [
    "title",
    "asin",
    "url",
    "wholePriceBlockText",
    "availability",
    "avgCustomerReviews",
    "merchantInfo",
    "storeLinkText",
    "productDescription",
    "additionalInfo",
    "productOverview",
    "productInformation",
    "techSpec",
    "productDetails",
    "aboutProduct",
  ];

  const csvRows = [
    columns.join(","), // header row
    ...products.map((product) =>
      columns
        .map(
          (col) =>
            `"${
              product[col] !== undefined
                ? String(product[col]).replace(/"/g, '""')
                : ""
            }"`
        )
        .join(",")
    ),
  ];

  return csvRows.join("\n");
};

const downloadCSV = (csvContent, filename) => {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
