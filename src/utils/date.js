// "2025-05" -> "05/2025", "2012" -> "2012"
export const formatDate = (value) => {
    if (!value) return '';
    const [year, month] = value.split('-');
    return month ? `${month}/${year}` : year;
};

// startDate null -> single date; endDate null -> "present"
export const formatDateRange = (startDate, endDate) => {
    const end = endDate ? formatDate(endDate) : 'present';
    return startDate ? `${formatDate(startDate)} - ${end}` : end;
};
