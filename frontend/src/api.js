const API_URL = "http://127.0.0.1:8000";


export async function uploadReport({
  crop,
  stage,
  village,
  imageFile,
  farmerId,
}) {
  const formData = new FormData();

  formData.append("crop", crop);
  formData.append("stage", stage);
  formData.append("village", village.village);
  formData.append("lat", village.lat);
  formData.append("lng", village.lng);
  formData.append("image_file", imageFile);
  formData.append("farmer_id", farmerId);

  const response = await fetch(`${API_URL}/upload-report`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(
      message || "Failed to upload report"
    );
  }

  return response.json();
}


export async function fetchMyReports(farmerId) {
  const response = await fetch(
    `${API_URL}/my-reports/${encodeURIComponent(farmerId)}`
  );

  if (!response.ok) {
    const message = await response.text();
    throw new Error(
      message || "Failed to fetch reports"
    );
  }

  return response.json();
}


export async function fetchOfficerQueue() {
  const response = await fetch(
    `${API_URL}/officer-queue`
  );

  if (!response.ok) {
    throw new Error(
      "Failed to fetch officer queue"
    );
  }

  return response.json();
}


export async function confirmCase(
  reportId,
  confirmedDisease,
  officerId = "OFF-001"
) {
  const response = await fetch(
    `${API_URL}/confirm-case`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        report_id: reportId,
        confirmed_disease: confirmedDisease,
        officer_id: officerId,
      }),
    }
  );

  if (!response.ok) {
    const message = await response.text();
    throw new Error(
      message || "Failed to confirm case"
    );
  }

  return response.json();
}


export async function getAdvisory(reportId) {
  const response = await fetch(
    `${API_URL}/advisory/${reportId}`
  );

  if (!response.ok) {
    throw new Error(
      "Failed to fetch advisory"
    );
  }

  return response.json();
}


export async function fetchConfirmedCases() {
  const response = await fetch(
    `${API_URL}/confirmed-cases`
  );

  if (!response.ok) {
    throw new Error(
      "Failed to fetch confirmed cases"
    );
  }

  return response.json();
}